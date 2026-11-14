from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from app.models.node import NodeType
from app.models.vehicle import ConnectorType
from app.schemas.node import ChargingNodeResponse
from app.core.validators import validate_latitude, validate_longitude, sanitize_text


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

    @field_validator("latitude")
    @classmethod
    def check_lat(cls, v: float) -> float:
        return validate_latitude(v)

    @field_validator("longitude")
    @classmethod
    def check_lon(cls, v: float) -> float:
        return validate_longitude(v)


class RouteCorridorRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates
    current_soc_percent: float = Field(..., ge=1.0, le=100.0, description="Battery state of charge (1-100%)")
    vehicle_id: Optional[UUID] = None
    battery_capacity_kwh: float = Field(default=40.5, ge=1.0, le=250.0, description="Battery pack capacity in kWh")
    buffer_radius_meters: int = Field(default=2000, ge=500, le=10000, description="Corridor search corridor buffer")


class ElevationPoint(BaseModel):
    distance_km: float
    elevation_meters: float
    latitude: float
    longitude: float


class SocTimelinePoint(BaseModel):
    distance_km: float
    soc_percent: float
    elevation_m: float


class ChargingStopRecommendation(BaseModel):
    node: ChargingNodeResponse
    composite_score: float = Field(default=90.0, description="Multi-factor suitability score 0-100")
    corridor_distance_from_origin_km: float
    deviation_km: float
    suggested_charge_duration_mins: int
    projected_arrival_soc_percent: float


class RouteCorridorResponse(BaseModel):
    total_distance_km: float
    estimated_duration_minutes: float
    total_elevation_gain_meters: float
    initial_soc_percent: float
    projected_destination_soc_percent: float
    recharge_required: bool
    critical_stop_distance_km: float
    polyline_geojson: dict
    elevation_profile: List[ElevationPoint]
    soc_timeline: List[SocTimelinePoint]
    recommended_stops: List[ChargingStopRecommendation]


class KarmaContributeRequest(BaseModel):
    node_id: Optional[UUID] = None
    title: str = Field(..., min_length=3, max_length=150)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    connector_type: ConnectorType = ConnectorType.SOCKET_15A
    is_operational: bool = True
    live_photo_url: Optional[str] = Field(None, max_length=1000)
    queue_wait_minutes: int = Field(default=0, ge=0, le=360, description="Current queue wait time in minutes")
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        san = sanitize_text(v, max_length=150, field_name="Station Title")
        if not san or len(san) < 3:
            raise ValueError("Station title must be at least 3 characters.")
        return san

    @field_validator("latitude")
    @classmethod
    def check_lat(cls, v: float) -> float:
        return validate_latitude(v)

    @field_validator("longitude")
    @classmethod
    def check_lon(cls, v: float) -> float:
        return validate_longitude(v)

    @field_validator("notes")
    @classmethod
    def check_notes(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v, max_length=500, field_name="Notes") if v else None
