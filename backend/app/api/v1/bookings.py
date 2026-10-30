import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.session import get_db
from app.models.booking import Booking, BookingStatus, BookingType, PaymentMode
from app.models.node import ChargingNode, NodeStatus
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.booking import (
    BookingCreate,
    BookingRespond,
    VerifyGatePassRequest,
    StartSessionRequest,
    CompleteSessionRequest,
    RaiseDisputeRequest,
    CancelBookingRequest,
    BookingResponse,
)
from app.core.security import generate_session_pin, generate_gate_pass_code
from app.services.redis_service import redis_service
from app.services.pricing_engine import PricingEngine
from app.services.booking_state_machine import BookingStateMachine, BookingStateError

logger = logging.getLogger("voltmate.api.bookings")
router = APIRouter(prefix="/bookings", tags=["Booking State Machine & Sessions"])

def enrich_booking_response(booking: Booking, node: Optional[ChargingNode] = None, host: Optional[User] = None, driver: Optional[User] = None, vehicle: Optional[Vehicle] = None) -> BookingResponse:
    resp = BookingResponse.model_validate(booking)
    if node:
        resp.node_title = node.title
        resp.society_name = node.society_name
        resp.gate_instructions = node.gate_instructions
    if host:
        resp.host_name = host.full_name
        # Build UPI intent if completed
        if booking.status == BookingStatus.COMPLETED and booking.total_amount_inr > 0:
            resp.upi_intent_url = PricingEngine.generate_upi_intent_uri(
                host_upi_id=host.upi_id or "host.voltmate@okaxis",
                host_name=host.full_name,
                amount_inr=booking.total_amount_inr,
                booking_id=str(booking.id),
                note=f"VoltMate {node.title[:20] if node else 'Charge'}"
            )
    if driver:
        resp.driver_name = driver.full_name
    if vehicle:
        resp.vehicle_reg = vehicle.registration_number
    return resp

