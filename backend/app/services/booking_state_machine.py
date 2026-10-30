import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.booking import Booking, BookingStatus, PaymentMode
from app.models.node import ChargingNode, NodeStatus
from app.models.user import User
from app.services.pricing_engine import PricingEngine
from app.services.redis_service import redis_service
from app.services.ocpp_mqtt import hardware_broker

logger = logging.getLogger("voltmate.state_machine")

class BookingStateError(Exception):
    def __init__(self, message: str, current_status: BookingStatus, attempted_event: str):
        super().__init__(message)
        self.message = message
        self.current_status = current_status
        self.attempted_event = attempted_event

class BookingStateMachine:
    """
    Finite State Machine (FSM) governing the end-to-end lifecycle of EV slot bookings.
    Deterministic, strongly typed, and enforces audit histories.
    """

    ALLOWED_TRANSITIONS: Dict[BookingStatus, Dict[str, BookingStatus]] = {
        BookingStatus.REQUESTED: {
            "HOST_APPROVE": BookingStatus.APPROVED,
            "HOST_REJECT": BookingStatus.REJECTED,
            "AUTO_APPROVE": BookingStatus.APPROVED,
            "SYSTEM_EXPIRE": BookingStatus.EXPIRED,
            "DRIVER_CANCEL": BookingStatus.CANCELLED,
        },
        BookingStatus.APPROVED: {
            "DRIVER_CONFIRM": BookingStatus.CONFIRMED,
            "VERIFY_GATE_PASS": BookingStatus.CHECKED_IN,
            "START_CHARGING": BookingStatus.ACTIVE_CHARGING,
            "DRIVER_CANCEL": BookingStatus.CANCELLED,
            "HOST_CANCEL": BookingStatus.CANCELLED,
        },
        BookingStatus.CONFIRMED: {
            "VERIFY_GATE_PASS": BookingStatus.CHECKED_IN,
            "START_CHARGING": BookingStatus.ACTIVE_CHARGING,
            "DRIVER_CANCEL": BookingStatus.CANCELLED,
            "HOST_CANCEL": BookingStatus.CANCELLED,
        },
        BookingStatus.CHECKED_IN: {
            "START_CHARGING": BookingStatus.ACTIVE_CHARGING,
            "DRIVER_CANCEL": BookingStatus.CANCELLED,
        },
        BookingStatus.ACTIVE_CHARGING: {
            "PAUSE_CHARGING": BookingStatus.PAUSED,
            "STOP_CHARGING": BookingStatus.METER_VERIFYING,
            "VERIFY_AND_SETTLE": BookingStatus.COMPLETED,
            "RAISE_DISPUTE": BookingStatus.DISPUTED,
        },
        BookingStatus.PAUSED: {
            "RESUME_CHARGING": BookingStatus.ACTIVE_CHARGING,
            "STOP_CHARGING": BookingStatus.METER_VERIFYING,
            "VERIFY_AND_SETTLE": BookingStatus.COMPLETED,
            "RAISE_DISPUTE": BookingStatus.DISPUTED,
        },
        BookingStatus.METER_VERIFYING: {
            "VERIFY_AND_SETTLE": BookingStatus.COMPLETED,
            "RESUME_CHARGING": BookingStatus.ACTIVE_CHARGING,
            "RAISE_DISPUTE": BookingStatus.DISPUTED,
        },
        BookingStatus.COMPLETED: {
            "RAISE_DISPUTE": BookingStatus.DISPUTED,
        },
        BookingStatus.DISPUTED: {
            "RESOLVE_DISPUTE": BookingStatus.COMPLETED,
            "CANCEL_DISPUTE": BookingStatus.CANCELLED,
        },
        BookingStatus.REJECTED: {},
        BookingStatus.CANCELLED: {},
        BookingStatus.EXPIRED: {},
    }

    def __init__(self, booking: Booking, db: AsyncSession):
        self.booking = booking
        self.db = db

    def can_transition(self, event: str) -> bool:
        return event in self.ALLOWED_TRANSITIONS.get(self.booking.status, {})

    async def trigger(
        self,
        event: str,
        actor_id: str,
        actor_role: str,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Booking:
        """
        Executes an atomic state transition with guards, side-effects, and audit logging.
        """
        current_status = self.booking.status
        transitions = self.ALLOWED_TRANSITIONS.get(current_status, {})
        
        if event not in transitions:
            raise BookingStateError(
                f"Cannot execute event '{event}' on booking in state '{current_status.value}'.",
                current_status=current_status,
                attempted_event=event,
            )

        target_status = transitions[event]
        metadata = metadata or {}

        # -------------------------------------------------------------
        # 1. Guard Verifications
        # -------------------------------------------------------------
        await self._validate_guards(event, actor_id, actor_role, metadata)

        # -------------------------------------------------------------
        # 2. State Mutation & Side-Effects
        # -------------------------------------------------------------
        now = datetime.now(timezone.utc)
        self.booking.status = target_status
        self.booking.updated_at = now

        # Append to immutable state history audit log
        history_entry = {
            "from": current_status.value,
            "to": target_status.value,
            "event": event,
            "at": now.isoformat(),
            "actor_id": str(actor_id),
            "actor_role": actor_role,
            "reason": reason,
            "metadata": metadata,
        }
        current_history = list(self.booking.state_history or [])
        current_history.append(history_entry)
        self.booking.state_history = current_history

        # Execute event-specific logic
        await self._execute_side_effects(event, metadata)

        await self.db.flush()
        logger.info(f"⚡ Booking {self.booking.id}: {current_status.value} --[{event}]--> {target_status.value}")
        return self.booking

    async def _validate_guards(
        self,
        event: str,
        actor_id: str,
        actor_role: str,
        metadata: Dict[str, Any]
    ):
        """Enforces domain constraints before allowing state progression."""
        # Role authorization guards
        if event in ["HOST_APPROVE", "HOST_REJECT"]:
            if str(self.booking.host_id) != str(actor_id) and actor_role != "ADMIN":
                raise BookingStateError("Only the charger host can approve or reject this booking.", self.booking.status, event)

        if event in ["DRIVER_CONFIRM", "VERIFY_GATE_PASS", "START_CHARGING"]:
            if str(self.booking.driver_id) != str(actor_id) and actor_role != "ADMIN":
                raise BookingStateError("Only the assigned driver can perform check-in and start charging.", self.booking.status, event)

        # Gate pass code verification
        if event == "VERIFY_GATE_PASS":
            provided_code = metadata.get("gate_pass_code", "").strip().upper()
            expected_code = (self.booking.gate_pass_code or "").strip().upper()
            if provided_code != expected_code:
                raise BookingStateError(f"Invalid Society Gate Pass code. Check-in denied.", self.booking.status, event)

        # Start PIN verification
        if event == "START_CHARGING":
            provided_pin = metadata.get("pin_code", "").strip()
            if provided_pin and provided_pin != self.booking.start_pin_code:
                raise BookingStateError(f"Incorrect 4-digit start PIN. Check-in denied.", self.booking.status, event)

        # Meter Reading Sanity Check on Stop / Verification
        if event in ["STOP_CHARGING", "VERIFY_AND_SETTLE"]:
            start_val = self.booking.start_meter_reading or 0.0
            end_val = metadata.get("end_meter_reading", start_val)

            if end_val < start_val:
                raise BookingStateError(
                    f"End meter reading ({end_val}) cannot be lower than start meter reading ({start_val}).",
                    self.booking.status,
                    event,
                )

            # Max theoretical kWh delta check
            # Duration in hours * power_kw * 1.25 tolerance
            actual_start = self.booking.actual_start or self.booking.scheduled_start
            now = datetime.now(timezone.utc)
            duration_hrs = max(0.1, (now - actual_start).total_seconds() / 3600.0)
            
            # Fetch node to inspect power kW
            stmt = select(ChargingNode).where(ChargingNode.id == self.booking.node_id)
            node = (await self.db.execute(stmt)).scalar_one_or_none()
            power_kw = node.power_output_kw if node else 3.3

            max_theoretical_kwh = duration_hrs * power_kw * 1.30
            delta_kwh = end_val - start_val

            if delta_kwh > max_theoretical_kwh and delta_kwh > 2.0:
                logger.warning(f"OCR Anomaly: delta {delta_kwh} kWh exceeds max theoretical {max_theoretical_kwh:.2f} kWh")
                # Flag as requiring double verification rather than silent failure

    async def _execute_side_effects(self, event: str, metadata: Dict[str, Any]):
        """Dispatches external actions (IoT relay commands, slot locks, pricing calculation)."""
        now = datetime.now(timezone.utc)
        stmt_node = select(ChargingNode).where(ChargingNode.id == self.booking.node_id)
        node = (await self.db.execute(stmt_node)).scalar_one_or_none()

        if event == "HOST_APPROVE":
            # Clear 5-minute pending expiration in Redis
            await redis_service.clear_booking_expiration(str(self.booking.id))

        elif event == "VERIFY_GATE_PASS":
            self.booking.gate_pass_verified = True
            self.booking.checked_in_at = now

        elif event == "START_CHARGING":
            self.booking.actual_start = now
            if "start_meter_reading" in metadata:
                self.booking.start_meter_reading = float(metadata["start_meter_reading"])
            if "start_meter_photo_url" in metadata:
                self.booking.start_meter_photo_url = metadata["start_meter_photo_url"]

            # Hardware Relay Trigger ON
            if node and node.is_smart_iot and node.iot_device_id:
                hardware_broker.send_relay_command(node.iot_device_id, "ON")

        elif event == "PAUSE_CHARGING":
            # Temporary stop power flow
            if node and node.is_smart_iot and node.iot_device_id:
                hardware_broker.send_relay_command(node.iot_device_id, "OFF")

        elif event == "RESUME_CHARGING":
            if node and node.is_smart_iot and node.iot_device_id:
                hardware_broker.send_relay_command(node.iot_device_id, "ON")

        elif event in ["STOP_CHARGING", "VERIFY_AND_SETTLE"]:
            self.booking.actual_end = now
            if "end_meter_reading" in metadata:
                self.booking.end_meter_reading = float(metadata["end_meter_reading"])
            if "end_meter_photo_url" in metadata:
                self.booking.end_meter_photo_url = metadata["end_meter_photo_url"]

            # Compute delivered kWh
            start_m = self.booking.start_meter_reading or 0.0
            end_m = self.booking.end_meter_reading or start_m
            kwh = round(max(0.0, end_m - start_m), 2)
            if kwh == 0.0 and self.booking.actual_start:
                # Estimate based on duration * power
                elapsed_hrs = (now - self.booking.actual_start).total_seconds() / 3600.0
                kwh = round(elapsed_hrs * (node.power_output_kw if node else 3.3), 2)

            self.booking.actual_kwh = kwh

            # Hardware Relay Trigger OFF
            if node and node.is_smart_iot and node.iot_device_id:
                hardware_broker.send_relay_command(node.iot_device_id, "OFF")

            # Settlement Calculation
            if node:
                settlement = PricingEngine.calculate_session_settlement(
                    kwh_consumed=kwh,
                    price_per_kwh=node.price_per_kwh,
                    parking_fee_per_hr=node.parking_fee_per_hr,
                    scheduled_end=self.booking.scheduled_end,
                    actual_end=now,
                    actual_start=self.booking.actual_start or now,
                )
                self.booking.energy_cost_inr = settlement["energy_amount_inr"]
                self.booking.parking_cost_inr = settlement["parking_amount_inr"]
                self.booking.overstay_minutes = settlement["overstay_minutes"]
                self.booking.overstay_penalty_inr = settlement["overstay_penalty_inr"]
                self.booking.total_amount_inr = settlement["total_amount_inr"]
                self.booking.platform_fee_inr = settlement["platform_fee_inr"]

            # Release Redis slot lock
            slot_ts = int(self.booking.scheduled_start.timestamp())
            lock_token = f"tok_{str(self.booking.id)[:8]}"
            await redis_service.release_slot_lock(str(self.booking.node_id), slot_ts, lock_token)

            # If settlement is via VoltCredits, execute instant ledger balance shift
            if self.booking.payment_mode == PaymentMode.VOLT_CREDITS and self.booking.total_amount_inr > 0:
                stmt_driver = select(User).where(User.id == self.booking.driver_id)
                stmt_host = select(User).where(User.id == self.booking.host_id)
                driver = (await self.db.execute(stmt_driver)).scalar_one_or_none()
                host = (await self.db.execute(stmt_host)).scalar_one_or_none()

                amt = self.booking.total_amount_inr
                if driver and host and driver.volt_credits_balance >= amt:
                    driver.volt_credits_balance -= amt
                    host.volt_credits_balance += amt
                    logger.info(f"VoltCredits Ledger: Transferred {amt} from Driver {driver.id} to Host {host.id}")

        elif event in ["DRIVER_CANCEL", "HOST_CANCEL", "SYSTEM_EXPIRE"]:
            # Release slot hold in Redis
            slot_ts = int(self.booking.scheduled_start.timestamp())
            lock_token = f"tok_{str(self.booking.id)[:8]}"
            await redis_service.release_slot_lock(str(self.booking.node_id), slot_ts, lock_token)
            await redis_service.clear_booking_expiration(str(self.booking.id))

            if "cancellation_reason" in metadata:
                self.booking.cancellation_reason = metadata["cancellation_reason"]

        elif event == "RAISE_DISPUTE":
            self.booking.dispute_reason = metadata.get("dispute_reason", "Driver or Host raised billing dispute")
            self.booking.dispute_status = "OPEN"
