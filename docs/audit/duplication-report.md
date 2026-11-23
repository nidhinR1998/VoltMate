# VoltMate — Phase 0 Repo Map & Duplication Report

> **Generated**: 2026-11-23  
> **Phase**: Phase 0 — Discovery (Read-Only, Zero Code Changes)  
> **Scope**: Front-End (`mobile/src`, 20 screens, 14 components, 11 services, 4 stores) & Back-End (`backend/app`, 8 routers, 8 services, 7 ORM models, 6 schema modules, 4-schema PostgreSQL EDW)

---

## 1. Detected Stack & Repository Map

### 1.1 Technology Stack

| Layer | Detected Technology | Configuration & Entry Points |
|---|---|---|
| **Front-End (Mobile)** | React Native `0.76.6` + Expo SDK `52.0.25`, Expo Router `4.0.16`, TypeScript `5.3.3` | [package.json](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/package.json), [app.json](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/app.json), [_layout.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/_layout.tsx) |
| **State Management** | Zustand `5.0.1` + `AsyncStorage` (`@tanstack/react-query` mounted in `_layout.tsx` but unused in screens) | [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts) (`2,692` lines) |
| **Native Android Bridge** | Kotlin `1.9.25`, AndroidX Credential Manager `1.3.0`, Google Identity `1.1.1`, `NotificationCompat` | [GoogleAccountPickerModule.kt](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/android/app/src/main/java/com/voltmate/app/GoogleAccountPickerModule.kt) |
| **Maps & Routing** | WebView Leaflet (`LeafletMap.tsx`), Ola Maps / OSRM / Photon Komoot, OpenChargeMap + Overpass | [LeafletMap.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/map/LeafletMap.tsx), [hybridMapService.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/hybridMapService.ts), [realTimeEvHunter.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/realTimeEvHunter.ts) |
| **Back-End API** | Python FastAPI `>=0.115.0`, SQLAlchemy `>=2.0.35` (async) + `asyncpg`, Pydantic v2 | [main.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/main.py), [requirements.txt](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/requirements.txt) |
| **Database & Cache** | PostgreSQL (`voltmate_edw`: `ref_mdm`, `mdm_core`, `dw_dim`, `dw_fact`), Redis `>=5.1.1` (with in-memory dict fallback) | [edw_schema.sql](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/db/edw_schema.sql), [init_edw.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/db/init_edw.py), [redis_service.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/redis_service.py) |
| **Auth & Payments** | Google Sign-In (`google-auth`), Custom HS256 JWT + JTI revocation ([security.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/core/security.py)), Razorpay Orders + Webhooks ([payments.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/payments.py)) | [auth.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/auth.py), [payments.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/payments.py), [RazorpayCheckoutModal.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/RazorpayCheckoutModal.tsx) |

---

### 1.2 Full Repository Map

