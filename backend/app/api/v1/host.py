import logging
from typing import List, Optional
from uuid import UUID, uuid4
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.models.node import NodeStatus, NodeType
from app.models.vehicle import ConnectorType
from app.schemas.node import ChargingNodeCreate, ChargingNodeResponse
from app.api.v1.discovery import map_edw_station_row
from app.db.init_edw import update_node_tariff_scd2, PARTY_HOST_ARUN

logger = logging.getLogger("voltmate.api.host")
router = APIRouter(prefix="/host", tags=["Host Management & SCD2 Tariff Engine (EDW)"])

CONN_ENUM_TO_CD = {
    ConnectorType.SOCKET_15A: 2001,
    ConnectorType.TYPE_2: 2002,
    ConnectorType.CCS2: 2003,
}

NCAT_ENUM_TO_CD = {
    NodeType.P2P_HOME: 7001,
    NodeType.PUBLIC_DC: 7002,
    NodeType.P2P_RWA: 7003,
    NodeType.DESTINATION_CAFE: 7004,
}


class TariffUpdateScd2Request(BaseModel):
    conn_type_cd: int = 2001
    new_energy_rate_inr: Decimal
    new_parking_rate_hr_inr: Optional[Decimal] = None


class HostConnectorSpecPayload(BaseModel):
    name: str = "Type-2 AC Wallbox (7.4 kW)"
    powerKw: float = 7.4
    pricePerKwh: float = 10.50


class HostStationUpsertPayload(BaseModel):
    id: Optional[str] = None
    title: str
    address: str
    landmark: Optional[str] = None
    latitude: float = 10.0159
    longitude: float = 76.3419
    hostName: Optional[str] = "Nidhin R"
    hostPhone: Optional[str] = "+919847049210"
    discomBoard: str = "KSEB"
    parkingBayNumber: str = "Driveway Bay A-1"
    gateInstructions: str = "Show 6-digit pass to security guard at main gate"
    amenities: List[str] = ["Covered Parking", "CCTV Monitored", "24/7 Access"]
    connectors: List[HostConnectorSpecPayload] = []
    parkingFeePerHrInr: float = 15.0
    isOnline: bool = True
    autoApproveVerifiedDrivers: bool = True


DISCOM_STR_TO_CD = {
    "KSEB": 3001,
    "BESCOM": 3002,
    "TNEB": 3003,
    "TANGEDCO": 3003,
    "MSEDCL": 3001,
}


