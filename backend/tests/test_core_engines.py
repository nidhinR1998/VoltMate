import unittest
import math
import inspect
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.booking import Booking, BookingStatus, BookingType, PaymentMode
from app.services.booking_state_machine import BookingStateMachine, BookingStateError
from app.services.osrm_router import osrm_service
from app.services.pricing_engine import PricingEngine
from app.services.telemetry_engine import telemetry_physics

class TestVoltMateCoreEngines(unittest.TestCase):

    def test_pricing_engine_mop_sharing_and_overstay(self):
        """Tests settlement calculation with energy, parking, and overstay idle fees."""
        scheduled_start = datetime(2026, 10, 30, 10, 0, 0, tzinfo=timezone.utc)
        scheduled_end = datetime(2026, 10, 30, 12, 0, 0, tzinfo=timezone.utc) # 2 hours
        actual_start = scheduled_start
        # Overstay 35 minutes (15 min grace, 20 min billable overstay)
        actual_end = scheduled_end + timedelta(minutes=35)

        kwh_consumed = 6.6
        price_per_kwh = Decimal("8.50")
        parking_fee_per_hr = Decimal("15.00")

        settlement = PricingEngine.calculate_session_settlement(
            kwh_consumed=kwh_consumed,
            price_per_kwh=price_per_kwh,
            parking_fee_per_hr=parking_fee_per_hr,
            scheduled_end=scheduled_end,
            actual_end=actual_end,
            actual_start=actual_start,
        )

        # Energy: 6.6 * 8.5 = 56.10
        self.assertEqual(settlement["energy_amount_inr"], Decimal("56.10"))
        # Parking: ~2.583 hours * 15 = 38.75
        self.assertGreater(settlement["parking_amount_inr"], Decimal("35.00"))
        # Overstay: 35 - 15 = 20 mins * 2 = 40.00
        self.assertEqual(settlement["overstay_minutes"], 20)
        self.assertEqual(settlement["overstay_penalty_inr"], Decimal("40.00"))
        self.assertEqual(settlement["platform_fee_inr"], Decimal("0.00"))
        self.assertGreater(settlement["total_amount_inr"], Decimal("130.00"))

    def test_upi_intent_uri_generation(self):
        """Tests generation of valid NPCI UPI intent link."""
        uri = PricingEngine.generate_upi_intent_uri(
            host_upi_id="arun@okaxis",
            host_name="Arun Kumar",
            amount_inr=Decimal("134.85"),
            booking_id="e5b927f8-3112-4029-9e8c-8f237894a102"
        )
        self.assertTrue(uri.startswith("upi://pay?"))
        self.assertIn("pa=arun%40okaxis", uri)
        self.assertIn("am=134.85", uri)
        self.assertIn("cu=INR", uri)

    def test_osrm_haversine_and_ghat_elevation_profile(self):
        """Tests geodesic distance and Ghat elevation profile calculation."""
        # Kochi (9.9926, 76.3544) to Munnar (10.0889, 77.0595)
        dist = osrm_service.haversine_distance(9.9926, 76.3544, 10.0889, 77.0595)
        self.assertGreater(dist, 70.0)
        self.assertLess(dist, 90.0)

        coords = [[76.3544, 9.9926], [76.7000, 10.0400], [77.0595, 10.0889]]
        profile = osrm_service.compute_elevation_profile(coords, total_distance_km=85.0, is_ghat_section=True)
        self.assertEqual(len(profile), 3)
        self.assertGreater(profile[-1]["elevation_meters"], 1000.0)

    def test_battery_depletion_simulation(self):
        """Tests that Ghat uphill section correctly predicts battery drop and recharge requirement."""
        coords = [[76.3544, 9.9926], [76.7000, 10.0400], [77.0595, 10.0889]]
        profile = osrm_service.compute_elevation_profile(coords, total_distance_km=120.0, is_ghat_section=True)

        depletion = osrm_service.simulate_battery_depletion_curve(
            elevation_waypoints=profile,
            initial_soc_percent=40.0, # Starting with only 40% battery
            battery_capacity_kwh=40.5
        )

        self.assertTrue(depletion["recharge_required"])
        self.assertIsNotNone(depletion["critical_stop_distance_km"])
        self.assertLess(depletion["final_soc_percent"], 20.0)

    def test_telemetry_physics_cc_cv_taper(self):
        """Tests that charging power throttles down in Constant Voltage phase (SOC >= 80%)."""
        # Low SOC (30%) - Full nominal 3.3 kW
        low_soc_tick = telemetry_physics.compute_tick(
            elapsed_seconds=100,
            nominal_power_kw=3.3,
            battery_capacity_kwh=40.5,
            initial_soc=30.0,
            price_per_kwh=8.5
        )
        self.assertFalse(low_soc_tick["is_tapering"])
        self.assertAlmostEqual(low_soc_tick["instant_power_kw"], 3.3, places=1)

        # High SOC (92%) - Tapering active
        high_soc_tick = telemetry_physics.compute_tick(
            elapsed_seconds=100,
            nominal_power_kw=3.3,
            battery_capacity_kwh=40.5,
            initial_soc=92.0,
            price_per_kwh=8.5
        )
        self.assertTrue(high_soc_tick["is_tapering"])
        self.assertLess(high_soc_tick["instant_power_kw"], 3.3)
        self.assertGreater(high_soc_tick["instant_power_kw"], 0.2)

