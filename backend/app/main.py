import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine, Base
from app.services.redis_service import redis_service
from app.services.ocpp_mqtt import hardware_broker

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.discovery import router as discovery_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.host import router as host_router
from app.api.v1.ws import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voltmate.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("⚡ Initializing VoltMate Backend Ecosystem...")

    # Connect Redis
    await redis_service.connect()

    # Initialize Mosquitto MQTT hardware broker
    hardware_broker.initialize()

    # Initialize PostGIS extension & tables if running standalone
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
            await conn.run_sync(Base.metadata.create_all)
            logger.info("PostgreSQL & PostGIS schema verified successfully.")
    except Exception as e:
        logger.warning(f"Database auto-migration skipped or deferred to Alembic: {e}")

    yield

    # Shutdown sequence
    logger.info("Shutting down VoltMate services...")
    await redis_service.close()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="India-Specific Peer-to-Peer EV Charger Sharing, Route Matching & Public Grid Aggregation Platform",
    lifespan=lifespan
)

# Open CORS for cross-platform Expo React Native clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(discovery_router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings_router, prefix=settings.API_V1_PREFIX)
app.include_router(host_router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_router) # WebSocket mount

@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "redis_connected": redis_service.client is not None,
        "mqtt_connected": hardware_broker.is_connected,
        "currency": "INR",
        "zero_cost_mode": True
    }

@app.get("/", tags=["System Root"])
async def root():
    return {
        "message": "Welcome to VoltMate — Share the Spark. Power the Journey.",
        "api_docs": "/docs",
        "endpoints": {
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "discovery": f"{settings.API_V1_PREFIX}/discovery",
            "bookings": f"{settings.API_V1_PREFIX}/bookings",
            "host": f"{settings.API_V1_PREFIX}/host",
            "telemetry_ws": "/ws/session/{booking_id}"
        }
    }