@router.post("/request", response_model=BookingResponse)
async def create_booking_request(
    payload: BookingCreate,
    driver_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates booking creation via the BookingStateMachine.
    Acquires atomic Redis slot lock (5-minute TTL) with unique token.
    """
    # 1. Fetch charging node
    stmt_node = select(ChargingNode).where(ChargingNode.id == payload.node_id)
    node = (await db.execute(stmt_node)).scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Charging station node not found")

    if node.status == NodeStatus.OFFLINE:
        raise HTTPException(status_code=400, detail="This charging station is currently offline or on pause.")

    # 2. Fetch driver and vehicle
    stmt_driver = select(User).where(User.id == driver_id)
    driver = (await db.execute(stmt_driver)).scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    stmt_vehicle = select(Vehicle).where(Vehicle.id == payload.vehicle_id)
    vehicle = (await db.execute(stmt_vehicle)).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found in garage")

    # 3. Trust Score Guard
    if driver.trust_score < node.min_driver_rating:
        raise HTTPException(
            status_code=403,
            detail=f"Host requires a minimum trust rating of {node.min_driver_rating}★. Your current rating is {driver.trust_score}★."
        )

    # 4. Redis slot concurrency lock with token
    slot_ts = int(payload.scheduled_start.timestamp())
    temp_lock_token = f"tok_{uuid_prefix(str(payload.node_id))}_{slot_ts}"
    acquired = await redis_service.acquire_slot_lock(str(node.id), slot_ts, temp_lock_token, ttl_seconds=300)
    if not acquired:
        raise HTTPException(
            status_code=409,
            detail="This charging slot is currently being held by another driver. Please pick another time or node."
        )

    # 5. Handshake credential generation
    pin_code = generate_session_pin()
    gate_code = f"VM-{generate_gate_pass_code()}"
    initial_status = BookingStatus.APPROVED if node.instant_book_enabled else BookingStatus.REQUESTED
    host_target_id = node.host_id if node.host_id else driver.id

    now = datetime.now(timezone.utc)
    new_booking = Booking(
        node_id=node.id,
        driver_id=driver.id,
        host_id=host_target_id,
        vehicle_id=vehicle.id,
        booking_type=payload.booking_type,
        scheduled_start=payload.scheduled_start,
        scheduled_end=payload.scheduled_end,
        status=initial_status,
        start_pin_code=pin_code,
        gate_pass_code=gate_code,
        estimated_kwh=payload.estimated_kwh,
        actual_kwh=0.0,
        total_amount_inr=Decimal("0.00"),
        platform_fee_inr=Decimal("0.00"),
        payment_mode=payload.payment_mode,
        state_history=[{
            "from": "NONE",
            "to": initial_status.value,
            "event": "CREATE_REQUEST" if not node.instant_book_enabled else "INSTANT_BOOK",
            "at": now.isoformat(),
            "actor_id": str(driver.id),
            "actor_role": "DRIVER",
            "reason": "Initial booking slot creation",
            "metadata": {"instant_book": node.instant_book_enabled}
        }]
    )
    db.add(new_booking)
    await db.flush()
    await db.refresh(new_booking)

    # Register expiration tracking if manual approval needed
    if not node.instant_book_enabled:
        await redis_service.register_booking_expiration(str(new_booking.id), ttl_seconds=300)

    return enrich_booking_response(new_booking, node=node, driver=driver, vehicle=vehicle)

def uuid_prefix(uuid_str: str) -> str:
    return uuid_str.replace("-", "")[:8]

@router.patch("/{booking_id}/respond", response_model=BookingResponse)
async def respond_to_booking(
    booking_id: UUID,
    payload: BookingRespond,
    host_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Host approves or rejects the booking request."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    fsm = BookingStateMachine(booking, db)
    event = "HOST_APPROVE" if payload.accept else "HOST_REJECT"

    try:
        updated_booking = await fsm.trigger(
            event=event,
            actor_id=host_id,
            actor_role="HOST",
            reason=payload.rejection_reason,
            metadata={"rejection_reason": payload.rejection_reason}
        )
        return enrich_booking_response(updated_booking)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/verify-gate-pass", response_model=BookingResponse)
async def verify_society_gate_pass(
    booking_id: UUID,
    payload: VerifyGatePassRequest,
    driver_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Driver or Security guard verifies digital gate pass upon arrival at society barrier."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(
            event="VERIFY_GATE_PASS",
            actor_id=driver_id,
            actor_role="DRIVER",
            metadata={"gate_pass_code": payload.gate_pass_code}
        )
        return enrich_booking_response(updated)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/start-session", response_model=BookingResponse)
async def start_charging_session(
    booking_id: UUID,
    payload: StartSessionRequest,
    driver_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Driver plugs in, enters 4-digit PIN, submits Start Meter OCR, and turns ON smart relay."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(
            event="START_CHARGING",
            actor_id=driver_id,
            actor_role="DRIVER",
            metadata={
                "pin_code": payload.pin_code,
                "start_meter_reading": payload.start_meter_reading,
                "start_meter_photo_url": payload.start_meter_photo_url,
            }
        )
        return enrich_booking_response(updated)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/pause", response_model=BookingResponse)
async def pause_charging_session(
    booking_id: UUID,
    user_id: str = Query(...),
    role: str = Query("DRIVER"),
    db: AsyncSession = Depends(get_db)
):
    """Temporarily pauses charging and turns OFF smart relay."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(event="PAUSE_CHARGING", actor_id=user_id, actor_role=role)
        return enrich_booking_response(updated)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/resume", response_model=BookingResponse)
async def resume_charging_session(
    booking_id: UUID,
    user_id: str = Query(...),
    role: str = Query("DRIVER"),
    db: AsyncSession = Depends(get_db)
):
    """Resumes charging session and turns ON smart relay."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(event="RESUME_CHARGING", actor_id=user_id, actor_role=role)
        return enrich_booking_response(updated)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/complete-session", response_model=BookingResponse)
async def complete_charging_session(
    booking_id: UUID,
    payload: CompleteSessionRequest,
    user_id: str = Query(...),
    role: str = Query("DRIVER"),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits End Meter OCR, performs delta validation, stops relay, calculates tariff & overstay fees,
    and settles via VoltCredits or generates UPI deep-link URI.
    """
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    stmt_node = select(ChargingNode).where(ChargingNode.id == booking.node_id)
    node = (await db.execute(stmt_node)).scalar_one_or_none()

    stmt_host = select(User).where(User.id == booking.host_id)
    host = (await db.execute(stmt_host)).scalar_one_or_none()

    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(
            event="VERIFY_AND_SETTLE",
            actor_id=user_id,
            actor_role=role,
            metadata={
                "end_meter_reading": payload.end_meter_reading,
                "end_meter_photo_url": payload.end_meter_photo_url,
                "upi_utr_reference": payload.upi_utr_reference,
            }
        )
        return enrich_booking_response(updated, node=node, host=host)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: UUID,
    payload: CancelBookingRequest,
    user_id: str = Query(...),
    role: str = Query("DRIVER"),
    db: AsyncSession = Depends(get_db)
):
    """Cancels booking and releases Redis timeslot lock."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    event = "DRIVER_CANCEL" if role == "DRIVER" else "HOST_CANCEL"
    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(
            event=event,
            actor_id=user_id,
            actor_role=role,
            reason=payload.reason,
            metadata={"cancellation_reason": payload.reason}
        )
        return enrich_booking_response(updated)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.post("/{booking_id}/dispute", response_model=BookingResponse)
async def raise_dispute(
    booking_id: UUID,
    payload: RaiseDisputeRequest,
    user_id: str = Query(...),
    role: str = Query("DRIVER"),
    db: AsyncSession = Depends(get_db)
):
    """Raises dispute on inaccurate OCR meter reading or host bay mismatch."""
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    fsm = BookingStateMachine(booking, db)
    try:
        updated = await fsm.trigger(
            event="RAISE_DISPUTE",
            actor_id=user_id,
            actor_role=role,
            reason=payload.reason,
            metadata={"dispute_reason": payload.reason}
        )
        return enrich_booking_response(updated)
    except BookingStateError as e:
        raise HTTPException(status_code=400, detail=e.message)

@router.get("/active", response_model=Optional[BookingResponse])
async def get_active_session(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Returns the current active charging session for the user."""
    stmt = select(Booking).where(
        and_(
            (Booking.driver_id == user_id) | (Booking.host_id == user_id),
            Booking.status.in_([BookingStatus.ACTIVE_CHARGING, BookingStatus.PAUSED, BookingStatus.CHECKED_IN])
        )
    ).order_by(Booking.created_at.desc())
    booking = (await db.execute(stmt)).scalars().first()
    if not booking:
        return None

    stmt_node = select(ChargingNode).where(ChargingNode.id == booking.node_id)
    node = (await db.execute(stmt_node)).scalar_one_or_none()

    stmt_host = select(User).where(User.id == booking.host_id)
    host = (await db.execute(stmt_host)).scalar_one_or_none()

    return enrich_booking_response(booking, node=node, host=host)

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking_details(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Booking).where(Booking.id == booking_id)
    booking = (await db.execute(stmt)).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    stmt_node = select(ChargingNode).where(ChargingNode.id == booking.node_id)
    node = (await db.execute(stmt_node)).scalar_one_or_none()

    stmt_host = select(User).where(User.id == booking.host_id)
    host = (await db.execute(stmt_host)).scalar_one_or_none()

    return enrich_booking_response(booking, node=node, host=host)
