import unittest
import math
import inspect
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import sys
import os
import types
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def _install_local_test_shims_if_needed():
    """Provides lightweight test shims when optional server wheels (sqlalchemy/fastapi/pydantic) are absent locally."""
    try:
        import pydantic_settings  # noqa: F401
    except ImportError:
        ps = types.ModuleType("pydantic_settings")
        class BaseSettings:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)
        ps.BaseSettings = BaseSettings
        ps.SettingsConfigDict = lambda **kw: kw
        sys.modules["pydantic_settings"] = ps

    try:
        import pydantic  # noqa: F401
    except ImportError:
        pyd = types.ModuleType("pydantic")
        class BaseModel:
            def __init__(self, **kwargs):
                for k, v in self.__class__.__dict__.items():
                    if not k.startswith("_") and not callable(v) and not isinstance(v, classmethod):
                        setattr(self, k, v)
                for k, v in kwargs.items():
                    setattr(self, k, v)
            def model_dump(self):
                return dict(self.__dict__)
        pyd.BaseModel = BaseModel
        pyd.EmailStr = str
        pyd.Field = lambda default=None, **kw: default
        pyd.field_validator = lambda *a, **kw: (lambda fn: fn)
        pyd.model_validator = lambda *a, **kw: (lambda fn: fn)
        sys.modules["pydantic"] = pyd

    try:
        import sqlalchemy  # noqa: F401
    except ImportError:
        sa = types.ModuleType("sqlalchemy")
        class _Base:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)
        sa.Column = lambda *a, **kw: kw.get("default")
        sa.String = lambda *a, **kw: str
        sa.Boolean = bool
        sa.Float = float
        sa.Numeric = lambda *a, **kw: Decimal
        sa.DateTime = lambda *a, **kw: datetime
        sa.Enum = lambda *a, **kw: a[0] if a else str
        sa.ForeignKey = lambda *a, **kw: None
        sa.Text = str
        sa.Integer = int
        sa.Time = lambda *a, **kw: str
        sa.select = lambda *a, **kw: MagicMock()
        sa.text = lambda s: s
        sa.__getattr__ = lambda name: MagicMock()
        sys.modules["sqlalchemy"] = sa

        sa_orm = types.ModuleType("sqlalchemy.orm")
        sa_orm.relationship = lambda *a, **kw: None
        sa_orm.declarative_base = lambda: _Base
        sa_orm.DeclarativeBase = _Base
        sys.modules["sqlalchemy.orm"] = sa_orm

        sa_ext = types.ModuleType("sqlalchemy.ext")
        sa_async = types.ModuleType("sqlalchemy.ext.asyncio")
        sa_async.AsyncSession = MagicMock
        sa_async.create_async_engine = lambda *a, **kw: MagicMock()
        sa_async.async_sessionmaker = lambda *a, **kw: MagicMock()
        sys.modules["sqlalchemy.ext"] = sa_ext
        sys.modules["sqlalchemy.ext.asyncio"] = sa_async

        sa_dialects = types.ModuleType("sqlalchemy.dialects")
        sa_pg = types.ModuleType("sqlalchemy.dialects.postgresql")
        sa_pg.UUID = lambda *a, **kw: str
        sa_pg.JSONB = dict
        sa_pg.ARRAY = lambda *a, **kw: list
        sys.modules["sqlalchemy.dialects"] = sa_dialects
        sys.modules["sqlalchemy.dialects.postgresql"] = sa_pg

        app_db_sess = types.ModuleType("app.db.session")
        app_db_sess.Base = _Base
        app_db_sess.get_db = lambda: None
        sys.modules["app.db.session"] = app_db_sess

    try:
        import aiosmtplib  # noqa: F401
    except ImportError:
        smtp_mod = types.ModuleType("aiosmtplib")
        smtp_mod.send = AsyncMock()
        sys.modules["aiosmtplib"] = smtp_mod

    try:
        import asyncpg  # noqa: F401
    except ImportError:
        apg_mod = types.ModuleType("asyncpg")
        apg_mod.Connection = MagicMock
        apg_mod.connect = AsyncMock()
        sys.modules["asyncpg"] = apg_mod

    try:
        import httpx  # noqa: F401
    except ImportError:
        hx = types.ModuleType("httpx")
        hx.AsyncClient = MagicMock
        sys.modules["httpx"] = hx

    try:
        import fastapi  # noqa: F401
    except ImportError:
        fa = types.ModuleType("fastapi")
        class HTTPException(Exception):
            def __init__(self, status_code: int, detail: str = ""):
                super().__init__(detail)
                self.status_code = status_code
                self.detail = detail
        class APIRouter:
            def __init__(self, *a, **kw): pass
            def get(self, *a, **kw): return lambda fn: fn
            def post(self, *a, **kw): return lambda fn: fn
            def put(self, *a, **kw): return lambda fn: fn
            def patch(self, *a, **kw): return lambda fn: fn
            def delete(self, *a, **kw): return lambda fn: fn
        class _Status:
            HTTP_200_OK = 200
            HTTP_201_CREATED = 201
            HTTP_400_BAD_REQUEST = 400
            HTTP_401_UNAUTHORIZED = 401
            HTTP_402_PAYMENT_REQUIRED = 402
            HTTP_403_FORBIDDEN = 403
            HTTP_404_NOT_FOUND = 404
            HTTP_409_CONFLICT = 409
            HTTP_429_TOO_MANY_REQUESTS = 429
            HTTP_500_INTERNAL_SERVER_ERROR = 500
            HTTP_502_BAD_GATEWAY = 502
            HTTP_503_SERVICE_UNAVAILABLE = 503
        fa.HTTPException = HTTPException
        fa.APIRouter = APIRouter
        fa.Depends = lambda x=None: x
        fa.Query = lambda default=None, **kw: default
        fa.Header = lambda default=None, **kw: default
        fa.Request = MagicMock
        fa.status = _Status
        sys.modules["fastapi"] = fa

        fa_sec = types.ModuleType("fastapi.security")
        fa_sec.HTTPBearer = lambda **kw: None
        fa_sec.HTTPAuthorizationCredentials = MagicMock
        sys.modules["fastapi.security"] = fa_sec

    try:
        from google.oauth2 import id_token as _g_id_token  # noqa: F401
    except ImportError:
        g_mod = types.ModuleType("google")
        g_oauth2 = types.ModuleType("google.oauth2")
        g_id_token = types.ModuleType("google.oauth2.id_token")
        g_id_token.verify_oauth2_token = MagicMock()
        g_auth = types.ModuleType("google.auth")
        g_transport = types.ModuleType("google.auth.transport")
        g_requests = types.ModuleType("google.auth.transport.requests")
        g_requests.Request = MagicMock
        g_oauth2.id_token = g_id_token
        g_transport.requests = g_requests
        sys.modules["google"] = g_mod
        sys.modules["google.oauth2"] = g_oauth2
        sys.modules["google.oauth2.id_token"] = g_id_token
        sys.modules["google.auth"] = g_auth
        sys.modules["google.auth.transport"] = g_transport
        sys.modules["google.auth.transport.requests"] = g_requests


_install_local_test_shims_if_needed()

from app.models.booking import Booking, BookingStatus, BookingType, PaymentMode
from app.services.booking_state_machine import BookingStateMachine, BookingStateError
from app.services.osrm_router import osrm_service
from app.services.pricing_engine import PricingEngine
from app.services.telemetry_engine import telemetry_physics

