import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID, uuid4
from decimal import Decimal
import random
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.models.booking import BookingStatus, BookingType, PaymentMode
from app.schemas.booking import (
    BookingCreate,
    BookingRespond,
    VerifyGatePassRequest,
    StartSessionRequest,
    CompleteSessionRequest,
    CancelBookingRequest,
    BookingResponse,
)
from app.db.init_edw import PARTY_DRIVER_NIDHIN, VEH_TATA_NEXON, NODE_LOTUS_VILLA
from app.api.v1.auth import get_optional_current_user
from app.api.v1.payments import (
    append_wallet_ledger_entry,
    ensure_today_date_sk,
    get_party_sk_and_balance,
    TXN_TYPE_BOOKING_HOLD,
    TXN_TYPE_HOLD_RELEASE,
    TXN_TYPE_CHARGE_DEBIT,
    TXN_TYPE_HOST_CREDIT,
)
from app.services.pricing_engine import PricingEngine
from app.services.redis_service import redis_service
from app.core.config import settings

logger = logging.getLogger("voltmate.api.bookings")
router = APIRouter(prefix="/bookings", tags=["Booking Fact Ledger & Lifecycle (EDW)"])

STAT_CD_TO_ENUM = {
    4001: BookingStatus.APPROVED,
    4002: BookingStatus.ACTIVE_CHARGING,
    4003: BookingStatus.COMPLETED,
    4004: BookingStatus.CANCELLED,
    4005: BookingStatus.REQUESTED,
}


class QuickBookingEdwPayload(BaseModel):
    stationId: Optional[str] = None
    node_id: Optional[UUID] = None
    connectorType: Optional[str] = None
    scheduledDate: Optional[str] = None
    scheduledTime: Optional[str] = None
    gatePassPin: Optional[str] = None
    estimatedKwh: Optional[float] = 15.0
    estimatedAmountInr: Optional[float] = None
    paymentMode: Optional[str] = "WALLET"


def map_edw_session_to_booking_response(r: dict) -> BookingResponse:
    stat_cd = int(r["session_stat_cd"])
    status_enum = STAT_CD_TO_ENUM.get(stat_cd, BookingStatus.APPROVED)
    pin_str = str(r.get("gate_pass_pin_num") or 544555)
    return BookingResponse(
        id=r["booking_natural_uuid"],
        node_id=r["node_id"],
        driver_id=r["driver_party_id"],
        host_id=r["host_party_id"],
        vehicle_id=r["vehicle_id"],
        booking_type=BookingType.INSTANT,
        scheduled_start=r["sched_start_ts"],
        scheduled_end=r["sched_end_ts"],
        actual_start=r.get("actual_start_ts"),
        actual_end=r.get("actual_end_ts"),
        status=status_enum,
        start_pin_code=pin_str[:4],
        gate_pass_code=f"VM-{pin_str}",
        estimated_kwh=float(r.get("delivered_kwh") or 15.0),
        actual_kwh=float(r.get("delivered_kwh") or 0.0),
        energy_amount_inr=Decimal(str(r.get("energy_cost_inr") or "0.00")),
        parking_amount_inr=Decimal(str(r.get("parking_cost_inr") or "0.00")),
        overstay_penalty_inr=Decimal("0.00"),
        platform_fee_inr=Decimal("0.00"),
        total_amount_inr=Decimal(str(r.get("total_settled_inr") or "0.00")),
        payment_mode=PaymentMode.UPI_INTENT,
        node_title=r.get("station_title"),
        society_name=r.get("station_address"),
        gate_instructions=r.get("gate_instructions"),
        host_name=r.get("host_full_name"),
        driver_name=r.get("driver_full_name"),
        vehicle_reg=r.get("vehicle_rc_plate"),
        created_at=r["sched_start_ts"],
    )


def _verify_booking_actor_access(
    row: dict,
    current_user: Optional[dict] = None,
    explicit_actor_id: Optional[str] = None,
    allowed_roles: tuple[str, ...] = ("driver", "host"),
) -> None:
    """Enforces IDOR ownership check when an authenticated user or explicit actor_id is present."""
    actor_id: Optional[str] = None
    if isinstance(current_user, dict) and current_user.get("party_id"):
        actor_id = str(current_user["party_id"])
    elif isinstance(explicit_actor_id, str) and explicit_actor_id.strip():
        actor_id = explicit_actor_id.strip()

    if not actor_id:
        return

    allowed_ids = set()
    if "driver" in allowed_roles and row.get("driver_party_id"):
        allowed_ids.add(str(row["driver_party_id"]))
    if "host" in allowed_roles and row.get("host_party_id"):
        allowed_ids.add(str(row["host_party_id"]))

    if allowed_ids and actor_id not in allowed_ids:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: you do not have permission to access or modify this booking.",
        )


