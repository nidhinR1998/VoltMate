import logging
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.models.vehicle import VehicleCategory
from app.schemas.vehicle import VehicleResponse
from app.schemas.common import ApiResponse
from app.core.validators import validate_vehicle_plate, sanitize_text
from app.api.v1.auth import get_optional_current_user

logger = logging.getLogger("voltmate.api.vehicles")
router = APIRouter(tags=["Vehicles & Garage Management"])


class MobileVehiclePayload(BaseModel):
    make_model: Optional[str] = None
    plate_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    registration_number: Optional[str] = None
    battery_capacity_kwh: float = Field(default=40.5, ge=1.0, le=250.0)
    max_ac_power_kw: float = Field(default=3.3, ge=1.0, le=44.0)
    category: Optional[VehicleCategory] = VehicleCategory.FOUR_WHEELER
    connector_types: List[str] = Field(default_factory=lambda: ["TYPE_2", "SOCKET_15A"])
    is_primary: bool = True


@router.post("", response_model=ApiResponse[VehicleResponse], status_code=status.HTTP_201_CREATED)
async def register_vehicle(
    payload: MobileVehiclePayload = Body(...),
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new EV in the user's garage.
    Normalizes Indian RTO plate and updates Kimball SCD2 dimension `dw_dim.dim_vehicle_scd2`.
    """
    # Resolve fields (supports both standard schema and mobile engine payload)
    raw_plate = payload.plate_number or payload.registration_number or "KL-07-EV-1001"
    clean_plate = validate_vehicle_plate(raw_plate)

    full_name = payload.make_model or ""
    if payload.make and payload.model:
        make = sanitize_text(payload.make, 50, "Make")
        model = sanitize_text(payload.model, 50, "Model")
    elif " " in full_name:
        parts = full_name.split(" ", 1)
        make = sanitize_text(parts[0], 50, "Make")
        model = sanitize_text(parts[1], 50, "Model")
    else:
        make = sanitize_text(full_name or "Tata", 50, "Make")
        model = "EV"

    veh_title = f"{make} {model}".strip()
    user_id = current_user["party_id"] if current_user else uuid.UUID("11111111-1111-4111-8111-111111111101")
    veh_id = uuid.uuid4()

    # Determine EDW category & connector codes
    vcat_cd = 5011 if payload.category == VehicleCategory.TWO_WHEELER else 5010
    vmodel_cd = 5001  # Reference default
    conn_cd = 2002    # Type 2 AC

    # Insert into EDW SCD2 dimension dw_dim.dim_vehicle_scd2
    await db.execute(
        text(
            """
            INSERT INTO dw_dim.dim_vehicle_scd2 (
                vehicle_id, owner_party_id, veh_cat_cd, veh_model_cd, prim_conn_type_cd,
                battery_cap_kwh, max_ac_kw, is_primary_ind, eff_start_ts, eff_end_ts, curr_row_ind, version_num
            )
            VALUES (
                :vid, :pid, :vcat, :vmod, :pconn,
                :kwh, :max_ac, :is_prim, NOW(), '9999-12-31 23:59:59+00', 'Y', 1
            )
            ON CONFLICT (vehicle_id) WHERE curr_row_ind = 'Y' DO NOTHING
            """
        ),
        {
            "vid": str(veh_id),
            "pid": str(user_id),
            "vcat": vcat_cd,
            "vmod": vmodel_cd,
            "pconn": conn_cd,
            "kwh": payload.battery_capacity_kwh,
            "max_ac": payload.max_ac_power_kw,
            "is_prim": "Y" if payload.is_primary else "N",
        },
    )

    # Insert RC Plate into mdm_core.kv_entity_attribute (key 9002 = RC Plate)
    await db.execute(
        text(
            """
            INSERT INTO mdm_core.kv_entity_attribute (entity_uuid, attr_key_cd, val_num, val_short_code)
            VALUES (:vid, 9002, NULL, :plate)
            ON CONFLICT (entity_uuid, attr_key_cd) DO UPDATE SET val_short_code = EXCLUDED.val_short_code
            """
        ),
        {"vid": str(veh_id), "plate": clean_plate},
    )

    # Insert Title into mdm_core.txt_entity_narrative (type 8001 = Name/Title)
    await db.execute(
        text(
            """
            INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
            VALUES (:vid, 8001, 'EN', :txt)
            ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE SET narrative_txt = EXCLUDED.narrative_txt
            """
        ),
        {"vid": str(veh_id), "txt": veh_title},
    )

    await db.commit()

    resp_data = VehicleResponse(
        id=veh_id,
        user_id=user_id,
        category=payload.category or VehicleCategory.FOUR_WHEELER,
        make=make,
        model=model,
        registration_number=clean_plate,
        rc_verified=True,
        battery_capacity_kwh=payload.battery_capacity_kwh,
        max_ac_power_kw=payload.max_ac_power_kw,
        connector_types=payload.connector_types,
        is_primary=payload.is_primary,
        created_at=datetime.now(timezone.utc),
    )

    return ApiResponse.created(
        data=resp_data,
        message=f"{make} {model} ({clean_plate}) registered successfully in garage."
    )


@router.get("", response_model=ApiResponse[List[VehicleResponse]])
async def list_vehicles(
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all active vehicles for the authenticated user from Kimball EDW view.
    """
    user_id = current_user["party_id"] if current_user else uuid.UUID("11111111-1111-4111-8111-111111111101")
    rows = (
        await db.execute(
            text(
                """
                SELECT v.vehicle_id, v.owner_party_id, v.vehicle_category_label, v.vehicle_model_name,
                       v.primary_connector_label, v.battery_cap_kwh, v.max_ac_kw, v.is_primary_ind,
                       v.rc_plate_code, n.narrative_txt AS vehicle_title
                FROM dw_dim.vw_resolved_vehicles v
                LEFT JOIN mdm_core.txt_entity_narrative n
                  ON n.entity_uuid = v.vehicle_id AND n.narrative_type_cd = 8001 AND n.lang_cd = 'EN'
                WHERE v.owner_party_id = :pid
                """
            ),
            {"pid": str(user_id)},
        )
    ).mappings().all()

    items = []
    for r in rows:
        title = r.get("vehicle_title") or r.get("vehicle_model_name") or "EV"
        make = "Tata" if "Tata" in title else "EV"
        model = title.replace(make, "").strip() or "Standard"
        items.append(
            VehicleResponse(
                id=r["vehicle_id"],
                user_id=r["owner_party_id"],
                category=VehicleCategory.FOUR_WHEELER,
                make=make,
                model=model,
                registration_number=r.get("rc_plate_code") or "KL-07-EV-0001",
                rc_verified=True,
                battery_capacity_kwh=float(r["battery_cap_kwh"]),
                max_ac_power_kw=float(r["max_ac_kw"]),
                connector_types=[r.get("primary_connector_label") or "TYPE_2"],
                is_primary=(r["is_primary_ind"] == "Y"),
                created_at=datetime.now(timezone.utc),
            )
        )

    return ApiResponse.ok(
        data=items,
        message=f"Retrieved {len(items)} active vehicles from EDW."
    )