class TestVoltMateCoreEngines(unittest.TestCase):

    def test_pricing_engine_mop_sharing_and_overstay(self):
        """Tests settlement calculation with energy, parking, and overstay idle fees."""
        scheduled_start = datetime(2026, 10, 30, 10, 0, 0, tzinfo=timezone.utc)
        scheduled_end = datetime(2026, 10, 30, 12, 0, 0, tzinfo=timezone.utc) # 2 hours
        actual_start = scheduled_start
        # Overstay 35 minutes (15 min grace, 20 min billable overstay)
        actual_end = scheduled_end + timedelta(minutes=35)

        kwh_consumed = 6.6
        price_per_kwh = Decimal("8.50")
        parking_fee_per_hr = Decimal("15.00")

        settlement = PricingEngine.calculate_session_settlement(
            kwh_consumed=kwh_consumed,
            price_per_kwh=price_per_kwh,
            parking_fee_per_hr=parking_fee_per_hr,
            scheduled_end=scheduled_end,
            actual_end=actual_end,
            actual_start=actual_start,
        )

        # Energy: 6.6 * 8.5 = 56.10
        self.assertEqual(settlement["energy_amount_inr"], Decimal("56.10"))
        # Parking: ~2.583 hours * 15 = 38.75
        self.assertGreater(settlement["parking_amount_inr"], Decimal("35.00"))
        # Overstay: 35 - 15 = 20 mins * 2 = 40.00
        self.assertEqual(settlement["overstay_minutes"], 20)
        self.assertEqual(settlement["overstay_penalty_inr"], Decimal("40.00"))
        self.assertEqual(settlement["platform_fee_inr"], Decimal("0.00"))
        self.assertGreater(settlement["total_amount_inr"], Decimal("130.00"))

    def test_upi_intent_uri_generation(self):
        """Tests generation of valid NPCI UPI intent link."""
        uri = PricingEngine.generate_upi_intent_uri(
            host_upi_id="arun@okaxis",
            host_name="Arun Kumar",
            amount_inr=Decimal("134.85"),
            booking_id="e5b927f8-3112-4029-9e8c-8f237894a102"
        )
        self.assertTrue(uri.startswith("upi://pay?"))
        self.assertIn("pa=arun%40okaxis", uri)
        self.assertIn("am=134.85", uri)
        self.assertIn("cu=INR", uri)

    def test_osrm_haversine_and_ghat_elevation_profile(self):
        """Tests geodesic distance and Ghat elevation profile calculation."""
        # Kochi (9.9926, 76.3544) to Munnar (10.0889, 77.0595)
        dist = osrm_service.haversine_distance(9.9926, 76.3544, 10.0889, 77.0595)
        self.assertGreater(dist, 70.0)
        self.assertLess(dist, 90.0)

        coords = [[76.3544, 9.9926], [76.7000, 10.0400], [77.0595, 10.0889]]
        profile = osrm_service.compute_elevation_profile(coords, total_distance_km=85.0, is_ghat_section=True)
        self.assertEqual(len(profile), 3)
        self.assertGreater(profile[-1]["elevation_meters"], 1000.0)

    def test_battery_depletion_simulation(self):
        """Tests that Ghat uphill section correctly predicts battery drop and recharge requirement."""
        coords = [[76.3544, 9.9926], [76.7000, 10.0400], [77.0595, 10.0889]]
        profile = osrm_service.compute_elevation_profile(coords, total_distance_km=120.0, is_ghat_section=True)

        depletion = osrm_service.simulate_battery_depletion_curve(
            elevation_waypoints=profile,
            initial_soc_percent=40.0, # Starting with only 40% battery
            battery_capacity_kwh=40.5
        )

        self.assertTrue(depletion["recharge_required"])
        self.assertIsNotNone(depletion["critical_stop_distance_km"])
        self.assertLess(depletion["final_soc_percent"], 20.0)

    def test_telemetry_physics_cc_cv_taper(self):
        """Tests that charging power throttles down in Constant Voltage phase (SOC >= 80%)."""
        # Low SOC (30%) - Full nominal 3.3 kW
        low_soc_tick = telemetry_physics.compute_tick(
            elapsed_seconds=100,
            nominal_power_kw=3.3,
            battery_capacity_kwh=40.5,
            initial_soc=30.0,
            price_per_kwh=8.5
        )
        self.assertFalse(low_soc_tick["is_tapering"])
        self.assertAlmostEqual(low_soc_tick["instant_power_kw"], 3.3, places=1)

        # High SOC (92%) - Tapering active
        high_soc_tick = telemetry_physics.compute_tick(
            elapsed_seconds=100,
            nominal_power_kw=3.3,
            battery_capacity_kwh=40.5,
            initial_soc=92.0,
            price_per_kwh=8.5
        )
        self.assertTrue(high_soc_tick["is_tapering"])
        self.assertLess(high_soc_tick["instant_power_kw"], 3.3)
        self.assertGreater(high_soc_tick["instant_power_kw"], 0.2)

class TestBookingFSMTransitions(unittest.IsolatedAsyncioTestCase):

    async def test_booking_happy_path_transitions(self):
        """Tests full state transition sequence: REQUESTED -> APPROVED -> CHECKED_IN -> ACTIVE_CHARGING -> COMPLETED."""
        mock_node = MagicMock()
        mock_node.id = "node_1"
        mock_node.power_output_kw = 3.3
        mock_node.price_per_kwh = Decimal("8.50")
        mock_node.parking_fee_per_hr = Decimal("15.00")
        mock_node.is_smart_iot = False
        mock_node.iot_device_id = None

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_node

        mock_db = MagicMock()
        async def mock_execute(*args, **kwargs):
            return mock_result
        async def mock_flush(*args, **kwargs):
            pass

        mock_db.execute = mock_execute
        mock_db.flush = mock_flush

        booking = Booking(
            node_id="node_1",
            driver_id="driver_1",
            host_id="host_1",
            vehicle_id="vehicle_1",
            booking_type=BookingType.ADHOC,
            scheduled_start=datetime.now(timezone.utc),
            scheduled_end=datetime.now(timezone.utc) + timedelta(hours=2),
            status=BookingStatus.REQUESTED,
            start_pin_code="4921",
            gate_pass_code="VM-7K9A2P",
            state_history=[]
        )

        fsm = BookingStateMachine(booking, mock_db)

        # 1. Host Approves
        await fsm.trigger(event="HOST_APPROVE", actor_id="host_1", actor_role="HOST")
        self.assertEqual(booking.status, BookingStatus.APPROVED)

        # 2. Driver Verifies Gate Pass
        await fsm.trigger(
            event="VERIFY_GATE_PASS",
            actor_id="driver_1",
            actor_role="DRIVER",
            metadata={"gate_pass_code": "VM-7K9A2P"}
        )
        self.assertEqual(booking.status, BookingStatus.CHECKED_IN)
        self.assertTrue(booking.gate_pass_verified)

        # 3. Start Charging with PIN & Start Meter OCR
        await fsm.trigger(
            event="START_CHARGING",
            actor_id="driver_1",
            actor_role="DRIVER",
            metadata={"pin_code": "4921", "start_meter_reading": 1050.0}
        )
        self.assertEqual(booking.status, BookingStatus.ACTIVE_CHARGING)
        self.assertEqual(booking.start_meter_reading, 1050.0)

        # 4. Complete Session & Settle with End Meter OCR
        await fsm.trigger(
            event="VERIFY_AND_SETTLE",
            actor_id="driver_1",
            actor_role="DRIVER",
            metadata={"end_meter_reading": 1056.6} # 6.6 kWh delivered
        )
        self.assertEqual(booking.status, BookingStatus.COMPLETED)
        self.assertEqual(booking.actual_kwh, 6.6)
        self.assertGreater(booking.total_amount_inr, Decimal("50.00"))

    async def test_invalid_transition_guard_rejection(self):
        """Tests that state machine rejects illegal transition events."""
        mock_db = MagicMock()
        booking = Booking(
            status=BookingStatus.REQUESTED,
            host_id="host_1",
            driver_id="driver_1",
            start_pin_code="4921",
            gate_pass_code="VM-7K9A2P"
        )
        fsm = BookingStateMachine(booking, mock_db)

        # Cannot jump from REQUESTED directly to ACTIVE_CHARGING
        with self.assertRaises(BookingStateError):
            await fsm.trigger(event="START_CHARGING", actor_id="driver_1", actor_role="DRIVER")


class TestSecurityAndAuthArchitecture(unittest.IsolatedAsyncioTestCase):

    async def test_jwt_jti_and_revocation_lifecycle(self):
        """Tests that JWTs include unique JTI claims and can be revoked in Redis/fallback memory."""
        from app.core.security import create_access_token, create_refresh_token, decode_token
        from app.services.redis_service import redis_service

        access = create_access_token("user_123", extra_claims={"role": "DRIVER"})
        refresh = create_refresh_token("user_123")

        dec_access = decode_token(access)
        dec_refresh = decode_token(refresh)

        self.assertIsNotNone(dec_access)
        self.assertIsNotNone(dec_refresh)
        self.assertEqual(dec_access["type"], "access")
        self.assertEqual(dec_refresh["type"], "refresh")
        self.assertIn("jti", dec_access)
        self.assertIn("jti", dec_refresh)
        self.assertNotEqual(dec_access["jti"], dec_refresh["jti"])

        # Revoke refresh token (simulating rotation or logout)
        self.assertFalse(await redis_service.is_token_revoked(dec_refresh["jti"]))
        await redis_service.revoke_token(dec_refresh["jti"], ttl_seconds=60)
        self.assertTrue(await redis_service.is_token_revoked(dec_refresh["jti"]))

    async def test_brute_force_rate_limiter(self):
        """Tests that 5 failed login attempts lock out further attempts until cleared."""
        from app.services.redis_service import redis_service

        target_email = "victim@voltmate.in"
        await redis_service.clear_failed_logins(target_email)

        for _ in range(5):
            self.assertTrue(await redis_service.check_login_allowed(target_email, max_attempts=5))
            await redis_service.record_failed_login(target_email)

        # 6th attempt must be blocked
        self.assertFalse(await redis_service.check_login_allowed(target_email, max_attempts=5))

        # Clearing resets lockout
        await redis_service.clear_failed_logins(target_email)
        self.assertTrue(await redis_service.check_login_allowed(target_email, max_attempts=5))

    def test_otp_hmac_email_binding_and_password_hash(self):
        """Tests that HMAC-SHA256 OTP cannot be replayed across different emails and bcrypt verifies."""
        from app.core.security import hash_otp, verify_otp_hash, get_password_hash, verify_password

        otp = "482910"
        h = hash_otp(otp, "alice@voltmate.in")
        self.assertTrue(verify_otp_hash(otp, "alice@voltmate.in", h))
        self.assertFalse(verify_otp_hash(otp, "attacker@voltmate.in", h))

        pw_hash = get_password_hash("StrongPass!2026")
        self.assertTrue(verify_password("StrongPass!2026", pw_hash))
        self.assertFalse(verify_password("WrongPass", pw_hash))
        self.assertFalse(verify_password("WrongPass", None))