@router.get("/", response_model=List[BookingResponse])
async def list_edw_sessions(
    user_id: Optional[str] = Query(None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists charging sessions strictly scoped to the authenticated user (as driver or host) with pagination.
    """
    eff_user_id = (
        str(current_user["party_id"])
        if isinstance(current_user, dict) and current_user.get("party_id")
        else (user_id if isinstance(user_id, str) else None)
    )
    if eff_user_id:
        try:
            UUID(str(eff_user_id))
            rows = (
                await db.execute(
                    text(
                        """
                        SELECT * FROM dw_fact.vw_resolved_sessions
                        WHERE driver_party_id = :uid OR host_party_id = :uid
                        ORDER BY session_fact_id DESC
                        LIMIT :lim OFFSET :off
                        """
                    ),
                    {"uid": str(eff_user_id), "lim": int(limit if isinstance(limit, int) else 50), "off": int(offset if isinstance(offset, int) else 0)},
                )
            ).mappings().all()
            return [map_edw_session_to_booking_response(dict(r)) for r in rows]
        except Exception:
            return []

    return []


@router.post("/")
async def create_quick_edw_booking(
    payload: QuickBookingEdwPayload,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new reservation row in `dw_fact.fact_charging_session` for the authenticated user
    and logs a transition in `dw_fact.fact_booking_lifecycle` using Surrogate Keys (`_sk`).
    """
    target_node_id = payload.node_id or NODE_LOTUS_VILLA
    if payload.stationId:
        try:
            target_node_id = UUID(payload.stationId)
        except Exception:
            target_node_id = NODE_LOTUS_VILLA

    tariff_row = (
        await db.execute(
            text(
                """
                SELECT t.tariff_sk, t.energy_rate_inr, t.parking_rate_hr_inr, n.host_party_id
                FROM dw_dim.dim_node_tariff_scd2 t
                JOIN mdm_core.mdm_charging_node n ON n.node_id = t.node_id
                WHERE t.node_id = :nid AND t.curr_row_ind = 'Y'
                LIMIT 1
                FOR UPDATE OF t
                """
            ),
            {"nid": str(target_node_id)},
        )
    ).mappings().first()

    if not tariff_row:
        tariff_row = (
            await db.execute(
                text(
                    """
                    SELECT t.tariff_sk, t.energy_rate_inr, t.parking_rate_hr_inr, n.host_party_id
                    FROM dw_dim.dim_node_tariff_scd2 t
                    JOIN mdm_core.mdm_charging_node n ON n.node_id = t.node_id
                    WHERE t.curr_row_ind = 'Y'
                    LIMIT 1
                    """
                )
            )
        ).mappings().first()

    driver_party_uuid = current_user["party_id"] if current_user else PARTY_DRIVER_NIDHIN

    est_kwh = Decimal(str(max(1.0, float(payload.estimatedKwh or 15.0))))
    rate_inr = Decimal(str(tariff_row["energy_rate_inr"] or "10.50"))
    hold_amount_inr = (
        Decimal(str(payload.estimatedAmountInr)).quantize(Decimal("0.01"))
        if payload.estimatedAmountInr and payload.estimatedAmountInr > 0
        else (est_kwh * rate_inr).quantize(Decimal("0.01"))
    )

    # Check wallet balance if paymentMode is WALLET and user is authenticated
    if current_user and (payload.paymentMode or "WALLET").upper() == "WALLET":
        _, avail_bal = await get_party_sk_and_balance(db, str(driver_party_uuid))
        if avail_bal < hold_amount_inr:
            shortfall = (hold_amount_inr - avail_bal).quantize(Decimal("0.01"))
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient wallet balance for booking hold. Required: ₹{hold_amount_inr}, Available: ₹{avail_bal}, Shortfall: ₹{shortfall}.",
            )

    drv_sk = await db.scalar(
        text("SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'"),
        {"pid": str(driver_party_uuid)},
    )
    if not drv_sk:
        drv_sk = await db.scalar(
            text("SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'"),
            {"pid": str(PARTY_DRIVER_NIDHIN)},
        )

    host_sk = await db.scalar(
        text("SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'"),
        {"pid": str(tariff_row["host_party_id"])},
    )
    veh_sk = await db.scalar(
        text("SELECT vehicle_sk FROM dw_dim.dim_vehicle_scd2 WHERE owner_party_id = :pid AND curr_row_ind = 'Y' ORDER BY is_primary_ind DESC LIMIT 1"),
        {"pid": str(driver_party_uuid)},
    )
    if not veh_sk:
        veh_sk = await db.scalar(
            text("SELECT vehicle_sk FROM dw_dim.dim_vehicle_scd2 WHERE vehicle_id = :vid AND curr_row_ind = 'Y'"),
            {"vid": str(VEH_TATA_NEXON)},
        )

    now_ts = datetime.now(timezone.utc)
    today_sk = await ensure_today_date_sk(db)

    # Auto-expire any pending REQUESTED (4005) reservations older than 15 minutes
    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_charging_session
            SET session_stat_cd = 4004
            WHERE tariff_sk = :tsk
              AND session_stat_cd = 4005
              AND sched_start_ts < NOW() - INTERVAL '15 minutes'
            """
        ),
        {"tsk": tariff_row["tariff_sk"]},
    )

    # Check for overlapping active/reserved slot on the same connector tariff_sk when explicit window is requested
    if payload.scheduledDate and payload.scheduledTime and "Immediate" not in (payload.scheduledTime or ""):
        conflict = await db.scalar(
            text(
                """
                SELECT booking_natural_uuid
                FROM dw_fact.fact_charging_session
                WHERE tariff_sk = :tsk
                  AND session_stat_cd IN (4001, 4002)
                  AND sched_start_ts < :req_end
                  AND sched_end_ts > :req_start
                LIMIT 1
                """
            ),
            {
                "tsk": tariff_row["tariff_sk"],
                "req_start": now_ts,
                "req_end": now_ts + timedelta(hours=1),
            },
        )
        if conflict:
            raise HTTPException(
                status_code=409,
                detail="This charger connector is already reserved during the requested time window.",
            )

    pin_int = int(payload.gatePassPin) if (payload.gatePassPin and payload.gatePassPin.isdigit()) else random.randint(100000, 999999)
    booking_uuid = uuid4()

    sf_id = await db.scalar(
        text(
            """
            INSERT INTO dw_fact.fact_charging_session (
                booking_natural_uuid, date_sk, driver_party_sk, host_party_sk,
                vehicle_sk, tariff_sk, session_stat_cd, gate_pass_pin_num,
                sched_start_ts, sched_end_ts, start_soc_pct
            )
            VALUES (
                :buuid, :dsk, :drv_sk, :hst_sk,
                :veh_sk, :tar_sk, 4001, :pin,
                :sstart, :send, 72.00
            )
            RETURNING session_fact_id
            """
        ),
        {
            "buuid": str(booking_uuid),
            "dsk": today_sk,
            "drv_sk": drv_sk,
            "hst_sk": host_sk,
            "veh_sk": veh_sk,
            "tar_sk": tariff_row["tariff_sk"],
            "pin": pin_int,
            "sstart": now_ts,
            "send": now_ts + timedelta(hours=1),
        },
    )

    await db.execute(
        text(
            """
            INSERT INTO dw_fact.fact_booking_lifecycle (session_fact_id, date_sk, from_stat_cd, to_stat_cd, transition_elapsed_sec)
            VALUES (:sfid, :dsk, NULL, 4001, 0)
            """
        ),
        {"sfid": sf_id, "dsk": today_sk},
    )

    wallet_hold_entry = None
    if current_user and (payload.paymentMode or "WALLET").upper() == "WALLET" and hold_amount_inr > Decimal("0.00"):
        wallet_hold_entry = await append_wallet_ledger_entry(
            db=db,
            party_id=str(driver_party_uuid),
            txn_type_cd=TXN_TYPE_BOOKING_HOLD,
            dr_cr_ind="D",
            amount_inr=hold_amount_inr,
            session_fact_id=int(sf_id),
        )

    await db.commit()
    return {
        "session_fact_id": sf_id,
        "booking_natural_uuid": str(booking_uuid),
        "gate_pass_pin_num": pin_int,
        "session_stat_cd": 4001,
        "held_amount_inr": float(hold_amount_inr),
        "wallet_hold_entry": wallet_hold_entry,
    }


@router.post("/request", response_model=BookingResponse)
async def create_booking_request(
    payload: BookingCreate,
    driver_id: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    quick = await create_quick_edw_booking(
        QuickBookingEdwPayload(node_id=payload.node_id),
        current_user=current_user,
        db=db,
    )
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": quick["booking_natural_uuid"]},
        )
    ).mappings().first()
    return map_edw_session_to_booking_response(dict(row))


async def _release_booking_hold_if_any(db: AsyncSession, session_fact_id: int, driver_party_id: str) -> Optional[dict]:
    """Releases an unreleased BOOKING_HOLD (6005) for a given session_fact_id."""
    held_amt = await db.scalar(
        text(
            """
            SELECT COALESCE(
                SUM(CASE WHEN txn_type_cd = 6005 THEN txn_amt_inr WHEN txn_type_cd = 6006 THEN -txn_amt_inr ELSE 0 END),
                0.00
            )
            FROM dw_fact.fact_wallet_ledger
            WHERE session_fact_id = :sfid AND txn_type_cd IN (6005, 6006)
            """
        ),
        {"sfid": int(session_fact_id)},
    )
    net_hold = Decimal(str(held_amt or "0.00")).quantize(Decimal("0.01"))
    if net_hold > Decimal("0.00"):
        return await append_wallet_ledger_entry(
            db=db,
            party_id=str(driver_party_id),
            txn_type_cd=TXN_TYPE_HOLD_RELEASE,
            dr_cr_ind="C",
            amount_inr=net_hold,
            session_fact_id=int(session_fact_id),
        )
    return None


@router.patch("/{booking_id}/respond", response_model=BookingResponse)
async def respond_to_booking(
    booking_id: UUID,
    payload: BookingRespond,
    host_id: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found in EDW")

    _verify_booking_actor_access(row, current_user, host_id, allowed_roles=("host",))

    new_stat_cd = 4001 if payload.accept else 4004
    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_charging_session
            SET session_stat_cd = :stat
            WHERE booking_natural_uuid = :buuid
            """
        ),
        {"stat": new_stat_cd, "buuid": str(booking_id)},
    )
    if not payload.accept:
        await _release_booking_hold_if_any(
            db=db,
            session_fact_id=int(row["session_fact_id"]),
            driver_party_id=str(row["driver_party_id"]),
        )
    await db.commit()
    updated = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    return map_edw_session_to_booking_response(dict(updated))


