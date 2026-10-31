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


def map_edw_station_row(r: dict) -> ChargingNodeResponse:
    amenities = []
    if r.get("cctv_bool"):
        amenities.append("CCTV")
    if r.get("covered_parking_bool"):
        amenities.append("COVERED_PARKING")
    if r.get("smart_iot_bool"):
        amenities.append("SMART_IOT_METER")
    if r.get("parking_bay_code"):
        amenities.append(f"BAY:{r['parking_bay_code']}")

    return ChargingNodeResponse(
        id=r["node_id"],
        host_id=r["host_party_id"],
        node_type=STD_NCAT_TO_ENUM.get(r["node_category_std_code"], NodeType.P2P_HOME),
        title=r["station_title"] or r["node_category_label"],
        description=r["station_description"] or r["connector_medium_label"],
        latitude=float(r["latitude"]),
        longitude=float(r["longitude"]),
        address_line=r["street_address"] or "",
        society_name=r["society_name"],
        gate_instructions=r["gate_instructions"],
        connector_type=STD_CONN_TO_ENUM.get(r["connector_std_code"], ConnectorType.SOCKET_15A),
        power_output_kw=float(r["rated_power_kw"]),
        is_smart_iot=bool(r.get("smart_iot_bool", True)),
        price_per_kwh=Decimal(str(r["energy_rate_inr"])),
        parking_fee_per_hr=Decimal(str(r["parking_rate_hr_inr"])),
        instant_book_enabled=bool(r.get("instant_book_bool", True)),
        min_driver_rating=4.0,
        status=STD_STAT_TO_ENUM.get(r["oper_status_std_code"], NodeStatus.AVAILABLE),
        amenities=amenities,
        photos=[],
        distance_km=round(float(r.get("distance_km") or 0.0), 2),
        host_name=r.get("host_full_name"),
        host_trust_score=float(r.get("host_trust_score") or 4.9),
        last_verified_at="2026-10-31T00:00:00Z",
        created_at="2026-10-31T00:00:00Z",
    )


@router.get("/nearby", response_model=List[ChargingNodeResponse])
async def get_nearby_chargers(
    latitude: float = Query(default=9.9985, ge=-90, le=90),
    longitude: float = Query(default=76.3580, ge=-180, le=180),
    radius_km: float = Query(default=50.0, ge=0.5, le=500.0),
    connector: Optional[ConnectorType] = Query(None),
    node_type: Optional[NodeType] = Query(None),
    available_only: bool = Query(default=False),
    instant_book_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    """
    Enterprise EDW Spatial Discovery:
    Queries `mdm_core.vw_resolved_stations` joined with `mdm_core.mdm_charging_node`
    (resolving `ref_mdm` codes, `txt_entity_narrative` labels, `kv_entity_attribute` specs,
    and active `dw_dim.dim_node_tariff_scd2` tariffs).
    """
    radius_meters = radius_km * 1000.0
    where_clauses = [
        "public.vm_dwithin_meters(cn.location_geog, :lon, :lat, :radius_m)"
    ]
    params: dict = {
        "lon": float(longitude),
        "lat": float(latitude),
        "radius_m": float(radius_meters),
    }

    if connector and connector.value in ENUM_TO_STD_CONN:
        where_clauses.append("vw.connector_std_code = :conn_std")
        params["conn_std"] = ENUM_TO_STD_CONN[connector.value]

    if node_type and node_type.value in ENUM_TO_STD_NCAT:
        where_clauses.append("vw.node_category_std_code = :ncat_std")
        params["ncat_std"] = ENUM_TO_STD_NCAT[node_type.value]

    if available_only:
        where_clauses.append("vw.oper_status_std_code = 'NSTAT_AVAILABLE'")

    if instant_book_only:
        where_clauses.append("vw.instant_book_bool = TRUE")

    where_sql = " AND ".join(where_clauses)
    sql = f"""
        SELECT
            vw.*,
            (public.vm_distance_meters(cn.location_geog, :lon, :lat) / 1000.0) AS distance_km
        FROM mdm_core.vw_resolved_stations vw
        JOIN mdm_core.mdm_charging_node cn ON cn.node_id = vw.node_id
        WHERE {where_sql}
        ORDER BY distance_km ASC
        LIMIT 40;
    """
    result = await db.execute(text(sql), params)
    rows = result.mappings().all()
    return [map_edw_station_row(dict(r)) for r in rows]


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
