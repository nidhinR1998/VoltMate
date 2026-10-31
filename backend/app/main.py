import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
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


@app.api_route("/health", methods=["GET", "HEAD"], tags=["System Health"])
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


@app.api_route("/", methods=["GET", "HEAD"], tags=["System Root"])
async def root():
    return {
        "message": "Welcome to VoltMate — Enterprise IBM MDM + Kimball EDW Backend",
        "domain": "https://api.voltmate.co.in",
        "web_url": "https://voltmate.co.in",
        "privacy_policy": "https://voltmate.co.in/privacy",
        "terms_of_service": "https://voltmate.co.in/terms",
        "api_docs": "https://api.voltmate.co.in/docs",
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


@app.get("/privacy", response_class=HTMLResponse, tags=["Legal & Compliance"])
async def privacy_policy():
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>VoltMate Privacy Policy</title></head>
<body style="font-family:sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;">
<h1>VoltMate Privacy Policy</h1>
<p>VoltMate ("we", "our") operates https://voltmate.co.in and the VoltMate Android application.</p>
<p>We collect only your Google account email, display name, and EV charging reservation details to provide peer-to-peer and public EV charging services across India. We never sell or share your personal data with third parties.</p>
<p>Contact: auravaultofficialteam@gmail.com</p>
</body></html>"""


@app.get("/terms", response_class=HTMLResponse, tags=["Legal & Compliance"])
async def terms_of_service():
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>VoltMate Terms of Service</title></head>
<body style="font-family:sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;">
<h1>VoltMate Terms of Service</h1>
<p>By using VoltMate (https://voltmate.co.in), you agree to abide by KSEB/MoP EV tariff guidelines, respect residential host parking rules, and settle charging invoices fairly via UPI or VoltMate Wallet.</p>
<p>Contact: auravaultofficialteam@gmail.com</p>
</body></html>"""