class TestGoogleSignInVerificationAndLinking(unittest.IsolatedAsyncioTestCase):

    def test_rejects_fabricated_google_oauth_prefix_token(self):
        """Tests that legacy client-fabricated 'google_oauth_*' tokens are rejected with 401."""
        from fastapi import HTTPException
        from app.api.v1.auth import verify_google_id_token

        with self.assertRaises(HTTPException) as ctx:
            verify_google_id_token("google_oauth_1730000000_attacker@gmail.com")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_verify_google_id_token_checks_issuer_audience_and_email_verified(self):
        """Tests server-side verification of issuer, audience, email_verified, and sub claim."""
        from unittest.mock import patch
        from fastapi import HTTPException
        from app.api.v1.auth import verify_google_id_token, get_allowed_google_client_ids

        valid_aud = next(iter(get_allowed_google_client_ids()))
        dummy_jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"

        # 1. Valid token succeeds
        with patch("app.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "iss": "https://accounts.google.com",
                "aud": valid_aud,
                "sub": "google_sub_99887766",
                "email": "Driver.One@gmail.com",
                "email_verified": True,
                "name": "Driver One",
            }
            claims = verify_google_id_token(dummy_jwt)
            self.assertEqual(claims["sub"], "google_sub_99887766")
            self.assertEqual(claims["email"], "driver.one@gmail.com")
            self.assertTrue(claims["email_verified"])

        # 2. Wrong issuer is rejected
        with patch("app.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "iss": "https://evil.example.com",
                "aud": valid_aud,
                "sub": "google_sub_99887766",
                "email": "driver@gmail.com",
                "email_verified": True,
            }
            with self.assertRaises(HTTPException) as ctx:
                verify_google_id_token(dummy_jwt)
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertIn("issuer", ctx.exception.detail.lower())

        # 3. Wrong audience is rejected
        with patch("app.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "iss": "accounts.google.com",
                "aud": "wrong-client-id.apps.googleusercontent.com",
                "sub": "google_sub_99887766",
                "email": "driver@gmail.com",
                "email_verified": True,
            }
            with self.assertRaises(HTTPException) as ctx:
                verify_google_id_token(dummy_jwt)
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertIn("audience", ctx.exception.detail.lower())

        # 4. Unverified email is rejected
        with patch("app.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "iss": "https://accounts.google.com",
                "aud": valid_aud,
                "sub": "google_sub_99887766",
                "email": "unverified@gmail.com",
                "email_verified": False,
            }
            with self.assertRaises(HTTPException) as ctx:
                verify_google_id_token(dummy_jwt)
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertIn("not verified", ctx.exception.detail.lower())

    async def test_google_auth_endpoint_keys_by_sub_links_email_and_blocks_disabled(self):
        """Tests POST /auth/google user lookup by sub, safe email linking, and disabled account rejection."""
        from unittest.mock import patch
        from uuid import uuid4
        from fastapi import HTTPException
        from app.api.v1.auth import google_auth
        from app.schemas.auth import GoogleAuthRequest

        mock_db = AsyncMock()
        dummy_jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzdWJfMTIzIn0.signature"
        party_uuid = uuid4()

        # Case A: Returning user matched directly by Google `sub` -> is_new_user = False
        with patch("app.api.v1.auth.verify_google_id_token") as mock_v, \
             patch("app.api.v1.auth._fetch_edw_party_by_google_sub", new_callable=AsyncMock) as mock_by_sub:
            mock_v.return_value = {
                "sub": "sub_123",
                "email": "nidhin@gmail.com",
                "email_verified": True,
                "name": "Nidhin R",
            }
            mock_by_sub.return_value = {
                "party_id": party_uuid,
                "party_type_cd": 1001,
                "party_stat_cd": 1011,
                "kyc_verif_cd": 1021,
                "email_addr": "nidhin@gmail.com",
                "full_name": "Nidhin R",
                "phone_e164": "+919847099881",
                "upi_vpa_addr": "nidhin@okicici",
                "wallet_balance_inr": Decimal("1571.20"),
                "google_sub": "sub_123",
            }
            resp = await google_auth(GoogleAuthRequest(id_token=dummy_jwt), db=mock_db)
            self.assertFalse(resp.is_new_user)
            self.assertEqual(resp.user_id, str(party_uuid))
            self.assertEqual(resp.volt_credits_balance, 1571.20)

        # Case B: Disabled account (party_stat_cd == 1012) is rejected with 403
        with patch("app.api.v1.auth.verify_google_id_token") as mock_v, \
             patch("app.api.v1.auth._fetch_edw_party_by_google_sub", new_callable=AsyncMock) as mock_by_sub:
            mock_v.return_value = {
                "sub": "sub_disabled",
                "email": "banned@gmail.com",
                "email_verified": True,
                "name": "Banned User",
            }
            mock_by_sub.return_value = {
                "party_id": party_uuid,
                "party_type_cd": 1001,
                "party_stat_cd": 1012,
                "kyc_verif_cd": 1021,
                "email_addr": "banned@gmail.com",
                "full_name": "Banned User",
            }
            with self.assertRaises(HTTPException) as ctx:
                await google_auth(GoogleAuthRequest(id_token=dummy_jwt), db=mock_db)
            self.assertEqual(ctx.exception.status_code, 403)

        # Case C: Existing email account linked to a DIFFERENT Google `sub` is rejected with 409
        with patch("app.api.v1.auth.verify_google_id_token") as mock_v, \
             patch("app.api.v1.auth._fetch_edw_party_by_google_sub", new_callable=AsyncMock) as mock_by_sub, \
             patch("app.api.v1.auth._fetch_edw_party_by_email", new_callable=AsyncMock) as mock_by_email:
            mock_v.return_value = {
                "sub": "sub_new_attacker",
                "email": "existing@gmail.com",
                "email_verified": True,
                "name": "Existing User",
            }
            mock_by_sub.return_value = None
            mock_by_email.return_value = {
                "party_id": party_uuid,
                "party_type_cd": 1001,
                "party_stat_cd": 1011,
                "kyc_verif_cd": 1021,
                "email_addr": "existing@gmail.com",
                "full_name": "Existing User",
                "google_sub": "sub_original_owner",
            }
            with self.assertRaises(HTTPException) as ctx:
                await google_auth(GoogleAuthRequest(id_token=dummy_jwt), db=mock_db)
            self.assertEqual(ctx.exception.status_code, 409)