@router.get("/tariff-helper")
async def get_discom_tariff_guidelines(db: AsyncSession = Depends(get_db)):
    """
    Fetches DISCOM board codes and translated labels directly from
    `ref_mdm.cd_reference_value` and `ref_mdm.txt_reference_label` (Domain 30).
    """
    rows = (
        await db.execute(
            text(
                """
                SELECT rv.ref_cd, rv.std_code, tl.short_label_txt, tl.medium_label_txt, tl.long_desc_txt
                FROM ref_mdm.cd_reference_value rv
                JOIN ref_mdm.txt_reference_label tl ON tl.ref_cd = rv.ref_cd AND tl.lang_cd = 'EN'
                WHERE rv.domain_cd = 30 AND rv.active_ind = 'Y'
                ORDER BY rv.sort_seq ASC
                """
            )
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/stations")
async def upsert_p2p_host_station(
    payload: HostStationUpsertPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates or updates a User-Hosted P2P Charging Station in PostgreSQL (`voltmate_edw`):
      - Upserts `mdm_core.mdm_charging_node` (`node_cat_cd = 7001 P2P_HOME`)
      - Upserts `mdm_core.txt_entity_narrative` (title, address, gate instructions, society)
      - Upserts `mdm_core.kv_entity_attribute` (bay code, covered parking, CCTV, instant book)
      - Versions connector tariffs in `dw_dim.dim_node_tariff_scd2` using Kimball SCD Type 2
    """
    node_uuid = uuid4()
    if payload.id:
        try:
            node_uuid = UUID(payload.id)
        except Exception:
            from uuid import uuid5, NAMESPACE_DNS
            node_uuid = uuid5(NAMESPACE_DNS, f"voltmate:host:{payload.id}")

    discom_cd = DISCOM_STR_TO_CD.get(payload.discomBoard.upper(), 3001)
    oper_stat_cd = 7101 if payload.isOnline else 7103

    await db.execute(
        text(
            """
            INSERT INTO mdm_core.mdm_charging_node (
                node_id, host_party_id, node_cat_cd, discom_board_cd, oper_stat_cd,
                location_geog, pincode_num, rating_avg_num, review_cnt_num
            )
            VALUES (
                :nid, :hid, 7001, :discom, :ostat,
                public.vm_geog_from_lonlat(:lon, :lat), 682030, 5.00, 1
            )
            ON CONFLICT (node_id) DO UPDATE
            SET discom_board_cd = EXCLUDED.discom_board_cd,
                oper_stat_cd = EXCLUDED.oper_stat_cd,
                location_geog = EXCLUDED.location_geog
            """
        ),
        {
            "nid": str(node_uuid),
            "hid": str(PARTY_HOST_ARUN),
            "discom": discom_cd,
            "ostat": oper_stat_cd,
            "lon": float(payload.longitude),
            "lat": float(payload.latitude),
        },
    )

    full_addr = payload.address
    if payload.landmark and payload.landmark not in full_addr:
        full_addr = f"{full_addr} • {payload.landmark}"

    narratives = [
        (8002, payload.title),
        (8003, full_addr),
        (8004, payload.gateInstructions),
        (8006, payload.hostName or "Verified P2P Host"),
        (8007, f"P2P Community Host ({payload.discomBoard}) • {', '.join(payload.amenities)}"),
    ]
    for ntype_cd, ntxt in narratives:
        if ntxt:
            await db.execute(
                text(
                    """
                    INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
                    VALUES (:nid, :nt, 'EN', :txt)
                    ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
                    SET narrative_txt = EXCLUDED.narrative_txt
                    """
                ),
                {"nid": str(node_uuid), "nt": ntype_cd, "txt": ntxt},
            )

    has_covered = any("COVER" in a.upper() for a in payload.amenities)
    has_cctv = any("CCTV" in a.upper() for a in payload.amenities)

    for attr_cd, v_num, v_str in [
        (9003, None, (payload.parkingBayNumber or "BAY-A1")[:48]),
        (9005, Decimal("1") if has_covered else Decimal("0"), "TRUE" if has_covered else "FALSE"),
        (9006, Decimal("1") if has_cctv else Decimal("0"), "TRUE" if has_cctv else "FALSE"),
        (9007, Decimal("1") if payload.autoApproveVerifiedDrivers else Decimal("0"), "TRUE" if payload.autoApproveVerifiedDrivers else "FALSE"),
        (9008, Decimal("1"), "TRUE"),
    ]:
        await db.execute(
            text(
                """
                INSERT INTO mdm_core.kv_entity_attribute (entity_uuid, attr_key_cd, val_num, val_short_code)
                VALUES (:nid, :ak, :vn, :vs)
                ON CONFLICT (entity_uuid, attr_key_cd) DO UPDATE
                SET val_num = EXCLUDED.val_num, val_short_code = EXCLUDED.val_short_code, updated_ts = NOW()
                """
            ),
            {"nid": str(node_uuid), "ak": attr_cd, "vn": v_num, "vs": v_str},
        )

    connectors_to_save = payload.connectors or [HostConnectorSpecPayload()]
    for cspec in connectors_to_save:
        cname_upper = cspec.name.upper()
        if "15A" in cname_upper or "3-PIN" in cname_upper:
            conn_cd = 2001
        elif "CCS" in cname_upper or "DC" in cname_upper:
            conn_cd = 2003
        else:
            conn_cd = 2002

        curr = (
            await db.execute(
                text(
                    """
                    SELECT tariff_sk, energy_rate_inr, rated_power_kw, version_num
                    FROM dw_dim.dim_node_tariff_scd2
                    WHERE node_id = :nid AND conn_type_cd = :ccd AND curr_row_ind = 'Y'
                    LIMIT 1
                    """
                ),
                {"nid": str(node_uuid), "ccd": conn_cd},
            )
        ).mappings().first()

        rate_dec = Decimal(str(round(cspec.pricePerKwh, 2)))
        pkw_dec = Decimal(str(round(cspec.powerKw, 2)))
        park_dec = Decimal(str(round(payload.parkingFeePerHrInr, 2)))

        if not curr:
            await db.execute(
                text(
                    """
                    INSERT INTO dw_dim.dim_node_tariff_scd2 (
                        node_id, conn_type_cd, rated_power_kw, discom_board_cd,
                        energy_rate_inr, parking_rate_hr_inr, eff_start_ts, eff_end_ts, curr_row_ind, version_num
                    )
                    VALUES (
                        :nid, :ccd, :pkw, :discom, :rate, :park,
                        NOW(), '9999-12-31 23:59:59+00', 'Y', 1
                    )
                    """
                ),
                {
                    "nid": str(node_uuid),
                    "ccd": conn_cd,
                    "pkw": pkw_dec,
                    "discom": discom_cd,
                    "rate": rate_dec,
                    "park": park_dec,
                },
            )
        elif Decimal(str(curr["energy_rate_inr"])) != rate_dec or Decimal(str(curr["rated_power_kw"])) != pkw_dec:
            next_ver = int(curr["version_num"]) + 1
            await db.execute(
                text("UPDATE dw_dim.dim_node_tariff_scd2 SET eff_end_ts = NOW(), curr_row_ind = 'N' WHERE tariff_sk = :tsk"),
                {"tsk": curr["tariff_sk"]},
            )
            await db.execute(
                text(
                    """
                    INSERT INTO dw_dim.dim_node_tariff_scd2 (
                        node_id, conn_type_cd, rated_power_kw, discom_board_cd,
                        energy_rate_inr, parking_rate_hr_inr, eff_start_ts, eff_end_ts, curr_row_ind, version_num
                    )
                    VALUES (
                        :nid, :ccd, :pkw, :discom, :rate, :park,
                        NOW(), '9999-12-31 23:59:59+00', 'Y', :ver
                    )
                    """
                ),
                {
                    "nid": str(node_uuid),
                    "ccd": conn_cd,
                    "pkw": pkw_dec,
                    "discom": discom_cd,
                    "rate": rate_dec,
                    "park": park_dec,
                    "ver": next_ver,
                },
            )

    await db.commit()
    return {
        "node_id": str(node_uuid),
        "title": payload.title,
        "isOnline": payload.isOnline,
        "status": "AVAILABLE" if payload.isOnline else "OFFLINE",
    }


@router.patch("/stations/{node_id}/toggle-online")
async def toggle_host_station_online(
    node_id: str,
    is_online: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Instant Online/Offline Toggle for a User-Hosted P2P Station in `mdm_core.mdm_charging_node`.
    """
    try:
        target_uuid = UUID(node_id)
    except Exception:
        from uuid import uuid5, NAMESPACE_DNS
        target_uuid = uuid5(NAMESPACE_DNS, f"voltmate:host:{node_id}")

    if is_online is not None:
        new_stat = 7101 if is_online else 7103
        await db.execute(
            text("UPDATE mdm_core.mdm_charging_node SET oper_stat_cd = :st WHERE node_id = :nid"),
            {"st": new_stat, "nid": str(target_uuid)},
        )
    else:
        await db.execute(
            text(
                """
                UPDATE mdm_core.mdm_charging_node
                SET oper_stat_cd = CASE WHEN oper_stat_cd = 7101 THEN 7103 ELSE 7101 END
                WHERE node_id = :nid
                """
            ),
            {"nid": str(target_uuid)},
        )
    await db.commit()
    return {"node_id": str(target_uuid), "updated": True}


@router.delete("/stations/{node_id}")
async def delete_host_station(
    node_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        target_uuid = UUID(node_id)
    except Exception:
        from uuid import uuid5, NAMESPACE_DNS
        target_uuid = uuid5(NAMESPACE_DNS, f"voltmate:host:{node_id}")

    await db.execute(
        text("UPDATE mdm_core.mdm_charging_node SET oper_stat_cd = 7103 WHERE node_id = :nid"),
        {"nid": str(target_uuid)},
    )
    await db.commit()
    return {"node_id": str(target_uuid), "decommissioned": True}


@router.get("/nodes", response_model=List[ChargingNodeResponse])
async def get_host_nodes(
    host_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    if host_id:
        try:
            UUID(host_id)
            sql = "SELECT * FROM mdm_core.vw_resolved_stations WHERE host_party_id = :hid"
            res = await db.execute(text(sql), {"hid": host_id})
            rows = res.mappings().all()
            if rows:
                return [map_edw_station_row(dict(r)) for r in rows]
        except Exception:
            pass

    res = await db.execute(text("SELECT * FROM mdm_core.vw_resolved_stations ORDER BY rating_avg_num DESC"))
    rows = res.mappings().all()
    return [map_edw_station_row(dict(r)) for r in rows]


@router.post("/nodes", response_model=ChargingNodeResponse)
async def create_charging_node(
    payload: ChargingNodeCreate,
    host_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Inserts a new Charging Station into the normalized 4-schema EDW:
      1. `mdm_core.mdm_charging_node` (codes & geometry only)
      2. `mdm_core.txt_entity_narrative` (title, street address, society, gate instructions, description)
      3. `mdm_core.kv_entity_attribute` (bay code, CCTV, covered parking, IoT, instant book)
      4. `dw_dim.dim_node_tariff_scd2` (SCD Type 2 Version 1 active tariff row)
    """
    target_host_id = PARTY_HOST_ARUN
    if host_id:
        try:
            target_host_id = UUID(host_id)
        except Exception:
            target_host_id = PARTY_HOST_ARUN

    new_node_id = uuid4()
    ncat_cd = NCAT_ENUM_TO_CD.get(payload.node_type, 7001)
    conn_cd = CONN_ENUM_TO_CD.get(payload.connector_type, 2001)
    discom_cd = 3001  # KSEB

    await db.execute(
        text(
            """
            INSERT INTO mdm_core.mdm_charging_node (
                node_id, host_party_id, node_cat_cd, discom_board_cd, oper_stat_cd,
                location_geog, pincode_num, rating_avg_num, review_cnt_num
            )
            VALUES (
                :nid, :hid, :ncat, :discom, 7101,
                public.vm_geog_from_lonlat(:lon, :lat), 682030, 5.00, 1
            )
            """
        ),
        {
            "nid": str(new_node_id),
            "hid": str(target_host_id),
            "ncat": ncat_cd,
            "discom": discom_cd,
            "lon": float(payload.longitude),
            "lat": float(payload.latitude),
        },
    )

    narratives = [
        (8002, payload.title),
        (8003, payload.address_line),
        (8004, payload.gate_instructions or "Show VoltMate Gate Pass at entry."),
        (8006, payload.society_name or "Verified Kerala Host Enclave"),
        (8007, payload.description or f"{payload.power_output_kw} kW Verified EV Charger"),
    ]
    for ntype_cd, ntxt in narratives:
        if ntxt:
            await db.execute(
                text(
                    """
                    INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
                    VALUES (:nid, :nt, 'EN', :txt)
                    ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
                    SET narrative_txt = EXCLUDED.narrative_txt
                    """
                ),
                {"nid": str(new_node_id), "nt": ntype_cd, "txt": ntxt},
            )

    for attr_cd, v_num, v_str in [
        (9003, None, "BAY-NEW"),
        (9005, Decimal("1"), "TRUE"),
        (9006, Decimal("1"), "TRUE"),
        (9007, Decimal("1") if payload.instant_book_enabled else Decimal("0"), "TRUE"),
        (9008, Decimal("1") if payload.is_smart_iot else Decimal("0"), "TRUE"),
    ]:
        await db.execute(
            text(
                """
                INSERT INTO mdm_core.kv_entity_attribute (entity_uuid, attr_key_cd, val_num, val_short_code)
                VALUES (:nid, :ak, :vn, :vs)
                """
            ),
            {"nid": str(new_node_id), "ak": attr_cd, "vn": v_num, "vs": v_str},
        )

    await db.execute(
        text(
            """
            INSERT INTO dw_dim.dim_node_tariff_scd2 (
                node_id, conn_type_cd, rated_power_kw, discom_board_cd,
                energy_rate_inr, parking_rate_hr_inr, eff_start_ts, eff_end_ts, curr_row_ind, version_num
            )
            VALUES (
                :nid, :conn, :pkw, :discom, :einr, :pinr,
                NOW(), '9999-12-31 23:59:59+00', 'Y', 1
            )
            """
        ),
        {
            "nid": str(new_node_id),
            "conn": conn_cd,
            "pkw": Decimal(str(payload.power_output_kw)),
            "discom": discom_cd,
            "einr": payload.price_per_kwh,
            "pinr": payload.parking_fee_per_hr,
        },
    )

    await db.commit()
    res = await db.execute(
        text("SELECT * FROM mdm_core.vw_resolved_stations WHERE node_id = :nid"),
        {"nid": str(new_node_id)},
    )
    row = res.mappings().first()
    return map_edw_station_row(dict(row))


@router.patch("/nodes/{node_id}/tariff")
async def update_charger_tariff_scd2_endpoint(
    node_id: UUID,
    payload: TariffUpdateScd2Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Executes Kimball SCD Type 2 tariff versioning (`update_node_tariff_scd2`):
    Expires the current `dim_node_tariff_scd2` row (`curr_row_ind = 'N'`) and inserts
    the new version (`curr_row_ind = 'Y'`, `version_num + 1`).
    """
    try:
        result = await update_node_tariff_scd2(
            db=db,
            node_id=node_id,
            conn_type_cd=payload.conn_type_cd,
            new_rate_inr=payload.new_energy_rate_inr,
            new_parking_rate_inr=payload.new_parking_rate_hr_inr,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/nodes/{node_id}/pause", response_model=ChargingNodeResponse)
async def toggle_node_pause(
    node_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    SCD Type 1 live operational status switch (`oper_stat_cd`: 7101 Available <-> 7103 Offline).
    """
    await db.execute(
        text(
            """
            UPDATE mdm_core.mdm_charging_node
            SET oper_stat_cd = CASE WHEN oper_stat_cd = 7101 THEN 7103 ELSE 7101 END
            WHERE node_id = :nid
            """
        ),
        {"nid": str(node_id)},
    )
    await db.commit()
    row = (
        await db.execute(
            text("SELECT * FROM mdm_core.vw_resolved_stations WHERE node_id = :nid"),
            {"nid": str(node_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Station node not found in EDW")
    return map_edw_station_row(dict(row))


@router.get("/analytics")
async def get_host_analytics(
    host_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregates real numeric measures directly from `dw_fact.fact_charging_session`
    joined with `dw_dim.dim_date`.
    """
    agg_row = (
        await db.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE session_stat_cd = 4003) AS total_sessions,
                    COALESCE(SUM(delivered_kwh) FILTER (WHERE session_stat_cd = 4003), 0) AS total_kwh,
                    COALESCE(SUM(total_settled_inr) FILTER (WHERE session_stat_cd = 4003), 0) AS total_inr
                FROM dw_fact.fact_charging_session
                """
            )
        )
    ).mappings().first()

    daily_rows = (
        await db.execute(
            text(
                """
                SELECT
                    d.calendar_date,
                    d.day_of_week_num,
                    COALESCE(SUM(f.delivered_kwh), 0) AS kwh,
                    COALESCE(SUM(f.total_settled_inr), 0) AS earnings
                FROM dw_dim.dim_date d
                LEFT JOIN dw_fact.fact_charging_session f
                  ON f.date_sk = d.date_sk AND f.session_stat_cd = 4003
                WHERE d.calendar_date BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
                GROUP BY d.calendar_date, d.day_of_week_num
                ORDER BY d.calendar_date ASC
                """
            )
        )
    ).mappings().all()

    active_cnt = await db.scalar(
        text("SELECT COUNT(*) FROM mdm_core.mdm_charging_node WHERE oper_stat_cd = 7101")
    )

    total_kwh = float(agg_row["total_kwh"] or 0.0)
    total_inr = float(agg_row["total_inr"] or 0.0)
    return {
        "total_sessions": int(agg_row["total_sessions"] or 0),
        "total_kwh_shared": round(total_kwh, 2),
        "total_earnings_inr": round(total_inr, 2),
        "co2_offset_kg": round(total_kwh * 0.82, 2),
        "weekly_chart_data": [
            {
                "date": str(r["calendar_date"]),
                "kwh": float(r["kwh"]),
                "earnings": float(r["earnings"]),
            }
            for r in daily_rows
        ],
        "active_chargers_count": int(active_cnt or 0),
    }


@router.get("/incoming-requests")
async def get_incoming_requests(
    host_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Queries `dw_fact.vw_resolved_sessions` for pending/reserved sessions.
    """
    rows = (
        await db.execute(
            text(
                """
                SELECT *
                FROM dw_fact.vw_resolved_sessions
                WHERE session_stat_cd IN (4005, 4001)
                ORDER BY sched_start_ts ASC
                """
            )
        )
    ).mappings().all()
    return [dict(r) for r in rows]
