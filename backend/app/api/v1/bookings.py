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


@router.get("/", response_model=List[BookingResponse])
async def list_edw_sessions(db: AsyncSession = Depends(get_db)):
    """
    Lists all charging sessions from `dw_fact.vw_resolved_sessions` (`dw_fact.fact_charging_session`
    joined with historical `dw_dim.dim_node_tariff_scd2`, `dw_dim.dim_vehicle_scd2`, and `ref_mdm` labels).
    """
    rows = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions ORDER BY session_fact_id DESC")
        )
    ).mappings().all()
    return [map_edw_session_to_booking_response(dict(r)) for r in rows]


@router.post("/")
async def create_quick_edw_booking(
    payload: QuickBookingEdwPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new reservation row in `dw_fact.fact_charging_session` and logs a transition
    in `dw_fact.fact_booking_lifecycle` using Surrogate Keys (`_sk`) and Reference Codes (`_cd`).
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
                SELECT t.tariff_sk, n.host_party_id
                FROM dw_dim.dim_node_tariff_scd2 t
                JOIN mdm_core.mdm_charging_node n ON n.node_id = t.node_id
                WHERE t.node_id = :nid AND t.curr_row_ind = 'Y'
                LIMIT 1
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
                    SELECT t.tariff_sk, n.host_party_id
                    FROM dw_dim.dim_node_tariff_scd2 t
                    JOIN mdm_core.mdm_charging_node n ON n.node_id = t.node_id
                    WHERE t.curr_row_ind = 'Y'
                    LIMIT 1
                    """
                )
            )
        ).mappings().first()

    drv_sk = await db.scalar(
        text("SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'"),
        {"pid": str(PARTY_DRIVER_NIDHIN)},
    )
    host_sk = await db.scalar(
        text("SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'"),
        {"pid": str(tariff_row["host_party_id"])},
    )
    veh_sk = await db.scalar(
        text("SELECT vehicle_sk FROM dw_dim.dim_vehicle_scd2 WHERE vehicle_id = :vid AND curr_row_ind = 'Y'"),
        {"vid": str(VEH_TATA_NEXON)},
    )

    now_ts = datetime.now(timezone.utc)
    today_sk = int(now_ts.date().strftime("%Y%m%d"))
    await db.execute(
        text(
            """
            INSERT INTO dw_dim.dim_date (date_sk, calendar_date, day_of_week_num, is_weekend_ind, month_num, year_num)
            VALUES (:dsk, :cdate, :dow, :wknd, :m, :y)
            ON CONFLICT (date_sk) DO NOTHING
            """
        ),
        {
            "dsk": today_sk,
            "cdate": now_ts.date(),
            "dow": now_ts.date().isoweekday(),
            "wknd": "Y" if now_ts.date().isoweekday() in (6, 7) else "N",
            "m": now_ts.date().month,
            "y": now_ts.date().year,
        },
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
    await db.commit()
    return {
        "session_fact_id": sf_id,
        "booking_natural_uuid": str(booking_uuid),
        "gate_pass_pin_num": pin_int,
        "session_stat_cd": 4001,
    }


@router.post("/request", response_model=BookingResponse)
async def create_booking_request(
    payload: BookingCreate,
    driver_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    quick = await create_quick_edw_booking(
        QuickBookingEdwPayload(node_id=payload.node_id),
        db=db,
    )
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": quick["booking_natural_uuid"]},
        )
    ).mappings().first()
    return map_edw_session_to_booking_response(dict(row))


@router.patch("/{booking_id}/respond", response_model=BookingResponse)
async def respond_to_booking(
    booking_id: UUID,
    payload: BookingRespond,
    host_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
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
    await db.commit()
    row = (
        await db.execute(
            text("SELECT * FROM dw_fact.vw_resolved_sessions WHERE booking_natural_uuid = :buuid"),
            {"buuid": str(booking_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found in EDW")
    return map_edw_session_to_booking_response(dict(row))


@router.post("/{booking_id}/start-session", response_model=BookingResponse)
async def start_charging_session(
    booking_id: UUID,
    payload: StartSessionRequest,
    driver_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
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
    if not row:
        raise HTTPException(status_code=404, detail="Session not found in EDW")
    return map_edw_session_to_booking_response(dict(row))


@router.post("/{booking_id}/complete-session", response_model=BookingResponse)
async def complete_charging_session(
    booking_id: UUID,
    payload: CompleteSessionRequest,
    user_id: Optional[str] = Query(None),
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

    delivered_kwh = Decimal(str(max(1.0, payload.end_meter_reading)))
    rate_inr = Decimal(str(row["historical_energy_rate_inr"]))
    parking_inr = Decimal(str(row["historical_parking_rate_inr"]))
    energy_cost = (delivered_kwh * rate_inr).quantize(Decimal("0.01"))
    total_inr = (energy_cost + parking_inr).quantize(Decimal("0.01"))

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
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            text(
                """
                SELECT * FROM dw_fact.vw_resolved_sessions
                WHERE session_stat_cd = 4002
                ORDER BY session_fact_id DESC
                LIMIT 1
                """
            )
        )
    ).mappings().first()
    return map_edw_session_to_booking_response(dict(row)) if row else None


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking_details(
    booking_id: UUID,
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
    return map_edw_session_to_booking_response(dict(row))