class TestRazorpayPaymentsAndLedger(unittest.IsolatedAsyncioTestCase):

    def test_paise_conversion_and_hmac_signature_verification(self):
        """Tests integer paise math and Razorpay HMAC-SHA256 payment & webhook signature verification."""
        from decimal import Decimal
        from app.api.v1.payments import (
            inr_to_paise,
            paise_to_inr,
            compute_razorpay_payment_signature,
            verify_razorpay_payment_signature,
            verify_razorpay_webhook_signature,
        )

        self.assertEqual(inr_to_paise(Decimal("250.50")), 25050)
        self.assertEqual(inr_to_paise(10), 1000)
        self.assertEqual(paise_to_inr(25050), Decimal("250.50"))

        secret = "rzp_test_secret_key_998877"
        order_id = "order_P9aBcDeFgHiJkL"
        payment_id = "pay_Q1zYxWvUtSrQpO"

        valid_sig = compute_razorpay_payment_signature(order_id, payment_id, secret)
        self.assertTrue(verify_razorpay_payment_signature(order_id, payment_id, valid_sig, secret))
        self.assertFalse(verify_razorpay_payment_signature(order_id, payment_id, "tampered_sig", secret))
        self.assertFalse(verify_razorpay_payment_signature("order_OTHER", payment_id, valid_sig, secret))

        # Webhook signature verification on raw bytes
        import hmac
        import hashlib
        webhook_secret = "whsec_voltmate_test_2026"
        raw_body = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_123"}}}}'
        wh_sig = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_razorpay_webhook_signature(raw_body, wh_sig, webhook_secret))
        self.assertFalse(verify_razorpay_webhook_signature(raw_body + b" ", wh_sig, webhook_secret))

    async def test_create_order_bounds_and_idempotency(self):
        """Tests min/max top-up limits and idempotency replay on POST /payments/orders."""
        from unittest.mock import patch
        from uuid import uuid4
        from fastapi import HTTPException
        from app.api.v1.payments import create_payment_order, CreatePaymentOrderRequest

        mock_db = AsyncMock()
        user_ctx = {
            "party_id": uuid4(),
            "full_name": "Nidhin R",
            "email_addr": "nidhin@gmail.com",
            "phone_e164": "+919847099881",
        }

        # 1. Amount below MIN_TOPUP_INR (₹10) is rejected with 400
        with patch("app.api.v1.payments.ensure_payment_tables_and_ref_codes", new_callable=AsyncMock):
            mock_exec_res = MagicMock()
            mock_exec_res.mappings.return_value.first.return_value = None
            mock_db.execute.return_value = mock_exec_res

            with self.assertRaises(HTTPException) as ctx:
                await create_payment_order(
                    CreatePaymentOrderRequest(
                        purpose="WALLET_TOPUP",
                        amount_inr=5.0,
                        idempotency_key="idem_too_low",
                    ),
                    current_user=user_ctx,
                    db=mock_db,
                )
            self.assertEqual(ctx.exception.status_code, 400)

        # 2. Idempotent replay returns existing order without calling Razorpay gateway again
        with patch("app.api.v1.payments.ensure_payment_tables_and_ref_codes", new_callable=AsyncMock), \
             patch("app.api.v1.payments._create_razorpay_gateway_order", new_callable=AsyncMock) as mock_gw:
            mock_exec_res = MagicMock()
            mock_exec_res.mappings.return_value.first.return_value = {
                "razorpay_order_id": "order_EXISTING123",
                "amount_paise": 50000,
                "currency": "INR",
                "status": "CREATED",
                "purpose": "WALLET_TOPUP",
                "reference_id": None,
            }
            mock_db.execute.return_value = mock_exec_res

            res = await create_payment_order(
                CreatePaymentOrderRequest(
                    purpose="WALLET_TOPUP",
                    amount_inr=500.0,
                    idempotency_key="idem_existing_123",
                ),
                current_user=user_ctx,
                db=mock_db,
            )
            self.assertTrue(res["idempotent_replay"])
            self.assertEqual(res["razorpay_order_id"], "order_EXISTING123")
            self.assertEqual(res["amount_paise"], 50000)
            mock_gw.assert_not_called()

    async def test_verify_and_webhook_idempotency_no_double_credit(self):
        """Tests that /payments/verify followed by /payments/webhook/razorpay credits the ledger only once."""
        from unittest.mock import patch
        from decimal import Decimal
        from uuid import uuid4
        from app.api.v1.payments import _settle_verified_razorpay_order

        mock_db = AsyncMock()
        party_uuid = uuid4()
        order_created = {
            "razorpay_order_id": "order_RZP_1001",
            "razorpay_payment_id": None,
            "party_id": party_uuid,
            "amount_paise": 50000,
            "status": "CREATED",
            "purpose": "WALLET_TOPUP",
            "reference_id": None,
        }

        with patch("app.api.v1.payments.append_wallet_ledger_entry", new_callable=AsyncMock) as mock_append, \
             patch("app.api.v1.payments.get_party_sk_and_balance", new_callable=AsyncMock) as mock_bal:
            mock_append.return_value = {
                "ledger_fact_id": 42,
                "txn_id": "txn_42",
                "txn_type_cd": 6001,
                "dr_cr_ind": "C",
                "amount_inr": 500.0,
                "running_balance_inr": 2071.20,
                "created_at": "2026-11-23T00:00:00Z",
            }
            mock_bal.return_value = (1, Decimal("2071.20"))

            # First settlement call (e.g. via /payments/verify) credits the ledger
            first = await _settle_verified_razorpay_order(
                db=mock_db,
                order_row=order_created,
                razorpay_payment_id="pay_RZP_9001",
                payment_method="upi",
            )
            self.assertFalse(first["idempotent_replay"])
            self.assertEqual(first["wallet_balance_inr"], 2071.20)
            self.assertEqual(mock_append.call_count, 1)

            # Second settlement call (e.g. via /payments/webhook/razorpay) sees status == CAPTURED -> no-op!
            order_captured = {**order_created, "status": "CAPTURED", "razorpay_payment_id": "pay_RZP_9001"}
            second = await _settle_verified_razorpay_order(
                db=mock_db,
                order_row=order_captured,
                razorpay_payment_id="pay_RZP_9001",
                payment_method="upi",
            )
            self.assertTrue(second["idempotent_replay"])
            self.assertEqual(second["wallet_balance_inr"], 2071.20)
            self.assertEqual(mock_append.call_count, 1)

    async def test_insufficient_wallet_balance_blocks_debit_with_402(self):
        """Tests that append_wallet_ledger_entry raises HTTP 402 when debit exceeds available balance."""
        from unittest.mock import patch
        from decimal import Decimal
        from uuid import uuid4
        from fastapi import HTTPException
        from app.api.v1.payments import append_wallet_ledger_entry, TXN_TYPE_BOOKING_HOLD

        mock_db = AsyncMock()
        with patch("app.api.v1.payments.ensure_payment_tables_and_ref_codes", new_callable=AsyncMock), \
             patch("app.api.v1.payments.ensure_today_date_sk", new_callable=AsyncMock, return_value=20261123), \
             patch("app.api.v1.payments.get_party_sk_and_balance", new_callable=AsyncMock) as mock_bal:
            mock_bal.return_value = (1, Decimal("120.00"))
            with self.assertRaises(HTTPException) as ctx:
                await append_wallet_ledger_entry(
                    db=mock_db,
                    party_id=str(uuid4()),
                    txn_type_cd=TXN_TYPE_BOOKING_HOLD,
                    dr_cr_ind="D",
                    amount_inr=Decimal("250.00"),
                    allow_negative=False,
                )
            self.assertEqual(ctx.exception.status_code, 402)
            self.assertIn("Shortfall: ₹130.00", ctx.exception.detail)