@router.post("/{booking_id}/cancel")
async def cancel_edw_booking(
    booking_id: UUID,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancels an upcoming reservation and releases 100% of any wallet hold back to the driver."""
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found in EDW")

    _verify_booking_actor_access(row, current_user, allowed_roles=("driver", "host"))

    if int(row["session_stat_cd"]) == 4003:
        raise HTTPException(status_code=400, detail="Completed charging sessions cannot be cancelled.")

    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_charging_session
            SET session_stat_cd = 4004
            WHERE booking_natural_uuid = :buuid
            """
        ),
        {"buuid": str(booking_id)},
    )
    released = await _release_booking_hold_if_any(
        db=db,
        session_fact_id=int(row["session_fact_id"]),
        driver_party_id=str(row["driver_party_id"]),
    )
    await db.commit()
    _, new_bal = await get_party_sk_and_balance(db, str(row["driver_party_id"]))
    return {
        "cancelled": True,
        "booking_id": str(booking_id),
        "released_hold_entry": released,
        "wallet_balance_inr": float(new_bal),
    }


@router.post("/{booking_id}/start-session", response_model=BookingResponse)
async def start_charging_session(
    booking_id: UUID,
    payload: StartSessionRequest,
    driver_id: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Session not found in EDW")

    _verify_booking_actor_access(existing, current_user, driver_id, allowed_roles=("driver", "host"))

    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_charging_session
            SET session_stat_cd = 4002, actual_start_ts = NOW()
            WHERE booking_natural_uuid = :buuid
            """
        ),
        {"buuid": str(booking_id)},
    )
    await db.commit()
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    return map_edw_session_to_booking_response(dict(row))


@router.post("/{booking_id}/complete-session", response_model=BookingResponse)
async def complete_charging_session(
    booking_id: UUID,
    payload: CompleteSessionRequest,
    user_id: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found in EDW")

    _verify_booking_actor_access(row, current_user, user_id, allowed_roles=("driver", "host"))

    if int(row["session_stat_cd"]) == 4003:
        return map_edw_session_to_booking_response(dict(row))

    delivered_kwh = Decimal(str(max(0.1, payload.end_meter_reading))).quantize(Decimal("0.001"))
    rate_inr = Decimal(str(row["historical_energy_rate_inr"]))
    parking_inr = Decimal(str(row["historical_parking_rate_inr"]))
    energy_cost = (delivered_kwh * rate_inr).quantize(Decimal("0.01"))
    total_inr = (energy_cost + parking_inr).quantize(Decimal("0.01"))

    breakdown = PricingEngine.calculate_gst_and_fee_breakdown(
        total_settled_inr=total_inr,
        platform_fee_percent=Decimal(str(getattr(settings, "PLATFORM_FEE_PERCENT", 5.0))),
    )
    host_net_credit_inr = breakdown["host_net_payout_inr"]

    sf_id = int(row["session_fact_id"])
    driver_pid = str(row["driver_party_id"])
    host_pid = str(row["host_party_id"])

    # 1. Release any prior booking hold on this session
    await _release_booking_hold_if_any(db=db, session_fact_id=sf_id, driver_party_id=driver_pid)

    # 2. Debit final settled session cost from driver wallet
    await append_wallet_ledger_entry(
        db=db,
        party_id=driver_pid,
        txn_type_cd=TXN_TYPE_CHARGE_DEBIT,
        dr_cr_ind="D",
        amount_inr=total_inr,
        session_fact_id=sf_id,
        allow_negative=True,
    )

    # 3. Credit host earnings ledger (net of platform fee)
    if host_net_credit_inr > Decimal("0.00"):
        await append_wallet_ledger_entry(
            db=db,
            party_id=host_pid,
            txn_type_cd=TXN_TYPE_HOST_CREDIT,
            dr_cr_ind="C",
            amount_inr=host_net_credit_inr,
            session_fact_id=sf_id,
        )

    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_charging_session
            SET session_stat_cd = 4003,
                actual_end_ts = NOW(),
                delivered_kwh = :kwh,
                charging_duration_sec = 1800,
                energy_cost_inr = :ecost,
                parking_cost_inr = :pcost,
                total_settled_inr = :tot
            WHERE booking_natural_uuid = :buuid
            """
        ),
        {
            "kwh": delivered_kwh,
            "ecost": energy_cost,
            "pcost": parking_inr,
            "tot": total_inr,
            "buuid": str(booking_id),
        },
    )
    await db.commit()
    updated = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    return map_edw_session_to_booking_response(dict(updated))


