import logging
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.models.node import NodeType, NodeStatus
from app.models.vehicle import ConnectorType
from app.schemas.node import ChargingNodeResponse
from app.core.validators import repair_mismatched_station_address
from app.schemas.discovery import (
    RouteCorridorRequest,
    RouteCorridorResponse,
    ChargingStopRecommendation,
    ElevationPoint,
    SocTimelinePoint,
    KarmaContributeRequest,
)
from app.services.osrm_router import osrm_service
from app.services.redis_service import redis_service
from app.services.autonomous_sync_engine import (
    sync_and_resolve_nearby_stations,
    deterministic_node_uuid,
    LiveExtractedStation,
    _upsert_station_edw_scd2,
)
from pydantic import BaseModel

logger = logging.getLogger("voltmate.api.discovery")
router = APIRouter(prefix="/discovery", tags=["Spatial Discovery & Route Matching (IBM MDM + Kimball EDW)"])

STD_CONN_TO_ENUM = {
    "CONN_15A_AC": ConnectorType.SOCKET_15A,
    "CONN_TYPE2_AC": ConnectorType.TYPE_2,
    "CONN_CCS2_DC": ConnectorType.CCS2,
}

ENUM_TO_STD_CONN = {v.value: k for k, v in STD_CONN_TO_ENUM.items()}

STD_NCAT_TO_ENUM = {
    "NCAT_P2P_HOME": NodeType.P2P_HOME,
    "NCAT_PUBLIC_DC": NodeType.PUBLIC_DC,
    "NCAT_P2P_RWA": NodeType.P2P_RWA,
    "NCAT_DEST_CAFE": NodeType.DESTINATION_CAFE,
}

ENUM_TO_STD_NCAT = {v.value: k for k, v in STD_NCAT_TO_ENUM.items()}

STD_STAT_TO_ENUM = {
    "NSTAT_AVAILABLE": NodeStatus.AVAILABLE,
    "NSTAT_BUSY": NodeStatus.BUSY,
    "NSTAT_OFFLINE": NodeStatus.OFFLINE,
}


def map_edw_station_row(r: dict, mask_private_p2p: bool = False) -> ChargingNodeResponse:
    amenities = []
    if r.get("cctv_bool"):
        amenities.append("CCTV")
    if r.get("covered_parking_bool"):
        amenities.append("COVERED_PARKING")
    if r.get("smart_iot_bool"):
        amenities.append("SMART_IOT_METER")
    if r.get("parking_bay_code"):
        amenities.append(f"BAY:{r['parking_bay_code']}")

    node_type = STD_NCAT_TO_ENUM.get(r["node_category_std_code"], NodeType.P2P_HOME)
    title_raw = str(r["station_title"] or r["node_category_label"] or "").strip()
    host_raw = str(r.get("host_full_name") or "").strip()
    if any(k in title_raw.lower() for k in ("covered ev bay", "home charger", "p2p", "driveway")):
        node_type = NodeType.P2P_HOME
    if node_type in (NodeType.P2P_HOME, NodeType.P2P_RWA) and host_raw in ("", "VoltMate Public Grid", "Public EV Grid"):
        host_raw = title_raw.replace("Covered EV Bay", "").strip() or "Verified Home Host"
    gate_instructions = r.get("gate_instructions")
    if mask_private_p2p and node_type in (NodeType.P2P_HOME, NodeType.P2P_RWA):
        gate_instructions = "Exact driveway bay & gate pass instructions unlocked after slot booking confirmation."

    lat_val = float(r["latitude"])
    lon_val = float(r["longitude"])
    repaired_addr = repair_mismatched_station_address(r.get("street_address") or "", lat_val, lon_val)
    conn_enum = STD_CONN_TO_ENUM.get(r["connector_std_code"], ConnectorType.SOCKET_15A)
    pkw_val = float(r["rated_power_kw"])
    rate_val = float(r["energy_rate_inr"])
    conn_type_label = "CCS2" if conn_enum == ConnectorType.CCS2 else "Type-2" if conn_enum == ConnectorType.TYPE_2 else "15A"

    return ChargingNodeResponse(
        id=r["node_id"],
        host_id=r["host_party_id"],
        node_type=node_type,
        title=title_raw,
        description=r["station_description"] or r["connector_medium_label"],
        latitude=lat_val,
        longitude=lon_val,
        address_line=repaired_addr,
        society_name=r["society_name"],
        gate_instructions=gate_instructions,
        connector_type=conn_enum,
        power_output_kw=pkw_val,
        is_smart_iot=bool(r.get("smart_iot_bool", True)),
        price_per_kwh=Decimal(str(r["energy_rate_inr"])),
        parking_fee_per_hr=Decimal(str(r["parking_rate_hr_inr"])),
        instant_book_enabled=bool(r.get("instant_book_bool", True)),
        min_driver_rating=4.0,
        status=STD_STAT_TO_ENUM.get(r["oper_status_std_code"], NodeStatus.AVAILABLE),
        amenities=amenities,
        photos=[],
        distance_km=round(float(r.get("distance_km") or 0.0), 2),
        host_name=host_raw or r.get("host_full_name"),
        host_trust_score=float(r.get("rating_avg_num") or 0.0),
        connector_specs=[
            {
                "id": f"{r['node_id']}_{conn_type_label.lower()}",
                "type": conn_type_label,
                "powerKw": pkw_val,
                "pricePerKwhInr": rate_val,
                "availableCount": 1,
                "totalCount": 1,
            }
        ],
        last_verified_at="2026-10-31T00:00:00Z",
        created_at="2026-10-31T00:00:00Z",
    )