class TestTask3EndToEndLogicRules(unittest.IsolatedAsyncioTestCase):

    async def test_delete_account_blocks_on_active_session_or_hold_and_anonymizes_when_clear(self):
        """Tests DELETE /auth/me blocks when an active session or open hold exists and scrubs PII when clear."""
        from uuid import uuid4
        from decimal import Decimal
        from fastapi import HTTPException
        from app.api.v1.auth import delete_my_account

        mock_db = AsyncMock()
        user_ctx = {"party_id": uuid4()}

        # 1. Active charging session blocks deletion with 409 Conflict
        mock_db.scalar.side_effect = [1]
        with self.assertRaises(HTTPException) as ctx:
            await delete_my_account(credentials=None, current_party=user_ctx, db=mock_db)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("live charging session", ctx.exception.detail.lower())

        # 2. Unsettled booking hold blocks deletion with 409 Conflict
        mock_db.scalar.side_effect = [None, Decimal("185.00")]
        with self.assertRaises(HTTPException) as ctx:
            await delete_my_account(credentials=None, current_party=user_ctx, db=mock_db)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("booking hold", ctx.exception.detail.lower())

        # 3. Clean account (no active session, 0 hold) soft-deletes & scrubs PII
        mock_db.scalar.side_effect = [None, Decimal("0.00")]
        res = await delete_my_account(credentials=None, current_party=user_ctx, db=mock_db)
        self.assertTrue(res["deleted"])
        self.assertEqual(res["party_id"], str(user_ctx["party_id"]))

    async def test_gate_pass_pin_verification_and_gst_invoice_breakdown(self):
        """Tests server-side Gate-Pass PIN constant-time verification and 18% GST tax invoice breakdown."""
        from uuid import uuid4
        from decimal import Decimal
        from fastapi import HTTPException
        from app.api.v1.bookings import verify_booking_gate_pass_pin, get_booking_gst_invoice

        mock_db = AsyncMock()
        booking_uuid = uuid4()
        mock_exec_res = MagicMock()
        mock_exec_res.mappings.return_value.first.return_value = {
            "session_fact_id": 108,
            "booking_natural_uuid": booking_uuid,
            "gate_pass_pin_num": 544555,
            "station_title": "Spark EV Fast Hub",
            "station_address": "Infopark Road",
            "host_full_name": "VoltMate Public Grid",
            "driver_full_name": "Nidhin R",
            "vehicle_rc_plate": "KL-07-CS-4921",
            "connector_label": "CCS2 DC Fast",
            "delivered_kwh": Decimal("20.000"),
            "historical_energy_rate_inr": Decimal("15.00"),
            "energy_cost_inr": Decimal("300.00"),
            "parking_cost_inr": Decimal("54.00"),
            "total_settled_inr": Decimal("354.00"),
        }
        mock_db.execute.return_value = mock_exec_res

        # Valid 6-digit PIN succeeds
        pin_ok = await verify_booking_gate_pass_pin(booking_uuid, {"pin_code": "544555"}, db=mock_db)
        self.assertTrue(pin_ok["verified"])

        # Wrong PIN is rejected with 400
        with self.assertRaises(HTTPException) as ctx:
            await verify_booking_gate_pass_pin(booking_uuid, {"pin_code": "999999"}, db=mock_db)
        self.assertEqual(ctx.exception.status_code, 400)

        # GST Invoice breakdown for ₹354.00 (₹300.00 taxable + ₹27.00 CGST + ₹27.00 SGST)
        inv = await get_booking_gst_invoice(booking_uuid, db=mock_db)
        self.assertEqual(inv["hsn_sac_code"], "998714")
        self.assertEqual(inv["taxable_value_inr"], 300.0)
        self.assertEqual(inv["cgst_inr"], 27.0)
        self.assertEqual(inv["sgst_inr"], 27.0)
        self.assertEqual(inv["total_gst_inr"], 54.0)
        self.assertEqual(inv["total_settled_inr"], 354.0)

    async def test_reschedule_conflict_and_host_payout_pending_approval(self):
        """Tests booking reschedule 409 conflict enforcement and host payout PENDING_APPROVAL ledger rule."""
        from unittest.mock import patch
        from uuid import uuid4
        from decimal import Decimal
        from fastapi import HTTPException
        from app.api.v1.bookings import reschedule_edw_booking
        from app.api.v1.payments import request_host_payout, HostPayoutCreateRequest

        mock_db = AsyncMock()
        booking_uuid = uuid4()
        mock_exec_res = MagicMock()
        mock_exec_res.mappings.return_value.first.return_value = {
            "session_fact_id": 109,
            "booking_natural_uuid": booking_uuid,
            "session_stat_cd": 4001,
            "tariff_sk": 12,
        }
        mock_db.execute.return_value = mock_exec_res

        # 1. Conflicting slot raises 409 Conflict
        mock_db.scalar.return_value = uuid4()
        with self.assertRaises(HTTPException) as ctx:
            await reschedule_edw_booking(booking_uuid, {"offset_hours": 2}, db=mock_db)
        self.assertEqual(ctx.exception.status_code, 409)

        # 2. Non-conflicting slot succeeds
        mock_db.scalar.return_value = None
        ok_res = await reschedule_edw_booking(
            booking_uuid,
            {"offset_hours": 3, "slot_label": "Today • 18:00 – 19:00"},
            db=mock_db,
        )
        self.assertTrue(ok_res["rescheduled"])
        self.assertEqual(ok_res["slot_label"], "Today • 18:00 – 19:00")

        # 3. Host payout request below ₹100 is rejected with 400; valid request creates PENDING_APPROVAL record
        user_ctx = {"party_id": uuid4()}
        with patch("app.api.v1.payments.ensure_payment_tables_and_ref_codes", new_callable=AsyncMock):
            no_existing = MagicMock()
            no_existing.mappings.return_value.first.return_value = None
            mock_db.execute.return_value = no_existing

            with self.assertRaises(HTTPException) as ctx:
                await request_host_payout(
                    HostPayoutCreateRequest(
                        amount_inr=50.0,
                        upi_vpa="arun.host@okaxis",
                        idempotency_key="payout_low_1",
                    ),
                    current_user=user_ctx,
                    db=mock_db,
                )
            self.assertEqual(ctx.exception.status_code, 400)

        with patch("app.api.v1.payments.ensure_payment_tables_and_ref_codes", new_callable=AsyncMock), \
             patch("app.api.v1.payments.get_party_sk_and_balance", new_callable=AsyncMock, return_value=(2, Decimal("1200.00"))), \
             patch("app.api.v1.payments.append_wallet_ledger_entry", new_callable=AsyncMock) as mock_append:
            no_existing = MagicMock()
            no_existing.mappings.return_value.first.return_value = None
            mock_db.execute.return_value = no_existing
            mock_db.scalar.return_value = Decimal("850.00")
            mock_append.return_value = {
                "ledger_fact_id": 88,
                "txn_id": "txn_88",
                "txn_type_cd": 6004,
                "dr_cr_ind": "D",
                "amount_inr": 500.0,
                "running_balance_inr": 700.0,
                "created_at": "2026-11-23T00:00:00Z",
            }
            payout = await request_host_payout(
                HostPayoutCreateRequest(
                    amount_inr=500.0,
                    upi_vpa="arun.host@okaxis",
                    idempotency_key="payout_valid_500",
                ),
                current_user=user_ctx,
                db=mock_db,
            )
            self.assertEqual(payout["status"], "PENDING_APPROVAL")
            self.assertEqual(payout["amount_inr"], 500.0)
            self.assertEqual(payout["remaining_host_earnings_inr"], 350.0)


