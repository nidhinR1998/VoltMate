from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from app.models.node import NodeType
from app.models.vehicle import ConnectorType
from app.schemas.node import ChargingNodeResponse

class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class RouteCorridorRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates
    current_soc_percent: float = Field(..., ge=1, le=100)
    vehicle_id: Optional[UUID] = None
    battery_capacity_kwh: float = Field(default=40.5, gt=0)
    buffer_radius_meters: int = Field(default=2000, ge=500, le=5000)

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
    title: str
    latitude: float
    longitude: float
    connector_type: ConnectorType
    is_operational: bool
    live_photo_url: Optional[str] = None
    queue_wait_minutes: int = 0
    notes: Optional[str] = None