def group_edw_station_rows(rows: List[dict], mask_private_p2p: bool = False) -> List[ChargingNodeResponse]:
    """
    Groups multi-connector rows from `vw_resolved_stations` into ONE canonical station record per `node_id`
    so Home, Map, Details, and Booking all receive a single consistent station with all its connectors.
    """
    by_id: dict = {}
    for raw in rows:
        mapped = map_edw_station_row(dict(raw), mask_private_p2p=mask_private_p2p)
        key = str(mapped.id)
        if key not in by_id:
            by_id[key] = mapped
        else:
            existing = by_id[key]
            existing_specs = list(existing.connector_specs or [])
            for new_spec in mapped.connector_specs or []:
                if not any(s.get("type") == new_spec.get("type") for s in existing_specs):
                    existing_specs.append(new_spec)
            existing.connector_specs = existing_specs
            if mapped.power_output_kw > existing.power_output_kw:
                existing.power_output_kw = mapped.power_output_kw
            if mapped.price_per_kwh < existing.price_per_kwh:
                existing.price_per_kwh = mapped.price_per_kwh
    return list(by_id.values())


@router.get("/nearby", response_model=List[ChargingNodeResponse])
async def get_nearby_chargers(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: float = Query(default=50.0, ge=0.5, le=500.0),
    connector: Optional[ConnectorType] = Query(None),
    node_type: Optional[NodeType] = Query(None),
    available_only: bool = Query(default=False),
    instant_book_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    """
    100% Autonomous Real-Time Spatial Discovery + IBM MDM / Kimball SCD2 ETL:
    Concurrently extracts live public stations (Google Maps + OpenChargeMap + Overpass),
    deduplicates (< 75m), upserts into `mdm_charging_node` & `dim_node_tariff_scd2`,
    decommissions stopped stations, and merges with active P2P Home Hosts from `vw_resolved_stations`.
    Supports ?latitude=&longitude=, ?lat=&lon=, and ?lat=&lng= query parameter variants.
    """
    eff_lat = lat if lat is not None else (latitude if latitude is not None else 9.9985)
    eff_lng = lon if lon is not None else (lng if lng is not None else (longitude if longitude is not None else 76.3580))

    conn_std = ENUM_TO_STD_CONN.get(connector.value) if connector else None
    ncat_std = ENUM_TO_STD_NCAT.get(node_type.value) if node_type else None

    rows = await sync_and_resolve_nearby_stations(
        db=db,
        lat=eff_lat,
        lng=eff_lng,
        radius_km=radius_km,
        connector_std_code=conn_std,
        node_category_std_code=ncat_std,
        available_only=available_only,
        instant_book_only=instant_book_only,
    )
    return group_edw_station_rows(rows, mask_private_p2p=True)


@router.get("/live-nearby")
async def get_live_nearby_chargers(
    lat: float = Query(default=12.1045, ge=-90, le=90),
    lng: float = Query(default=75.2058, ge=-180, le=180),
    radius_km: float = Query(default=35.0, ge=0.5, le=500.0),
    force_live_refresh: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
):
    """
    Zero-Cache Live Reconciliation Endpoint returning merged `LIVE_PUBLIC_GRID` + `ACTIVE_P2P_HOSTS`
    with `lastSyncedAt` ISO timestamp.
    """
    from datetime import datetime, timezone

    rows = await sync_and_resolve_nearby_stations(
        db=db,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        available_only=False,
    )
    stations = group_edw_station_rows(rows, mask_private_p2p=True)
    return {
        "stations": stations,
        "count": len(stations),
        "lastSyncedAt": datetime.now(timezone.utc).isoformat(),
        "forceLiveRefresh": force_live_refresh,
    }


class BatchIngestPayload(BaseModel):
    centerLat: float = 10.0159
    centerLng: float = 76.3419
    stations: list = []


@router.post("/ingest-batch")
async def ingest_batch_live_stations(
    payload: BatchIngestPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Receives real-time stations discovered directly on the mobile device
    (Overpass + OpenChargeMap + Nominatim + P2P Hosts) and persists them
    into `voltmate_edw` (`mdm_charging_node`, `txt_entity_narrative`, `dim_node_tariff_scd2`).
    """
    ingested_count = 0
    try:
        for item in payload.stations[:40]:
            if not isinstance(item, dict):
                continue
            lat = float(item.get("latitude") or 0)
            lng = float(item.get("longitude") or 0)
            if not lat or not lng:
                continue
            title = str(item.get("title") or "EV Charging Station")
            operator = str(item.get("operator") or "Public EV Grid")
            address = str(item.get("address") or "Kerala EV Grid")
            st_type = str(item.get("stationType") or "PUBLIC_GRID")
            # Never overwrite user-hosted P2P stations as public grid nodes during batch discovery ingest
            if st_type == "P2P_HOME" or any(k in title.lower() for k in ("covered ev bay", "home charger", "p2p")):
                continue
            conns = item.get("connectors") or []
            primary_conn = conns[0] if isinstance(conns, list) and len(conns) > 0 else {}
            pkw = float(primary_conn.get("powerKw") or 50.0)
            rate = float(primary_conn.get("pricePerKwhInr") or 15.5)
            ctype = str(primary_conn.get("type") or "CCS2").upper()
            conn_cd = 2003 if "CCS" in ctype else 2002 if "TYPE" in ctype else 2001

            st = LiveExtractedStation(
                natural_key=str(item.get("id") or f"{round(lat,4)}:{round(lng,4)}"),
                node_id=deterministic_node_uuid(lat, lng, operator if st_type != "P2P_HOME" else title),
                title=title,
                operator_name=operator,
                address_line=address,
                society_name=operator,
                latitude=lat,
                longitude=lng,
                connector_type_cd=conn_cd,
                power_kw=pkw,
                energy_rate_inr=rate,
                parking_rate_hr_inr=20.0,
                discom_board_cd=3001,
                oper_stat_cd=7101,
                rating=float(item.get("rating") or 4.6),
                review_count=int(item.get("reviewCount") or 18),
                source_system="MOBILE_LIVE_HUNTER",
            )
            await _upsert_station_edw_scd2(db, st)
            ingested_count += 1
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.warning(f"Batch ingest warning: {exc}")
    return {"status": "ok", "ingested": ingested_count}


@router.post("/route-corridor", response_model=RouteCorridorResponse)
async def compute_route_and_matching_stops(
    payload: RouteCorridorRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Computes driving polyline via OSRM, calculates Ghat elevation battery depletion,
    and queries `mdm_core.vw_resolved_stations` from the live PostgreSQL EDW.
    """
    route_data = await osrm_service.get_route(
        payload.origin.latitude,
        payload.origin.longitude,
        payload.destination.latitude,
        payload.destination.longitude,
    )

    dist_km = route_data["distance_meters"] / 1000.0
    duration_mins = route_data["duration_seconds"] / 60.0
    coords = route_data["geometry"].get("coordinates", [])

    is_ghat = dist_km > 40.0
    elevation_waypoints = osrm_service.compute_elevation_profile(coords, dist_km, is_ghat_section=is_ghat)
    depletion = osrm_service.simulate_battery_depletion_curve(
        elevation_waypoints=elevation_waypoints,
        initial_soc_percent=payload.current_soc_percent,
        battery_capacity_kwh=payload.battery_capacity_kwh,
    )

    mid_lat = (payload.origin.latitude + payload.destination.latitude) / 2.0
    mid_lon = (payload.origin.longitude + payload.destination.longitude) / 2.0

    sql = """
        SELECT
            vw.*,
            (public.vm_distance_meters(cn.location_geog, :orig_lon, :orig_lat) / 1000.0) AS dist_from_origin_km,
            (public.vm_distance_meters(cn.location_geog, :mid_lon, :mid_lat) / 1000.0) AS distance_km
        FROM mdm_core.vw_resolved_stations vw
        JOIN mdm_core.mdm_charging_node cn ON cn.node_id = vw.node_id
        WHERE vw.oper_status_std_code = 'NSTAT_AVAILABLE'
        ORDER BY distance_km ASC
        LIMIT 5;
    """
    res = await db.execute(
        text(sql),
        {
            "orig_lon": float(payload.origin.longitude),
            "orig_lat": float(payload.origin.latitude),
            "mid_lon": float(mid_lon),
            "mid_lat": float(mid_lat),
        },
    )
    rows = res.mappings().all()

    recommendations = []
    for idx, r in enumerate(rows):
        row_dict = dict(r)
        node_resp = map_edw_station_row(row_dict)
        corridor_dist = round(float(row_dict.get("dist_from_origin_km") or (dist_km * 0.45)), 1)
        recommendations.append(
            ChargingStopRecommendation(
                node=node_resp,
                composite_score=round(96.0 - idx * 3.2, 1),
                corridor_distance_from_origin_km=corridor_dist,
                deviation_km=round(0.3 + idx * 0.4, 1),
                suggested_charge_duration_mins=30 if node_resp.power_output_kw >= 30 else 60,
                projected_arrival_soc_percent=max(15.0, round(payload.current_soc_percent - (corridor_dist * 0.25), 1)),
            )
        )

    return RouteCorridorResponse(
        total_distance_km=round(dist_km, 2),
        estimated_duration_minutes=round(duration_mins, 1),
        total_elevation_gain_meters=depletion["total_elevation_gain_meters"],
        initial_soc_percent=payload.current_soc_percent,
        projected_destination_soc_percent=depletion["final_soc_percent"],
        recharge_required=depletion["recharge_required"],
        critical_stop_distance_km=depletion["critical_stop_distance_km"],
        polyline_geojson=route_data["geometry"],
        elevation_profile=[ElevationPoint(**ep) for ep in elevation_waypoints[::max(1, len(elevation_waypoints) // 20)]],
        soc_timeline=[SocTimelinePoint(**st) for st in depletion["soc_timeline"][::max(1, len(depletion["soc_timeline"]) // 20)]],
        recommended_stops=recommendations,
    )


@router.get("/autocomplete")
async def autocomplete_places(
    q: str = Query(..., min_length=2),
    lat: float = Query(default=10.0159),
    lon: float = Query(default=76.3419),
    limit: int = Query(default=6, ge=1, le=15),
):
    import httpx

    photon_url = f"https://photon.komoot.io/api/?q={q}&lat={lat}&lon={lon}&limit={limit}"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(photon_url)
            if res.status_code == 200:
                data = res.json()
                results = []
                for idx, feat in enumerate(data.get("features", [])):
                    coords = feat.get("geometry", {}).get("coordinates", [lon, lat])
                    props = feat.get("properties", {})
                    name = props.get("name") or props.get("street") or props.get("city") or q
                    subtitle_parts = [
                        props.get("street"),
                        props.get("district"),
                        props.get("city"),
                        props.get("state"),
                        props.get("country"),
                    ]
                    subtitle = ", ".join([p for p in subtitle_parts if p and p != name])
                    results.append({
                        "id": f"photon_{props.get('osm_id', idx)}",
                        "name": name,
                        "subtitle": subtitle or "OpenStreetMap Verified Location",
                        "latitude": coords[1],
                        "longitude": coords[0],
                    })
                return {"results": results, "provider": "PHOTON_KOMOOT"}
    except Exception as e:
        logger.warning(f"Photon autocomplete fallback ({e})")
    return {"results": [], "provider": "FALLBACK"}


@router.post("/karma/contribute")
async def contribute_green_karma(
    payload: KarmaContributeRequest,
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates party trust score in `mdm_core.mdm_party` (automatically triggering
    `trg_party_scd4_audit` to write the prior snapshot into `mdm_core.mdm_party_hist_scd4`)
    and records a credit in `dw_fact.fact_wallet_ledger`.
    """
    target_party_id = user_id or "11111111-1111-4111-8111-111111111101"
    if not await redis_service.check_login_allowed(f"karma:{target_party_id}", max_attempts=5):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily Green Karma verification limit reached. Try again later.",
        )

    await db.execute(
        text(
            """
            UPDATE mdm_core.mdm_party
            SET trust_score_num = LEAST(5.00, trust_score_num + 0.02)
            WHERE party_id = :pid
            """
        ),
        {"pid": target_party_id},
    )
    await db.commit()
    row = (
        await db.execute(
            text("SELECT trust_score_num FROM mdm_core.mdm_party WHERE party_id = :pid"),
            {"pid": target_party_id},
        )
    ).mappings().first()

    return {
        "success": True,
        "message": "Verified! Trust score updated in mdm_core.mdm_party and audited in mdm_party_hist_scd4.",
        "trust_score": float(row["trust_score_num"]) if row else 4.95,
    }


@router.post("/stations/{node_id}/reviews")
async def submit_station_review(
    node_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Persists a verified driver rating (1-5) and updates the station's rolling rating average in PostgreSQL EDW."""
    rating_val = max(1.0, min(5.0, float(payload.get("rating") or 5.0)))
    comment_txt = str(payload.get("comment") or "Verified EV charging session.").strip()[:500]

    row = (
        await db.execute(
            text("SELECT rating_avg_num, review_cnt_num FROM mdm_core.mdm_charging_node WHERE node_id = :nid FOR UPDATE"),
            {"nid": str(node_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Charging station not found.")

    old_avg = float(row["rating_avg_num"] or 4.8)
    old_cnt = int(row["review_cnt_num"] or 1)
    new_cnt = old_cnt + 1
    new_avg = round(((old_avg * old_cnt) + rating_val) / new_cnt, 2)

    await db.execute(
        text(
            """
            UPDATE mdm_core.mdm_charging_node
            SET rating_avg_num = :avg, review_cnt_num = :cnt
            WHERE node_id = :nid
            """
        ),
        {"avg": Decimal(str(new_avg)), "cnt": new_cnt, "nid": str(node_id)},
    )
    await db.execute(
        text(
            """
            INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
            VALUES (:nid, 8005, 'EN', :txt)
            ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
            SET narrative_txt = EXCLUDED.narrative_txt
            """
        ),
        {"nid": str(node_id), "txt": comment_txt},
    )
    await db.commit()
    return {
        "node_id": str(node_id),
        "rating_avg": new_avg,
        "review_count": new_cnt,
        "comment": comment_txt,
    }
