import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_edw import bootstrap_voltmate_edw
from app.services.redis_service import redis_service
from app.services.ocpp_mqtt import hardware_broker

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.discovery import router as discovery_router, get_nearby_chargers
from app.api.v1.bookings import router as bookings_router
from app.api.v1.host import router as host_router, create_charging_node
from app.api.v1.edw import router as edw_router
from app.api.v1.ws import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voltmate.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⚡ Initializing VoltMate Enterprise IBM MDM + Kimball EDW Ecosystem...")
    await redis_service.connect()
    hardware_broker.initialize()

    edw_counts = await bootstrap_voltmate_edw()
    logger.info(f"PostgreSQL 18 EDW (`{settings.POSTGRES_DB}`) verified: {edw_counts}")

    yield

    logger.info("Shutting down VoltMate services...")
    await redis_service.close()


app = FastAPI(
    title=f"{settings.APP_NAME} — Enterprise IBM MDM + Kimball EDW",
    version="2.0.0",
    description="India-Specific Peer-to-Peer EV Charger Sharing Platform backed by 4-Schema PostgreSQL EDW (ref_mdm, mdm_core, dw_dim, dw_fact)",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if "/auth/" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    return response


# Mount Primary Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(discovery_router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings_router, prefix=settings.API_V1_PREFIX)
app.include_router(host_router, prefix=settings.API_V1_PREFIX)
app.include_router(edw_router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_router)

# Mobile Sync Compatibility Routes (/api/v1/chargers/nearby & /api/v1/hosts/chargers)
app.add_api_route(
    f"{settings.API_V1_PREFIX}/chargers/nearby",
    get_nearby_chargers,
    methods=["GET"],
    tags=["Mobile Engine EDW Sync"],
)
app.add_api_route(
    f"{settings.API_V1_PREFIX}/hosts/chargers",
    create_charging_node,
    methods=["POST"],
    tags=["Mobile Engine EDW Sync"],
)


@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "database": settings.POSTGRES_DB,
        "schemas": ["ref_mdm", "mdm_core", "dw_dim", "dw_fact"],
        "environment": settings.APP_ENV,
        "redis_connected": redis_service.client is not None,
        "mqtt_connected": hardware_broker.is_connected,
        "currency": "INR",
    }


@app.get("/", tags=["System Root"])
async def root():
    return {
        "message": "Welcome to VoltMate — Enterprise IBM MDM + Kimball EDW Backend",
        "api_docs": "/docs",
        "schemas": ["ref_mdm", "mdm_core", "dw_dim", "dw_fact"],
        "endpoints": {
            "edw": f"{settings.API_V1_PREFIX}/edw",
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "discovery": f"{settings.API_V1_PREFIX}/discovery",
            "bookings": f"{settings.API_V1_PREFIX}/bookings",
            "host": f"{settings.API_V1_PREFIX}/host",
            "telemetry_ws": "/ws/session/{booking_id}",
        }
    }