class TestPhase1CharacterizationSafetyNet(unittest.IsolatedAsyncioTestCase):
    """
    Phase 1 Characterization Tests locking current behaviour across the 7 critical flows
    before Phase 2 de-duplication and refactoring.
    """

    async def test_flow1_and_flow2_tariff_total_and_double_booking_prevention(self):
        """Flow 1 & 2: Locks booking total calculation (₹9.00/kWh × 15 kWh = ₹135.00) and double-booking 409 rejection."""
        from unittest.mock import patch
        from uuid import uuid4
        from decimal import Decimal
        from fastapi import HTTPException
        from app.api.v1.bookings import create_quick_edw_booking, QuickBookingEdwPayload

        mock_db = AsyncMock()
        user_ctx = {"party_id": uuid4()}
        tariff_res = MagicMock()
        tariff_res.mappings.return_value.first.return_value = {
            "tariff_sk": 55,
            "energy_rate_inr": Decimal("9.00"),
            "parking_rate_hr_inr": Decimal("10.00"),
            "host_party_id": uuid4(),
        }
        mock_db.execute.return_value = tariff_res

        # Double-booking prevention: when an overlapping active slot exists on tariff_sk=55, raises 409 Conflict
        with patch("app.api.v1.bookings.get_party_sk_and_balance", new_callable=AsyncMock, return_value=(1, Decimal("500.00"))):
            # scalar calls: 1) drv_sk, 2) host_sk, 3) veh_sk, 4) conflict booking_natural_uuid
            mock_db.scalar.side_effect = [10, 20, 30, uuid4()]
            with self.assertRaises(HTTPException) as ctx:
                await create_quick_edw_booking(
                    QuickBookingEdwPayload(
                        stationId=str(uuid4()),
                        scheduledDate="Today, 23 Nov",
                        scheduledTime="10:00 – 11:00",
                        estimatedKwh=15.0,
                        paymentMode="WALLET",
                    ),
                    current_user=user_ctx,
                    db=mock_db,
                )
            self.assertEqual(ctx.exception.status_code, 409)

        # Available slot: calculates hold = 15.0 kWh * ₹9.00/kWh = ₹135.00 and places BOOKING_HOLD
        with patch("app.api.v1.bookings.get_party_sk_and_balance", new_callable=AsyncMock, return_value=(1, Decimal("500.00"))), \
             patch("app.api.v1.bookings.append_wallet_ledger_entry", new_callable=AsyncMock) as mock_hold:
            mock_db.scalar.side_effect = [10, 20, 30, None, 777]
            mock_hold.return_value = {"ledger_fact_id": 1, "running_balance_inr": 365.0}
            res = await create_quick_edw_booking(
                QuickBookingEdwPayload(
                    stationId=str(uuid4()),
                    scheduledDate="Today, 23 Nov",
                    scheduledTime="14:00 – 15:00",
                    estimatedKwh=15.0,
                    paymentMode="WALLET",
                ),
                current_user=user_ctx,
                db=mock_db,
            )
            self.assertEqual(res["session_fact_id"], 777)
            self.assertEqual(res["held_amount_inr"], 135.0)
            self.assertEqual(res["session_stat_cd"], 4001)

    async def test_flow4_session_stop_reconciles_hold_debits_driver_and_credits_host(self):
        """Flow 4: Locks charging session completion bill calculation, hold release, driver debit, and host 95% credit."""
        from unittest.mock import patch
        from uuid import uuid4
        from decimal import Decimal
        from app.api.v1.bookings import complete_charging_session
        from app.schemas.booking import CompleteSessionRequest

        mock_db = AsyncMock()
        booking_uuid = uuid4()
        driver_uuid = uuid4()
        host_uuid = uuid4()

        active_row = {
            "session_fact_id": 501,
            "booking_natural_uuid": booking_uuid,
            "driver_party_id": driver_uuid,
            "host_party_id": host_uuid,
            "vehicle_id": uuid4(),
            "node_id": uuid4(),
            "session_stat_cd": 4002,
            "gate_pass_pin_num": 654321,
            "sched_start_ts": datetime.now(timezone.utc),
            "sched_end_ts": datetime.now(timezone.utc) + timedelta(hours=1),
            "historical_energy_rate_inr": Decimal("10.00"),
            "historical_parking_rate_inr": Decimal("20.00"),
            "delivered_kwh": Decimal("0.000"),
            "energy_cost_inr": Decimal("0.00"),
            "parking_cost_inr": Decimal("0.00"),
            "total_settled_inr": Decimal("0.00"),
        }
        settled_row = {
            **active_row,
            "session_stat_cd": 4003,
            "delivered_kwh": Decimal("18.000"),
            "energy_cost_inr": Decimal("180.00"),
            "parking_cost_inr": Decimal("20.00"),
            "total_settled_inr": Decimal("200.00"),
        }

        res1 = MagicMock()
        res1.mappings.return_value.first.return_value = active_row
        res2 = MagicMock()
        res2.mappings.return_value.first.return_value = settled_row
        mock_db.execute.side_effect = [res1, MagicMock(), res2]

        with patch("app.api.v1.bookings._release_booking_hold_if_any", new_callable=AsyncMock) as mock_rel, \
             patch("app.api.v1.bookings.append_wallet_ledger_entry", new_callable=AsyncMock) as mock_ledger:
            resp = await complete_charging_session(
                booking_id=booking_uuid,
                payload=CompleteSessionRequest(end_meter_reading=18.0),
                db=mock_db,
            )
            mock_rel.assert_awaited_once()
            # 2 ledger calls: 1) Driver debit ₹200.00 (6002), 2) Host credit ₹190.00 (6003, net of 5% platform fee)
            self.assertEqual(mock_ledger.await_count, 2)
            debit_call = mock_ledger.await_args_list[0].kwargs
            credit_call = mock_ledger.await_args_list[1].kwargs
            self.assertEqual(debit_call["dr_cr_ind"], "D")
            self.assertEqual(debit_call["amount_inr"], Decimal("200.00"))
            self.assertEqual(credit_call["dr_cr_ind"], "C")
            self.assertEqual(credit_call["amount_inr"], Decimal("190.00"))
            self.assertEqual(resp.total_amount_inr, Decimal("200.00"))

    async def test_flow5_host_station_create_edit_and_online_toggle(self):
        """Flow 5: Locks host P2P station upsert, SCD2 tariff versioning, and online/offline toggle."""
        from uuid import uuid4
        from app.api.v1.host import (
            upsert_p2p_host_station,
            toggle_host_station_online,
            HostStationUpsertPayload,
            HostConnectorSpecPayload,
        )

        mock_db = AsyncMock()
        no_existing_tariff = MagicMock()
        no_existing_tariff.mappings.return_value.first.return_value = None
        mock_db.execute.return_value = no_existing_tariff

        host_user = {"party_id": uuid4()}
        created = await upsert_p2p_host_station(
            payload=HostStationUpsertPayload(
                title="Payyanur Solar Villa EV Bay",
                address="Main Rd, Payyanur, Kerala",
                latitude=12.1045,
                longitude=75.2058,
                discomBoard="KSEB",
                connectors=[HostConnectorSpecPayload(name="15A 3-Pin Socket", powerKw=3.3, pricePerKwh=8.5)],
                parkingFeePerHrInr=10.0,
                isOnline=True,
            ),
            current_user=host_user,
            db=mock_db,
        )
        self.assertEqual(created["status"], "AVAILABLE")
        self.assertTrue(created["isOnline"])

        toggled = await toggle_host_station_online(
            node_id=created["node_id"],
            is_online=False,
            db=mock_db,
        )
        self.assertTrue(toggled["updated"])

    async def test_flow7_refresh_token_rotation_and_replay_rejection(self):
        """Flow 7: Locks refresh token rotation (single-use JTI revocation) in POST /auth/refresh."""
        from unittest.mock import patch
        from uuid import uuid4
        from fastapi import HTTPException
        from app.core.security import create_refresh_token
        from app.api.v1.auth import refresh_tokens
        from app.schemas.auth import RefreshTokenRequest

        mock_db = AsyncMock()
        party_uuid = uuid4()
        rt = create_refresh_token(str(party_uuid))

        with patch("app.api.v1.auth._fetch_edw_party_by_id", new_callable=AsyncMock) as mock_party:
            mock_party.return_value = {
                "party_id": party_uuid,
                "party_type_cd": 1001,
                "party_stat_cd": 1011,
                "kyc_verif_cd": 1021,
                "email_addr": "driver@voltmate.in",
                "full_name": "EV Driver",
                "phone_e164": "+919847012345",
                "upi_vpa_addr": "driver@okaxis",
                "wallet_balance_inr": Decimal("450.00"),
            }
            # First use of refresh token succeeds and rotates token
            rotated = await refresh_tokens(RefreshTokenRequest(refresh_token=rt), db=mock_db)
            self.assertEqual(rotated.user_id, str(party_uuid))
            self.assertNotEqual(rotated.refresh_token, rt)

            # Replaying the rotated refresh token must fail with 401 Unauthorized
            with self.assertRaises(HTTPException) as ctx:
                await refresh_tokens(RefreshTokenRequest(refresh_token=rt), db=mock_db)
            self.assertEqual(ctx.exception.status_code, 401)