class TestBookingFSMTransitions(unittest.IsolatedAsyncioTestCase):

    async def test_booking_happy_path_transitions(self):
        """Tests full state transition sequence: REQUESTED -> APPROVED -> CHECKED_IN -> ACTIVE_CHARGING -> COMPLETED."""
        mock_node = MagicMock()
        mock_node.id = "node_1"
        mock_node.power_output_kw = 3.3
        mock_node.price_per_kwh = Decimal("8.50")
        mock_node.parking_fee_per_hr = Decimal("15.00")
        mock_node.is_smart_iot = False
        mock_node.iot_device_id = None

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_node

        mock_db = MagicMock()
        async def mock_execute(*args, **kwargs):
            return mock_result
        async def mock_flush(*args, **kwargs):
            pass

        mock_db.execute = mock_execute
        mock_db.flush = mock_flush

        booking = Booking(
            node_id="node_1",
            driver_id="driver_1",
            host_id="host_1",
            vehicle_id="vehicle_1",
            booking_type=BookingType.ADHOC,
            scheduled_start=datetime.now(timezone.utc),
            scheduled_end=datetime.now(timezone.utc) + timedelta(hours=2),
            status=BookingStatus.REQUESTED,
            start_pin_code="4921",
            gate_pass_code="VM-7K9A2P",
            state_history=[]
        )

        fsm = BookingStateMachine(booking, mock_db)

        # 1. Host Approves
        await fsm.trigger(event="HOST_APPROVE", actor_id="host_1", actor_role="HOST")
        self.assertEqual(booking.status, BookingStatus.APPROVED)

        # 2. Driver Verifies Gate Pass
        await fsm.trigger(
            event="VERIFY_GATE_PASS",
            actor_id="driver_1",
            actor_role="DRIVER",
            metadata={"gate_pass_code": "VM-7K9A2P"}
        )
        self.assertEqual(booking.status, BookingStatus.CHECKED_IN)
        self.assertTrue(booking.gate_pass_verified)

        # 3. Start Charging with PIN & Start Meter OCR
        await fsm.trigger(
            event="START_CHARGING",
            actor_id="driver_1",
            actor_role="DRIVER",
            metadata={"pin_code": "4921", "start_meter_reading": 1050.0}
        )
        self.assertEqual(booking.status, BookingStatus.ACTIVE_CHARGING)
        self.assertEqual(booking.start_meter_reading, 1050.0)

        # 4. Complete Session & Settle with End Meter OCR
        await fsm.trigger(
            event="VERIFY_AND_SETTLE",
            actor_id="driver_1",
            actor_role="DRIVER",
            metadata={"end_meter_reading": 1056.6} # 6.6 kWh delivered
        )
        self.assertEqual(booking.status, BookingStatus.COMPLETED)
        self.assertEqual(booking.actual_kwh, 6.6)
        self.assertGreater(booking.total_amount_inr, Decimal("50.00"))

    async def test_invalid_transition_guard_rejection(self):
        """Tests that state machine rejects illegal transition events."""
        mock_db = MagicMock()
        booking = Booking(
            status=BookingStatus.REQUESTED,
            host_id="host_1",
            driver_id="driver_1",
            start_pin_code="4921",
            gate_pass_code="VM-7K9A2P"
        )
        fsm = BookingStateMachine(booking, mock_db)

        # Cannot jump from REQUESTED directly to ACTIVE_CHARGING
        with self.assertRaises(BookingStateError):
            await fsm.trigger(event="START_CHARGING", actor_id="driver_1", actor_role="DRIVER")

if __name__ == "__main__":
    unittest.main()