```text
VoltMate/
├── build_apk.sh                                    # Release APK build script (Temurin JDK 17 + Gradle)
├── docs/audit/                                     # Engineering audit & verification reports
├── backend/
│   ├── .env.example                                # Server environment variable template
│   ├── requirements.txt                            # Python dependencies
│   ├── tests/test_core_engines.py                  # Unit test suite (20 tests)
│   └── app/
│       ├── main.py                                 # FastAPI entrypoint, middleware, lifespan bootstrap
│       ├── core/
│       │   ├── config.py                           # Pydantic Settings
│       │   ├── middleware.py                       # Request tracking & exception handlers
│       │   ├── security.py                         # Bcrypt, JWT access/refresh, HMAC-SHA256 OTP
│       │   ├── smtp_mailer.py                      # HTML OTP email sender via aiosmtplib
│       │   └── validators.py                       # Indian phone, RTO plate, password, text validators
│       ├── db/
│       │   ├── edw_schema.sql                      # 4-schema PostgreSQL DDL + spatial functions + views
│       │   ├── init_edw.py                         # Automated DDL bootstrap, seed catalog & SCD2 updater
│       │   ├── seeds.py                            # Legacy ORM seed script (DEAD)
│       │   ├── session.py                          # SQLAlchemy async engine & get_db dependency
│       │   └── verify_edw.py                       # Standalone CLI EDW verifier
│       ├── models/                                 # Legacy SQLAlchemy ORM models (mostly bypassed by raw SQL)
│       │   ├── availability.py, booking.py, edw_models.py, node.py, review.py, user.py, vehicle.py
│       ├── schemas/                                # Pydantic request/response contracts
│       │   ├── auth.py, booking.py, common.py, discovery.py, node.py, user.py, vehicle.py
│       ├── services/
│       │   ├── autonomous_sync_engine.py           # Backend Overpass/OCM/Google station scraper & SCD2 ETL
│       │   ├── booking_state_machine.py            # ORM-based Booking FSM (bypassed by bookings.py router!)
│       │   ├── live_station_hunter.py              # Re-export wrapper around autonomous_sync_engine (DEAD)
│       │   ├── ocpp_mqtt.py                        # Simulated MQTT smart plug relay broker
│       │   ├── osrm_router.py                      # OSRM + Ola Maps routing & Ghat battery depletion
│       │   ├── pricing_engine.py                   # DISCOM tariff slabs, overstay & UPI URI generator
│       │   ├── redis_service.py                    # Redis client with in-memory dict fallback
│       │   └── telemetry_engine.py                 # CC/CV taper & thermal charging physics simulator
│       └── api/v1/
│           ├── auth.py                             # /api/v1/auth/* (944 lines)
│           ├── bookings.py                         # /api/v1/bookings/* (785 lines)
│           ├── discovery.py                        # /api/v1/discovery/* (447 lines)
│           ├── edw.py                              # /api/v1/edw/* (160 lines)
│           ├── host.py                             # /api/v1/host/* (697 lines)
│           ├── payments.py                         # /api/v1/payments/* (690 lines)
│           ├── vehicles.py                         # /api/v1/vehicles/* (268 lines)
│           └── ws.py                               # /ws/session/{booking_id} (187 lines)
└── mobile/
    ├── .env.example                                # Public client env template
    ├── package.json                                # React Native / Expo dependencies
    ├── android/app/src/main/java/com/voltmate/app/
    │   └── GoogleAccountPickerModule.kt            # Native Credential Manager + Local Notifications
    └── src/
        ├── theme/tokens.ts                         # Design system tokens (COLORS, SPACING, TYPOGRAPHY)
        ├── store/
        │   ├── useVoltMateEngine.ts                # Monolithic Zustand store (2,692 lines)
        │   ├── useAuthStore.ts                     # 2-line re-export alias of useVoltMateEngine
        │   ├── useModeStore.ts                     # Legacy mode store (DEAD in screens)
        │   └── useSessionStore.ts                  # Legacy WebSocket session store (DEAD in screens)
        ├── services/
        │   ├── api.ts                              # Axios client + 401 refresh interceptor
        │   ├── googleAuthService.ts                # Credential Manager Google Sign-In bridge
        │   ├── hybridMapService.ts                 # Directions & place search (duplicates routingEngine.ts)
        │   ├── indianEvCatalog.ts                  # 153 Indian EV model presets
        │   ├── localAuthRegistry.ts                # Offline local account & OTP fallback store
        │   ├── notificationService.ts              # Native push, phone call, external maps & UPI helpers
        │   ├── razorpayService.ts                  # Razorpay order, verify & host payout API client
        │   ├── realTimeEvHunter.ts                 # Client-side Overpass/OCM/Registry station fetcher (829 lines)
        │   ├── routingEngine.ts                    # Unused duplicate of hybridMapService.ts (DEAD)
        │   ├── socket.ts                           # Unused WebSocket client writing to useSessionStore (DEAD)
        │   └── upiIntent.ts                        # Unused duplicate of launchNativeUpiPayment (DEAD)
        ├── components/
        │   ├── ui/                                 # DesignSystem.tsx, EvVisuals.tsx, ActiveChargingModal.tsx,
        │   │                                       # RazorpayCheckoutModal.tsx, ToastBanner.tsx, OtpInputGrid.tsx,
        │   │                                       # GoogleIcon.tsx, Badge.tsx (DEAD), GlassCard.tsx (DEAD),
        │   │                                       # NeonButton.tsx (DEAD), KarmaContributeModal.tsx (DEAD)
        │   ├── map/LeafletMap.tsx                  # WebView Leaflet map component
        │   ├── navigation/FloatingBottomTabBar.tsx # Bottom tab navigation
        │   ├── animations/                         # LiquidBatterySkia, ModeShockwave, RadarPulsePin, SwipeToSpark (ALL DEAD)
        │   └── ocr/SmartMeterScanner.tsx           # Unused meter OCR modal (DEAD)
        └── app/
            ├── _layout.tsx, index.tsx
            ├── (auth)/                             # splash.tsx, onboarding.tsx, login.tsx, register.tsx, otp-verify.tsx, garage-setup.tsx
            ├── (driver)/                           # home.tsx (1,841L), map-radar.tsx (1,390L), booking-sheet.tsx (1,029L),
            │                                       # profile.tsx (942L), garage-wallet.tsx (801L), bookings.tsx (672L),
            │                                       # active-charge.tsx (650L), route-planner.tsx (508L), gate-pass.tsx (401L)
            └── (host)/                             # add-charger.tsx (1,437L), dashboard.tsx (780L), wallet.tsx (415L),
                                                    # incoming-requests.tsx (201L), schedule-matrix.tsx (121L)
```

