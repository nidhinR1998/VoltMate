# VoltMate — Phase 0 Production Risk Report (Ranked P0 / P1 / P2)

> **Generated**: 2026-11-23  
> **Phase**: Phase 0 — Discovery (Read-Only, Zero Code Changes)  
> **Categories**: Security, Data Integrity, Concurrency, Error Handling, Performance, Accessibility, Missing Tests

---

## P0 — Critical Blockers (Security, Credentials, Data Integrity & Concurrency)

### P0-1: Plaintext Secrets Hardcoded in Python Source & Tracked Duplicate `env` Files
- **Locations**:
  - [backend/app/core/config.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/core/config.py#L10-L56): Hardcodes default production `SECRET_KEY`, `POSTGRES_PASSWORD`, `DATABASE_URL` (with ngrok host & password), `OLA_MAPS_API_KEY`, and `SMTP_PASSWORD` (`zssplzgufphgzrzb` Gmail App Password) directly in Python source defaults.
  - [backend/app/db/init_edw.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/db/init_edw.py#L48-L58): `_connect_pg_with_fallback()` hardcodes `"Smart_Bike@04"`, `"ABC 123"`, `"ABC123"`, and `"0.tcp.in.ngrok.io"` in Python source.
  - [mobile/src/services/routingEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/routingEngine.ts#L33): Hardcodes `DEFAULT_OLA_MAPS_API_KEY = "x41faa8s8O0ARqrXjAlOToelM9sSG0"`.
  - Stray files `backend/env` and `mobile/env (1)` on disk contain raw environment variables outside `.env`.
- **Impact**: Anyone with repo access obtains live database credentials, Gmail SMTP app passwords, and JWT signing keys.
- **Remediation (Phase 3 & Phase 5)**: Delete `backend/env`, `mobile/env (1)`, and `routingEngine.ts`; remove all default secret values from `config.py` and `init_edw.py`; validate required secrets at startup (fail fast).

### P0-2: Unauthenticated / IDOR Vulnerabilities on Mutating & Financial Endpoints
- **Locations**:
  - [backend/app/api/v1/bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L84-L162): Uses `get_optional_current_user` and falls back to `user_id` query param or `PARTY_DRIVER_NIDHIN` (`11111111-1111-4111-8111-111111111101`) when unauthenticated!
  - [backend/app/api/v1/bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L350-L570): `PATCH /bookings/{id}/respond`, `POST /bookings/{id}/start-session`, `POST /bookings/{id}/complete-session`, `POST /bookings/{id}/cancel`, and `PATCH /bookings/{id}/reschedule` do **not** verify that the caller is the booking's `driver_party_id` or `host_party_id` (IDOR).
  - [backend/app/api/v1/host.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/host.py#L283-L336): `PATCH /host/stations/{node_id}/toggle-online` and `DELETE /host/stations/{node_id}` do not require authentication or verify `host_party_id == current_user["party_id"]`.
  - [backend/app/api/v1/edw.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/edw.py#L95-L143): `GET /api/v1/edw/ledger` and `GET /api/v1/edw/party-audit-scd4` dump the entire platform's wallet ledger and party audit history without admin authentication.
- **Impact**: Any caller can cancel/complete another driver's session, pause/delete another host's charger, or read all users' wallet transactions.
- **Remediation (Phase 5)**: Add a strict `get_current_user` dependency (raising `401`) on all protected endpoints and enforce ownership checks (`driver_party_id == current_user["party_id"]` or `host_party_id == current_user["party_id"]`).

### P0-3: OTP Preview Leaked in Production API Response & Server Logs
- **Location**: [backend/app/api/v1/auth.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/auth.py#L485-L497) (`send_registration_otp`) returns `otp_preview=otp` in the JSON response of `POST /api/v1/auth/register/send-otp` and logs `logger.warning(f"... OTP {otp} active for {email}")`.
- **Impact**: Any attacker can request an OTP for any victim's email address (`purpose="LOGIN"` or `"RESET"`) and read the 6-digit OTP directly from the HTTP response body to take over the account!
- **Remediation (Phase 5)**: Never log plaintext OTPs; gate `otp_preview` strictly behind `settings.APP_ENV == "development"` (or remove from response in production).

### P0-4: Race Condition on Concurrent Wallet Ledger Updates & Double Booking
- **Locations**:
  - [backend/app/api/v1/payments.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/payments.py#L206-L270): `get_party_sk_and_balance` reads `SELECT running_bal_inr ... ORDER BY ledger_fact_id DESC LIMIT 1` without row-level locking (`FOR UPDATE` on `dim_party_scd2`), so two concurrent debits/credits for the same user can compute `new_bal` from the same stale `current_bal`.
  - [backend/app/api/v1/bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L230-L285): Slot overlap check (`SELECT booking_natural_uuid ... WHERE tariff_sk = :tsk`) does not lock the `dim_node_tariff_scd2` row (`FOR UPDATE`) or acquire `redis_service.acquire_slot_lock` before inserting into `fact_charging_session`.
- **Impact**: Concurrent requests can double-book a single charger connector or corrupt a user's running wallet balance.
- **Remediation (Phase 5)**: Lock the user's active `dim_party_scd2` row (`SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y' FOR UPDATE`) inside `get_party_sk_and_balance`, and lock the `dim_node_tariff_scd2` row (`FOR UPDATE`) during booking creation/reschedule.

### P0-5: Gate-Pass PIN Brute-Force Vulnerability
- **Location**: [backend/app/api/v1/bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L644-L678) (`POST /api/v1/bookings/{booking_id}/verify-pin`) performs constant-time comparison but has **no rate limit or attempt counter** per `booking_id`.
- **Impact**: A 4-digit/6-digit PIN can be brute-forced without lockout.
- **Remediation (Phase 5)**: Enforce `redis_service.check_login_allowed(f"pin_verify:{booking_id}", max_attempts=5)` and record failed attempts.

---

## P1 — High-Priority Risks (Architecture, Privacy, Offline Fallbacks & Memory Leaks)

### P1-1: Monolithic 2,692-Line Store (`useVoltMateEngine.ts`) & 1,000+ Line Screens
- **Locations**:
  - [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts) (`2,692` lines) mixes auth, vehicles, station discovery, bookings, live charging telemetry timers, wallet top-ups, host requests, host payouts, notifications, and 550 lines of hardcoded initial seed arrays (`INITIAL_STATIONS`, `INITIAL_BOOKINGS`, `INITIAL_HISTORY`, `INITIAL_TXNS`, `INITIAL_HOST_REQUESTS`).
  - [home.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/home.tsx) (`1,841` lines), [add-charger.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(host)/add-charger.tsx) (`1,437` lines), [map-radar.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/map-radar.tsx) (`1,390` lines), [booking-sheet.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/booking-sheet.tsx) (`1,029` lines), [garage-setup.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/garage-setup.tsx) (`984` lines), [profile.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/profile.tsx) (`942` lines).
- **Impact**: High cognitive load, duplicated modal UI across screens, and full-tree re-renders on every 1-second charging telemetry tick because components subscribe to the entire `useVoltMateEngine()` store without selectors.

### P1-2: Host Privacy Exposure (Exact Home Phone & Gate Instructions Before Booking)
- **Location**: [backend/app/api/v1/discovery.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/discovery.py#L58-L95) & [edw_schema.sql](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/db/edw_schema.sql#L431-L479) (`vw_resolved_stations` exposes `host_phone_e164` and `gate_instructions` to all public discovery queries before a confirmed booking).
- **Impact**: P2P residential hosts' private phone numbers and apartment gate entry instructions are exposed to unbooked anonymous browsers.
- **Remediation (Phase 5)**: Redact or mask `gate_instructions` and `host_phone_e164` in public discovery responses for `P2P_HOME` / `P2P_RWA` stations; reveal full gate instructions and host phone only in confirmed booking details.

### P1-3: Silent Offline Auth & Mutation Swallowing in Mobile
- **Locations**:
  - [login.tsx:125-151](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/login.tsx#L125-L151), [register.tsx:143-172](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/register.tsx#L143-L172), [otp-verify.tsx:91-130](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/otp-verify.tsx#L91-L130): When `isServerUnreachableError(err)` is true, the app fabricates a local JWT (`vm_local_jwt_...`) using [localAuthRegistry.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/localAuthRegistry.ts) (which also stores plaintext passwords in `AsyncStorage`!).
  - [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts): `try { await apiClient.post(...) } catch {}` blocks silently ignore backend errors on vehicle creation, booking creation, and station updates, causing client `AsyncStorage` state to diverge from PostgreSQL EDW.
- **Impact**: Plaintext passwords in `AsyncStorage` (`localAuthRegistry.ts:13`), fake `vm_local_jwt_*` tokens that fail `401` when the backend comes back online, and silent data loss when a server write fails.

### P1-4: Auth Tokens Stored in Unencrypted `AsyncStorage` Instead of `expo-secure-store`
- **Location**: [useVoltMateEngine.ts:263,1037](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L1037) stores JWT `accessToken` in `AsyncStorage` (`@voltmate_jwt_token_v8`) instead of `expo-secure-store` (which is already installed in `package.json`), and does not persist `refreshToken` across app restarts (`initializeAuth` at line 877 only reads `STORAGE_KEYS.TOKEN`, leaving `refreshToken: null` after restart!).
- **Impact**: After closing and reopening the app, `refreshToken` is `null`, so when the 15-minute access token expires, the 401 refresh interceptor in `api.ts:69` cannot refresh and logs the user out!

---

## P2 — Medium-Priority Risks (Performance, Operations, Hardcoded Region Copy & Missing Tests)

### P2-1: Performance — Synchronous EDW DDL Bootstrap & Live External Scraping on Request Path
- **Locations**:
  - [backend/app/api/v1/discovery.py:125](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/discovery.py#L125): `GET /api/v1/discovery/nearby` calls `sync_and_resolve_nearby_stations`, which makes live external HTTP requests to Google Places, OpenChargeMap, and Overpass API *synchronously during the user's GET request* before querying PostgreSQL.
  - [backend/app/api/v1/payments.py:92](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/payments.py#L92): `ensure_payment_tables_and_ref_codes(db)` runs `CREATE TABLE IF NOT EXISTS` and `14` `INSERT ... ON CONFLICT DO NOTHING` queries on every wallet/payment request instead of once during startup (`init_edw.py`).

### P2-2: Hardcoded "Kochi" / "Kerala" Region Copy & "$0.50/kWh" Onboarding Copy
- **Locations**:
  - [useVoltMateEngine.ts:1238-1239](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L1238-L1239): `"Managing your Kochi P2P charger & ₹ INR payouts."` / `"Exploring nearby Kochi EV chargers & active sessions."`
  - [onboarding.tsx:44,55](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/onboarding.tsx#L44-L55): `"Type A, CHAdeMO, and Type B connector slots"` and `"$0.50/kWh"`.
  - [hybridMapService.ts:77,100](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/hybridMapService.ts#L77-L100): Appends `", Kerala, India"` / `" Kerala"` to every place search query.

### P2-3: Wide-Open CORS (`allow_origins=["*"]` with `allow_credentials=True`) & Missing Pagination
- **Locations**:
  - [backend/app/main.py:60-66](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/main.py#L60-L66): `CORSMiddleware` sets `allow_origins=["*"]` with `allow_credentials=True`.
  - List endpoints (`GET /api/v1/bookings/`, `GET /api/v1/vehicles`, `GET /api/v1/host/nodes`, `GET /api/v1/edw/*`) have no `limit`/`offset` pagination parameters.

### P2-4: Missing Characterization & Integration Tests for Critical Flows
- **Gaps**:
  - No frontend unit/characterization tests exist in `mobile/` for store actions, formatters, or price/SoC calculations.
  - Backend tests (`test_core_engines.py`) test `BookingStateMachine`, `PricingEngine`, `verify_google_id_token`, and `payments.py` functions, but do not yet test IDOR ownership checks, PIN brute-force rate limiting, or host station CRUD endpoints.
