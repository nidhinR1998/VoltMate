import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
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
    logger.info("⚡ Initializing VoltMate Backend Ecosystem...")
    await redis_service.connect()
    hardware_broker.initialize()

    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
            await conn.run_sync(Base.metadata.create_all)
            logger.info("PostgreSQL & PostGIS schema verified successfully.")
    except Exception as e:
        logger.warning(f"Database auto-migration skipped or deferred to Alembic: {e}")

    yield

    logger.info("Shutting down VoltMate services...")
    await redis_service.close()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="India-Specific Peer-to-Peer EV Charger Sharing, Route Matching & Public Grid Aggregation Platform",
    lifespan=lifespan
)

# CORS middleware configured securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:19006", "http://127.0.0.1:8081"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
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


# Mount Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(discovery_router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings_router, prefix=settings.API_V1_PREFIX)
app.include_router(host_router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_router)


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