---

## 2. Duplication Report

### 2.1 Duplicated Business Rules (Same Rule Implemented in Multiple Places)

| # | Business Rule | Implementation A | Implementation B | Implementation C | Drift / Inconsistency |
|---|---|---|---|---|---|
| **BR-1** | **Connector Tariff & Price Calculation (₹/kWh)** | Mobile [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L334-L364) (`DEFAULT_CONNECTOR_SPECS`: CCS2 `₹15.50`, Type-2 `₹11.50`, 15A `₹8.50`) | Mobile [realTimeEvHunter.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/realTimeEvHunter.ts#L46-L138) (`inferIndianConnectors`: CCS2 `₹15.50` or `₹16.50`, Type-2 `₹11.50` or `₹12.50`, 15A `₹8.50` or `₹9.00` or `₹9.50`) | Backend [pricing_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/pricing_engine.py#L7-L48) (`DISCOM_TARIFF_GUIDELINES`: KSEB `₹8.50`) & [autonomous_sync_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/autonomous_sync_engine.py#L310-L380) | 4 different places infer or hard-code connector tariffs with conflicting fallback numbers (`10.50` vs `11.50` vs `12.50` vs `15.50` vs `16.50`). |
| **BR-2** | **Session Bill, Platform Fee & GST Calculation** | Backend [pricing_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/pricing_engine.py#L55-L96) (`PricingEngine.calculate_session_settlement`: energy + pro-rated parking + ₹2/min overstay after 15m grace, `platform_fee = 0.00`) | Backend [bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L486-L525) (`complete_charging_session`: `delivered_kwh * rate_inr + parking_inr`, `5%` platform fee; ignores `PricingEngine`!) | Mobile [booking-sheet.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/booking-sheet.tsx#L137-L143) & [bookings.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/bookings.tsx#L51-L65) (`amount / 1.18` inline GST math in UI) | `bookings.py` does not call `PricingEngine.calculate_session_settlement`, and GST math (`total / 1.18`, `9%` CGST + `9%` SGST) is duplicated in `bookings.py:get_booking_gst_invoice` and `bookings.tsx:handleShareInvoice`. |
| **BR-3** | **Battery SoC (%), Estimated Range (km) & Charging Telemetry Physics** | Backend [telemetry_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/telemetry_engine.py#L15-L75) (`TelemetryPhysicsEngine.compute_tick`: sinusoidal voltage, CC/CV taper above 80% SoC, thermal throttle) | Mobile [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L2149-L2180) (`setInterval` in `startChargingSession`: `(powerKw / 3600) * 18`, random voltage jitter `229.4 + Math.random() * 4.2`) | Mobile [active-charge.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/active-charge.tsx#L68-L81) (separate local `setInterval` incrementing `deliveredKwh + 0.03` every `1500ms`) | Three completely independent charging telemetry loops! Worse, `active-charge.tsx` runs its own local `useState` timer instead of reading `useVoltMateEngine.activeSession`. |
| **BR-4** | **Vehicle Max Range From Battery Capacity** | Mobile [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L1126) (`cap < 10 ? 110 : Math.round(cap * 7.8)`) | Mobile [garage-wallet.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/garage-wallet.tsx#L98) (`capNum < 10 ? Math.round(capNum * 30) : Math.round(capNum * 7.6)`) | Backend [vehicles.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/vehicles.py#L225) (`round(soc_pct * 3.5, 1)`) | Three different formulas for deriving estimated range from battery kWh and SoC %. |
| **BR-5** | **Gate-Pass PIN Generation & Formatting** | Backend [security.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/core/security.py#L95-L105) (`generate_session_pin` 4-digit & `generate_gate_pass_code` 6-char alphanumeric) | Backend [bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L261) (`random.randint(100000, 999999)` 6-digit integer) | Mobile [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L1834) (`Math.floor(100000 + Math.random() * 900000).toString()`) | Client generates a 6-digit PIN and sends it to the server (`gatePassPin`), while `security.py` has unused cryptographic `SystemRandom` generators. |
| **BR-6** | **Booking Status Transitions & State Machine** | Backend [booking_state_machine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/booking_state_machine.py#L24-L312) (`BookingStateMachine` with 12 `BookingStatus` states and guard rules) | Backend [bookings.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L29-L36) (`STAT_CD_TO_ENUM` with 5 EDW integer codes `4001..4005` updated via raw `UPDATE dw_fact.fact_charging_session SET session_stat_cd = ...`) | Mobile [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts#L132) (`"UPCOMING" \| "CONFIRMED" \| "ACTIVE_CHARGING" \| "COMPLETED" \| "CANCELLED"`) | `BookingStateMachine` in `booking_state_machine.py` is **only called in unit tests**—`bookings.py` mutates `session_stat_cd` directly via raw SQL without calling `BookingStateMachine`! |
| **BR-7** | **Geodesic Distance (Haversine) & ETA Calculation** | Mobile [realTimeEvHunter.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/realTimeEvHunter.ts#L28-L44) (`calcDistanceKm`) | Backend [osrm_router.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/osrm_router.py#L140-L155) (`haversine_distance`) | Backend [autonomous_sync_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/autonomous_sync_engine.py#L195-L210) (`_haversine_km`) & [hybridMapService.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/hybridMapService.ts#L161-L163) (flat Euclidean `dLat * 111`, `dLng * 109`) | Haversine is implemented twice in Python (`osrm_router.py` and `autonomous_sync_engine.py`) and twice in TypeScript (`realTimeEvHunter.ts` and Euclidean approximation in `hybridMapService.ts`). |

---

### 2.2 Duplicated Screens, Components, Services & Functions

| # | Duplicated Artifact | Copy 1 | Copy 2 | Details & Consolidation Target |
|---|---|---|---|---|
| **DUP-1** | **Live Charging Session UI (Full Screen vs Global Modal)** | [active-charge.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/active-charge.tsx) (`650` lines) | [ActiveChargingModal.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/ActiveChargingModal.tsx) (`638` lines) | Both render the exact same Live Charging Cockpit (Live Cost, Energy Delivered, VerticalBatteryIndicator + EvCarHeroRender, 2x2 Voltage/Current/Elapsed/Remaining grid, 80%/90%/100% Smart Cut-Off chips, Pause/Stop buttons, and Payment Complete Receipt modal). `startChargingSession()` opens `ActiveChargingModal`, leaving `active-charge.tsx` as a divergent duplicate with its own local timer. |
| **DUP-2** | **EV Model Catalog Picker & Search UI** | [garage-setup.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/garage-setup.tsx) (`984` lines) | [garage-wallet.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/garage-wallet.tsx#L315-L470) & [home.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/home.tsx#L790-L985) | The Indian EV brand tabs, search filter (`INDIAN_EV_CATALOG.filter(...)`), and model card list are copy-pasted across **3 screens** (`garage-setup.tsx`, `garage-wallet.tsx`, `home.tsx`). |
| **DUP-3** | **Routing & Places Autocomplete Service** | [hybridMapService.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/hybridMapService.ts) (`180` lines) | [routingEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/routingEngine.ts) (`302` lines) | Both implement `PlaceSuggestion`, OSRM directions fetching, and Photon Komoot place autocomplete. `routingEngine.ts` is completely unused (`0` imports) and hard-codes an Ola Maps API key on line 33. |
| **DUP-4** | **UPI Deep-Link Launcher** | [notificationService.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/notificationService.ts#L50-L82) (`launchNativeUpiPayment`) | [upiIntent.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/upiIntent.ts#L11-L51) (`buildUpiUri` / `launchUpiPayment`) | Both build a `upi://pay?pa=...` URI and open it via `Linking.openURL`. `upiIntent.ts` has `0` imports. |
| **DUP-5** | **Station Scraper & Overpass/OCM Ingestion** | Mobile [realTimeEvHunter.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/realTimeEvHunter.ts) (`829` lines) | Backend [autonomous_sync_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/autonomous_sync_engine.py) (`750` lines) | Both query Overpass API + OpenChargeMap, infer connector specs by operator name, deduplicate within 75m–100m, and maintain a hardcoded fallback station registry. |
| **DUP-6** | **Host Station Creation Endpoints** | Backend [host.py:97](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/host.py#L97-L281) (`POST /api/v1/host/stations` — `upsert_p2p_host_station`) | Backend [host.py:358](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/host.py#L358-L471) (`POST /api/v1/host/nodes` & `/api/v1/hosts/chargers` — `create_charging_node`) | Two separate endpoints in `host.py` (~180 lines and ~115 lines) execute the exact same 4-table SQL `INSERT` into `mdm_charging_node`, `txt_entity_narrative`, `kv_entity_attribute`, and `dim_node_tariff_scd2`. |
| **DUP-7** | **Host Station Pause / Online Toggle Endpoints** | Backend [host.py:283](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/host.py#L283-L317) (`PATCH /api/v1/host/stations/{node_id}/toggle-online`) | Backend [host.py:497](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/host.py#L497-L525) (`PATCH /api/v1/host/nodes/{node_id}/pause`) | Both toggle `mdm_core.mdm_charging_node.oper_stat_cd` between `7101` (Available) and `7103` (Offline). |
| **DUP-8** | **SCD Type 2 Tariff Update Logic** | Backend [init_edw.py:668](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/db/init_edw.py#L668-L750) (`update_node_tariff_scd2`) | Backend [host.py:244](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/host.py#L244-L273) & [autonomous_sync_engine.py:178](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/autonomous_sync_engine.py#L178-L208) | Expiring the current `dim_node_tariff_scd2` row (`curr_row_ind = 'N'`) and inserting `version_num + 1` is written three separate times instead of calling `update_node_tariff_scd2()`. Furthermore, both `POST /api/v1/edw/tariff-scd2` and `PATCH /api/v1/host/nodes/{node_id}/tariff` expose the same function. |
| **DUP-9** | **Party Lookup SQL Queries (`_fetch_edw_party_by_*`)** | Backend [auth.py:173](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/auth.py#L173-L216) (`_fetch_edw_party_by_google_sub`) | Backend [auth.py:237](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/auth.py#L237-L318) (`_fetch_edw_party_by_email` & `_fetch_edw_party_by_id`) | Three 35-line SQL `SELECT` queries repeat the exact same 14-column projection, `JOIN`s, and `wallet_balance_inr` subquery, differing only in the `WHERE` clause (`kv.val_short_code = :gsub` vs `LOWER(c.email_addr) = :email` vs `p.party_id = :pid`). |
| **DUP-10** | **Date Dimension Upsert (`ensure_today_date_sk`)** | Backend [payments.py:182](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/payments.py#L182-L203) (`ensure_today_date_sk`) | Backend [bookings.py:203](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/bookings.py#L203-L220) (inline `INSERT INTO dw_dim.dim_date ...`) | `bookings.py` duplicates the 18-line `dw_dim.dim_date` upsert instead of calling `ensure_today_date_sk(db)`. |
| **DUP-11** | **Store State Aliases & Parallel Stores** | [useVoltMateEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useVoltMateEngine.ts) | [useAuthStore.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useAuthStore.ts), [useModeStore.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useModeStore.ts), [useSessionStore.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useSessionStore.ts) | `UserProfile` duplicates `name`/`fullName`, `phone`/`phoneNumber`, `upiId`/`upiVpa`, `role`/`activeRole`; store state duplicates `token`/`accessToken` and `setPrimaryVehicle`/`setActiveVehicle` and `approveHostRequest`/`declineHostRequest`/`respondHostRequest`. |
| **DUP-12** | **Currency, Duration & PIN Formatters** | Inline `toLocaleString("en-IN", { minimumFractionDigits: 2 })` / `.toFixed(2)` across 14 screens | Inline `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` across 5 screens (`home.tsx`, `bookings.tsx`, `booking-sheet.tsx`, `gate-pass.tsx`, `useVoltMateEngine.ts`) | No centralized `formatInr()`, `formatKwh()`, `formatGatePassPin()`, or `formatDurationHMS()` helper in `tokens.ts` or `utils/formatters.ts`. |