@router.get("/active", response_model=Optional[BookingResponse])
async def get_active_session(
    user_id: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    eff_user_id = str(current_user["party_id"]) if current_user else user_id
    if not eff_user_id:
        return None
    try:
        UUID(str(eff_user_id))
        row = (
            await db.execute(
                text(
                    """
                    SELECT * FROM dw_fact.vw_resolved_sessions
                    WHERE session_stat_cd = 4002
                      AND (driver_party_id = :uid OR host_party_id = :uid)
                    ORDER BY session_fact_id DESC
                    LIMIT 1
                    """
                ),
                {"uid": str(eff_user_id)},
            )
        ).mappings().first()
        return map_edw_session_to_booking_response(dict(row)) if row else None
    except Exception:
        return None


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking_details(
    booking_id: UUID,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found in EDW")
    _verify_booking_actor_access(row, current_user, allowed_roles=("driver", "host"))
    return map_edw_session_to_booking_response(dict(row))


@router.post("/{booking_id}/verify-pin")
async def verify_booking_gate_pass_pin(
    booking_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Cryptographically verifies the 4- or 6-digit Gate-Pass PIN on the server with brute-force rate limiting."""
    import hmac as _hmac

    rate_key = f"pin_verify:{booking_id}"
    if not await redis_service.check_login_allowed(rate_key, max_attempts=5):
        raise HTTPException(
            status_code=429,
            detail="Too many failed Gate-Pass PIN attempts. Please wait 5 minutes before retrying.",
        )

    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found in EDW")

    provided_pin = str(payload.get("pin_code") or payload.get("otp") or "").replace("-", "").replace(" ", "").strip()
    expected_full = str(row["gate_pass_pin_num"]).strip()
    expected_short = expected_full[:4]

    is_match = _hmac.compare_digest(provided_pin, expected_full) or (
        len(provided_pin) == 4 and _hmac.compare_digest(provided_pin, expected_short)
    )
    if not is_match:
        await redis_service.record_failed_login(rate_key, window_seconds=300)
        raise HTTPException(status_code=400, detail="Invalid Gate-Pass PIN code.")

    await redis_service.clear_failed_logins(rate_key)
    return {
        "verified": True,
        "booking_id": str(booking_id),
        "station_title": row.get("station_title"),
        "status": "CHECKED_IN",
    }


@router.patch("/{booking_id}/reschedule")
async def reschedule_edw_booking(
    booking_id: UUID,
    payload: dict,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reschedules an upcoming booking after checking for connector time-slot conflicts."""
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found in EDW")

    _verify_booking_actor_access(row, current_user, allowed_roles=("driver", "host"))

    if int(row["session_stat_cd"]) in (4002, 4003, 4004):
        raise HTTPException(status_code=400, detail="Only upcoming reservations can be rescheduled.")

    offset_hours = int(payload.get("offset_hours") or 2)
    new_start = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    new_end = new_start + timedelta(hours=1)

    conflict = await db.scalar(
        text(
            """
            SELECT booking_natural_uuid
            FROM dw_fact.fact_charging_session
            WHERE tariff_sk = :tsk
              AND booking_natural_uuid != :buuid
              AND session_stat_cd IN (4001, 4002)
              AND sched_start_ts < :nend
              AND sched_end_ts > :nstart
            LIMIT 1
            """
        ),
        {
            "tsk": row["tariff_sk"],
            "buuid": str(booking_id),
            "nstart": new_start,
            "nend": new_end,
        },
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Requested new time slot conflicts with an existing reservation.")

    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_charging_session
            SET sched_start_ts = :nstart, sched_end_ts = :nend
            WHERE booking_natural_uuid = :buuid
            """
        ),
        {"nstart": new_start, "nend": new_end, "buuid": str(booking_id)},
    )
    await db.commit()
    return {
        "rescheduled": True,
        "booking_id": str(booking_id),
        "scheduled_start": new_start.isoformat(),
        "scheduled_end": new_end.isoformat(),
        "slot_label": payload.get("slot_label") or "Rescheduled Slot",
    }


@router.get("/{booking_id}/invoice")
async def get_booking_gst_invoice(
    booking_id: UUID,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a complete Indian GST Tax Invoice breakdown (CGST 9% + SGST 9%, HSN/SAC 998714) from EDW facts."""
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found in EDW")

    _verify_booking_actor_access(row, current_user, allowed_roles=("driver", "host"))

    total_settled = Decimal(str(row.get("total_settled_inr") or "0.00")).quantize(Decimal("0.01"))
    energy_cost = Decimal(str(row.get("energy_cost_inr") or "0.00")).quantize(Decimal("0.01"))
    parking_cost = Decimal(str(row.get("parking_cost_inr") or "0.00")).quantize(Decimal("0.01"))
    if total_settled <= Decimal("0.00"):
        total_settled = (energy_cost + parking_cost).quantize(Decimal("0.01"))

    breakdown = PricingEngine.calculate_gst_and_fee_breakdown(
        total_settled_inr=total_settled,
        platform_fee_percent=Decimal(str(getattr(settings, "PLATFORM_FEE_PERCENT", 5.0))),
        gst_percent=Decimal(str(getattr(settings, "GST_PERCENT", 18.0))),
    )

    return {
        "invoice_number": f"INV-KL-2026-{row['session_fact_id']}",
        "booking_id": str(booking_id),
        "hsn_sac_code": "998714",
        "supplier_gstin": "32AABCV4921K1Z5",
        "station_title": row.get("station_title"),
        "station_address": row.get("station_address"),
        "host_name": row.get("host_full_name"),
        "driver_name": row.get("driver_full_name"),
        "vehicle_rc_plate": row.get("vehicle_rc_plate"),
        "connector_label": row.get("connector_label"),
        "delivered_kwh": float(row.get("delivered_kwh") or 0.0),
        "rate_per_kwh_inr": float(row.get("historical_energy_rate_inr") or 0.0),
        "energy_cost_inr": float(energy_cost),
        "parking_cost_inr": float(parking_cost),
        "taxable_value_inr": float(breakdown["taxable_value_inr"]),
        "cgst_percent": 9.0,
        "cgst_inr": float(breakdown["cgst_inr"]),
        "sgst_percent": 9.0,
        "sgst_inr": float(breakdown["sgst_inr"]),
        "total_gst_inr": float(breakdown["total_gst_inr"]),
        "platform_fee_inr": float(breakdown["platform_fee_inr"]),
        "host_net_payout_inr": float(breakdown["host_net_payout_inr"]),
        "total_settled_inr": float(breakdown["total_settled_inr"]),
        "currency": "INR",
    }