class TestPhase5ProductionHardening(unittest.IsolatedAsyncioTestCase):
    """Phase 5 Security & Concurrency Hardening Tests (IDOR, PIN Lockout, OTP Preview Gating, Privacy Masking)."""

    async def test_booking_and_host_station_idor_ownership_checks(self):
        """Verifies 403 Forbidden when an unrelated user tries to cancel/respond to a booking or modify another host's station."""
        from uuid import uuid4
        from fastapi import HTTPException
        from app.api.v1.bookings import cancel_edw_booking, respond_to_booking
        from app.api.v1.host import toggle_host_station_online
        from app.schemas.booking import BookingRespond

        driver_id = uuid4()
        host_id = uuid4()
        attacker_id = uuid4()
        booking_uuid = uuid4()
        node_uuid = uuid4()

        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.mappings.return_value.first.return_value = {
            "session_fact_id": 201,
            "booking_natural_uuid": booking_uuid,
            "driver_party_id": driver_id,
            "host_party_id": host_id,
            "session_stat_cd": 4001,
        }
        mock_db.execute.return_value = mock_exec

        # 1. Unrelated attacker cannot cancel driver's booking
        with self.assertRaises(HTTPException) as ctx:
            await cancel_edw_booking(booking_uuid, current_user={"party_id": attacker_id}, db=mock_db)
        self.assertEqual(ctx.exception.status_code, 403)

        # 2. Driver (non-host) cannot approve/reject their own booking via /respond
        with self.assertRaises(HTTPException) as ctx:
            await respond_to_booking(
                booking_uuid,
                BookingRespond(accept=True),
                current_user={"party_id": driver_id},
                db=mock_db,
            )
        self.assertEqual(ctx.exception.status_code, 403)

        # 3. Unrelated host cannot toggle another host's station online/offline
        mock_db.scalar.return_value = host_id
        with self.assertRaises(HTTPException) as ctx:
            await toggle_host_station_online(
                node_id=str(node_uuid),
                is_online=False,
                current_user={"party_id": attacker_id},
                db=mock_db,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_gate_pass_pin_brute_force_rate_limit_429(self):
        """Verifies that 5 consecutive wrong Gate-Pass PIN attempts trigger a 429 Too Many Requests lockout."""
        from uuid import uuid4
        from fastapi import HTTPException
        from app.api.v1.bookings import verify_booking_gate_pass_pin

        booking_uuid = uuid4()
        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.mappings.return_value.first.return_value = {
            "session_fact_id": 202,
            "booking_natural_uuid": booking_uuid,
            "gate_pass_pin_num": 544555,
            "station_title": "Test Charger",
        }
        mock_db.execute.return_value = mock_exec

        for _ in range(5):
            with self.assertRaises(HTTPException) as ctx:
                await verify_booking_gate_pass_pin(booking_uuid, {"pin_code": "000000"}, db=mock_db)
            self.assertEqual(ctx.exception.status_code, 400)

        # 6th attempt even with valid PIN is blocked by 429 lockout
        with self.assertRaises(HTTPException) as ctx:
            await verify_booking_gate_pass_pin(booking_uuid, {"pin_code": "544555"}, db=mock_db)
        self.assertEqual(ctx.exception.status_code, 429)

    async def test_otp_preview_omitted_in_production_and_p2p_gate_instructions_masked(self):
        """Verifies otp_preview is None when APP_ENV=production and P2P gate instructions are masked in public discovery."""
        from unittest.mock import patch
        from uuid import uuid4
        from decimal import Decimal
        from app.api.v1.auth import send_registration_otp
        from app.schemas.auth import SendOtpRequest
        from app.api.v1.discovery import map_edw_station_row

        mock_db = AsyncMock()
        with patch("app.api.v1.auth._fetch_edw_party_by_email", new_callable=AsyncMock, return_value=None), \
             patch("app.api.v1.auth.send_otp_email", new_callable=AsyncMock, return_value=True), \
             patch("app.api.v1.auth.settings") as mock_settings:
            mock_settings.APP_ENV = "production"
            res = await send_registration_otp(
                SendOtpRequest(email="prod_user@voltmate.in", purpose="REGISTER"),
                db=mock_db,
            )
            self.assertIsNone(res.otp_preview)

        # Public discovery masks P2P_HOME private gate instructions
        sample_row = {
            "node_id": uuid4(),
            "host_party_id": uuid4(),
            "node_category_std_code": "NCAT_P2P_HOME",
            "node_category_label": "P2P Home Charger",
            "station_title": "Villa 12 Home Wallbox",
            "station_description": "7.4 kW Type-2",
            "connector_medium_label": "Type-2 AC",
            "latitude": 10.0159,
            "longitude": 76.3419,
            "street_address": "Kakkanad",
            "society_name": "Green Villa",
            "gate_instructions": "Secret keypad code 9182 at Side Gate B",
            "connector_std_code": "CONN_TYPE2_AC",
            "rated_power_kw": 7.4,
            "energy_rate_inr": Decimal("11.50"),
            "parking_rate_hr_inr": Decimal("15.00"),
            "oper_status_std_code": "NSTAT_AVAILABLE",
        }
        masked_node = map_edw_station_row(sample_row, mask_private_p2p=True)
        self.assertNotIn("9182", masked_node.gate_instructions or "")
        unmasked_node = map_edw_station_row(sample_row, mask_private_p2p=False)
        self.assertIn("9182", unmasked_node.gate_instructions or "")


class TestPhase7UnitIntegrationAndE2E(unittest.IsolatedAsyncioTestCase):
    """Phase 7 Comprehensive Unit, API Error Envelope, Config Validation & Full E2E Journey Tests."""

    def test_pricing_engine_gst_and_fee_breakdown_unit_cases(self):
        """Unit-tests PricingEngine.calculate_gst_and_fee_breakdown across zero, fractional, and large INR amounts."""
        for amount_str in ("0.00", "72.45", "187.50", "354.00", "2360.00"):
            tot = Decimal(amount_str)
            res = PricingEngine.calculate_gst_and_fee_breakdown(tot)
            self.assertEqual(
                res["taxable_value_inr"] + res["cgst_inr"] + res["sgst_inr"],
                res["total_settled_inr"],
            )
            self.assertEqual(
                res["platform_fee_inr"] + res["host_net_payout_inr"],
                res["total_settled_inr"],
            )

    def test_api_error_envelope_and_production_config_validation(self):
        """Verifies standardized { code, message, detail, details, requestId } error shape and fail-fast production config."""
        from app.schemas.common import ApiResponse, ErrorDetail, APIResponseMeta
        from app.core.config import Settings

        meta = APIResponseMeta(request_id="vm_req_test123", path="/api/v1/bookings", method="POST")
        err_resp = ApiResponse.fail(
            message="Validation failed",
            status_code=422,
            errors=[ErrorDetail(field="estimatedKwh", message="Must be > 0", error_code="ERR_MIN_VALUE")],
            meta=meta,
        )
        dumped = err_resp.model_dump()
        self.assertFalse(dumped["success"])
        self.assertEqual(dumped["code"], "ERR_MIN_VALUE")
        self.assertEqual(dumped["message"], "Validation failed")
        self.assertEqual(dumped["detail"], "Validation failed")
        self.assertEqual(dumped["requestId"], "vm_req_test123")
        self.assertEqual(len(dumped["details"]), 1)

        # Fail-fast production config validation when SECRET_KEY is still dev default
        bad_prod = Settings(
            APP_ENV="production",
            SECRET_KEY="voltmate_dev_secret_jwt_encryption_key_32char_minimum",
            DATABASE_URL=None,
            POSTGRES_PASSWORD="",
        )
        with self.assertRaises(RuntimeError):
            bad_prod.validate_production_config()

        good_prod = Settings(
            APP_ENV="production",
            SECRET_KEY="prod_live_random_secret_key_64_chars_minimum_entropy_verified",
            DATABASE_URL="postgresql+asyncpg://user:pass@db.voltmate.co.in:5432/voltmate_edw",
        )
        good_prod.validate_production_config()

    async def test_e2e_driver_to_host_full_lifecycle_journey(self):
        """
        End-to-end journey test across all 7 flows:
        Wallet Top-Up -> Slot Booking Hold (6005) -> PIN Check-In -> Session Stop & Settlement (6006, 6002, 6003) -> 18% GST Invoice.
        """
        from unittest.mock import patch
        from uuid import uuid4, UUID
        from app.api.v1.bookings import (
            create_quick_edw_booking,
            QuickBookingEdwPayload,
            verify_booking_gate_pass_pin,
            complete_charging_session,
            get_booking_gst_invoice,
        )
        from app.schemas.booking import CompleteSessionRequest

        driver_uuid = uuid4()
        host_uuid = uuid4()
        node_uuid = uuid4()
        balances = {str(driver_uuid): Decimal("500.00"), str(host_uuid): Decimal("0.00")}
        held_by_session = {}

        async def fake_get_bal(_db, pid, for_update=False):
            return (1 if str(pid) == str(driver_uuid) else 2), balances[str(pid)]

        async def fake_append_ledger(
            db, party_id, txn_type_cd, dr_cr_ind, amount_inr, session_fact_id=None, allow_negative=False
        ):
            amt = Decimal(str(amount_inr)).quantize(Decimal("0.01"))
            if dr_cr_ind == "D":
                balances[str(party_id)] -= amt
                if txn_type_cd == 6005 and session_fact_id:
                    held_by_session[int(session_fact_id)] = amt
            else:
                balances[str(party_id)] += amt
            return {"txn_type_cd": txn_type_cd, "running_balance_inr": float(balances[str(party_id)])}

        async def fake_release_hold(db, session_fact_id, driver_party_id):
            held = held_by_session.pop(int(session_fact_id), Decimal("0.00"))
            if held > Decimal("0.00"):
                balances[str(driver_party_id)] += held
            return {"released_inr": float(held)}

        mock_db = AsyncMock()
        tariff_res = MagicMock()
        tariff_res.mappings.return_value.first.return_value = {
            "tariff_sk": 101,
            "energy_rate_inr": Decimal("11.50"),
            "parking_rate_hr_inr": Decimal("15.00"),
            "host_party_id": host_uuid,
        }
        mock_db.execute.return_value = tariff_res
        mock_db.scalar.side_effect = [1, 2, 3, 901]

        with patch("app.api.v1.bookings.get_party_sk_and_balance", side_effect=fake_get_bal), \
             patch("app.api.v1.bookings.append_wallet_ledger_entry", side_effect=fake_append_ledger), \
             patch("app.api.v1.bookings._release_booking_hold_if_any", side_effect=fake_release_hold):
            # 1. Driver books slot (15 kWh @ ₹11.50/kWh = ₹172.50 hold)
            booking_res = await create_quick_edw_booking(
                QuickBookingEdwPayload(
                    stationId=str(node_uuid),
                    connectorType="Type-2 AC (7.4 kW)",
                    estimatedKwh=15.0,
                    estimatedAmountInr=172.50,
                    paymentMode="WALLET",
                    gatePassPin="654321",
                ),
                current_user={"party_id": driver_uuid},
                db=mock_db,
            )
            booking_uuid = UUID(booking_res["booking_natural_uuid"])
            self.assertEqual(balances[str(driver_uuid)], Decimal("327.50"))

            # 2. Server-side Gate-Pass PIN check-in
            session_row = {
                "session_fact_id": 901,
                "booking_natural_uuid": booking_uuid,
                "driver_party_id": driver_uuid,
                "host_party_id": host_uuid,
                "vehicle_id": uuid4(),
                "node_id": node_uuid,
                "session_stat_cd": 4002,
                "gate_pass_pin_num": 654321,
                "station_title": "Villa 12 Home Wallbox",
                "station_address": "Kakkanad, Kochi",
                "host_full_name": "Arun Host",
                "driver_full_name": "Nidhin Driver",
                "vehicle_rc_plate": "KL-07-CS-4921",
                "connector_label": "Type-2 AC (7.4 kW)",
                "sched_start_ts": datetime.now(timezone.utc),
                "sched_end_ts": datetime.now(timezone.utc) + timedelta(hours=1),
                "historical_energy_rate_inr": Decimal("11.50"),
                "historical_parking_rate_inr": Decimal("15.00"),
                "delivered_kwh": Decimal("12.000"),
                "energy_cost_inr": Decimal("138.00"),
                "parking_cost_inr": Decimal("15.00"),
                "total_settled_inr": Decimal("153.00"),
            }
            pin_res_mock = MagicMock()
            pin_res_mock.mappings.return_value.first.return_value = session_row
            mock_db.execute.return_value = pin_res_mock

            pin_check = await verify_booking_gate_pass_pin(
                booking_uuid,
                {"pin_code": "654321"},
                db=mock_db,
            )
            self.assertTrue(pin_check["verified"])

            # 3. Complete session (12.0 kWh delivered -> ₹138.00 energy + ₹15.00 parking = ₹153.00 total)
            settled_row = {**session_row, "session_stat_cd": 4003}
            res_before = MagicMock()
            res_before.mappings.return_value.first.return_value = session_row
            res_after = MagicMock()
            res_after.mappings.return_value.first.return_value = settled_row
            mock_db.execute.side_effect = [res_before, MagicMock(), res_after, res_after]

            completed = await complete_charging_session(
                booking_id=booking_uuid,
                payload=CompleteSessionRequest(end_meter_reading=12.0),
                current_user={"party_id": driver_uuid},
                db=mock_db,
            )
            self.assertEqual(completed.total_amount_inr, Decimal("153.00"))
            # Driver balance: 327.50 + 172.50 (hold released) - 153.00 (final bill) = ₹347.00
            self.assertEqual(balances[str(driver_uuid)], Decimal("347.00"))
            # Host balance: 153.00 - 5% platform fee (7.65) = ₹145.35
            self.assertEqual(balances[str(host_uuid)], Decimal("145.35"))

            # 4. Fetch 18% GST tax invoice
            invoice = await get_booking_gst_invoice(
                booking_id=booking_uuid,
                current_user={"party_id": driver_uuid},
                db=mock_db,
            )
            self.assertEqual(invoice["total_settled_inr"], 153.0)
            self.assertEqual(
                round(invoice["taxable_value_inr"] + invoice["cgst_inr"] + invoice["sgst_inr"], 2),
                153.0,
            )


class TestPhase1LocationAndDataCorrectness(unittest.IsolatedAsyncioTestCase):
    """
    Phase 1 Location & Data Correctness Tests:
    - Reverse-geocode locality & pincode resolution from coordinates
    - City/pin mismatch validation & auto-repair (e.g. Kakkanad/Kochi address on Payyanur pin)
    - Server-side 422 rejection on POST /host/stations when typed city mismatches GPS pin
    - Single-source station grouping across multi-connector EDW rows (`group_edw_station_rows`)
    """

    def test_reverse_geocode_locality_and_city_pin_mismatch_validation(self):
        from app.core.validators import (
            resolve_indian_locality_from_coords,
            validate_address_matches_coordinates,
            repair_mismatched_station_address,
        )

        # Payyanur coordinates -> Payyanur, Kannur, Kerala 670307
        pnr = resolve_indian_locality_from_coords(12.1045, 75.2058)
        self.assertEqual(pnr["city"], "Payyanur")
        self.assertEqual(pnr["pincode"], 670307)

        # Matching Payyanur address at Payyanur coordinates passes validation
        ok_check = validate_address_matches_coordinates(
            "Main Road, Near Bus Stand, Payyanur",
            12.1045,
            75.2058,
        )
        self.assertTrue(ok_check["valid"])

        # Mismatched Kochi/Kakkanad/Edachira address at Payyanur coordinates (>250 km away) fails validation
        bad_check = validate_address_matches_coordinates(
            "Plot 18, Edachira Rd, Kakkanad, Kochi",
            12.1045,
            75.2058,
        )
        self.assertFalse(bad_check["valid"])
        self.assertEqual(bad_check["detected_city"], "Kochi")
        self.assertEqual(bad_check["pin_city"], "Payyanur")
        self.assertGreater(bad_check["distance_km"], 200.0)

        # Auto-repair replaces mismatched Kochi address with Payyanur locality while preserving bay suffix
        repaired = repair_mismatched_station_address(
            "Plot 18, Edachira Rd, Kakkanad, Kochi • BAY-01 (Covered Porch)",
            12.1045,
            75.2058,
        )
        self.assertIn("Payyanur", repaired)
        self.assertIn("670307", repaired)
        self.assertIn("BAY-01 (Covered Porch)", repaired)
        self.assertNotIn("Kakkanad", repaired)

    async def test_host_station_publish_blocks_city_pin_mismatch_with_422(self):
        from uuid import uuid4
        from fastapi import HTTPException
        from app.api.v1.host import (
            upsert_p2p_host_station,
            HostStationUpsertPayload,
            HostConnectorSpecPayload,
        )

        mock_db = AsyncMock()
        host_user = {"party_id": uuid4()}

        with self.assertRaises(HTTPException) as ctx:
            await upsert_p2p_host_station(
                payload=HostStationUpsertPayload(
                    title="Nidhin's Villa Covered EV Bay",
                    address="Plot 18, Edachira Rd, Kakkanad, Kochi",
                    latitude=12.1045,
                    longitude=75.2058,
                    discomBoard="KSEB",
                    connectors=[HostConnectorSpecPayload(name="15A 3-Pin Socket", powerKw=3.3, pricePerKwh=8.5)],
                ),
                current_user=host_user,
                db=mock_db,
            )
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("Kochi", ctx.exception.detail)
        self.assertIn("Payyanur", ctx.exception.detail)

    def test_single_source_station_grouping_merges_connectors_and_repairs_address(self):
        from uuid import uuid4
        from decimal import Decimal
        from app.api.v1.discovery import group_edw_station_rows

        shared_node_id = uuid4()
        host_id = uuid4()
        base_row = {
            "node_id": shared_node_id,
            "host_party_id": host_id,
            "node_category_std_code": "NCAT_P2P_HOME",
            "node_category_label": "P2P Home Charger",
            "station_title": "Payyanur Home EV Hub",
            "station_description": "Multi-Connector P2P",
            "connector_medium_label": "15A / Type-2",
            "latitude": 12.1045,
            "longitude": 75.2058,
            "street_address": "Plot 18, Edachira Rd, Kakkanad, Kochi",
            "society_name": "Payyanur Enclave",
            "gate_instructions": "Gate 2",
            "parking_rate_hr_inr": Decimal("15.00"),
            "oper_status_std_code": "NSTAT_AVAILABLE",
            "distance_km": 0.4,
        }
        rows = [
            {
                **base_row,
                "connector_std_code": "CONN_15A_AC",
                "rated_power_kw": 3.3,
                "energy_rate_inr": Decimal("8.50"),
            },
            {
                **base_row,
                "connector_std_code": "CONN_TYPE2_AC",
                "rated_power_kw": 7.4,
                "energy_rate_inr": Decimal("11.50"),
            },
        ]

        grouped = group_edw_station_rows(rows, mask_private_p2p=True)
        self.assertEqual(len(grouped), 1)
        st = grouped[0]
        self.assertEqual(st.id, shared_node_id)
        self.assertEqual(st.power_output_kw, 7.4)
        self.assertEqual(st.price_per_kwh, Decimal("8.50"))
        self.assertEqual(len(st.connector_specs or []), 2)
        self.assertIn("Payyanur", st.address_line)
        self.assertNotIn("Kakkanad", st.address_line)


if __name__ == "__main__":
    unittest.main()
