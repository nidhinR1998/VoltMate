# ⚡ VoltMate — “Share the Spark. Power the Journey.”

> **India-Specific Peer-to-Peer (P2P) EV Charger Sharing, Route Matching & Public Grid Aggregation Platform**  
> *The "Quick Ride" of EV Charging — Verified community trust, dual Driver/Host mode toggle, energy cost-sharing credits, society gate-pass handshake, and zero-cost open-source infrastructure.*

---

## 🌟 Zero-Cost (₹0/Month) Architectural Guarantee

Every external service in the VoltMate ecosystem uses 100% free open-source self-hosted stacks or perpetual free tiers:

| Service Area | Tech Stack Component | Operating Cost |
| :--- | :--- | :--- |
| **Mobile Frontend** | React Native (Expo SDK 52+ & Expo Router v4) + NativeWind v4 | ₹0 (Open Source) |
| **Motion & Shaders** | `react-native-reanimated` v3, `@shopify/react-native-skia`, `lottie` | ₹0 (Open Source) |
| **Maps & Routing** | Ola Maps Free Tier (5M calls/mo) + OSRM + OpenFreeMap dark vector tiles | ₹0 / month |
| **On-Device Vision AI** | Google ML Kit on-device text recognition (Dashboard SOC% & Sub-meter kWh) | ₹0 (Runs locally on CPU/NPU) |
| **Backend & WebSockets** | Python FastAPI (Async REST + WebSockets) in Docker Compose | ₹0 (Self-hosted / Oracle Free Tier) |
| **Database & GIS** | PostgreSQL 16 + PostGIS 3.4 spatial radius buffering (`ST_DWithin`, `ST_Buffer`) | ₹0 (Self-hosted) |
| **Cache & Geo-Locks** | Redis 7 Alpine (TTL 5 mins for slot locks, OTP caching) | ₹0 (Self-hosted) |
| **Smart IoT Relays** | Eclipse Mosquitto (MQTT) + OCPP 1.6J toggles (Tasmota / ESPHome 16A relays) | ₹0 (Open Source) |
| **Authentication** | Google OAuth2 public cert validation + Custom HMAC-SHA256 Email OTP (Gmail SMTP / Resend free tier) | ₹0 (Free Tier) |
| **Payments** | Native NPCI UPI Deep-Linking (`upi://pay?pa=...`) + Quick Ride-style VoltCredits Ledger | ₹0 (0% Gateway Fees) |

---

## 🏗️ Repository Monorepo Structure

```text
voltmate-ecosystem/
├── docker-compose.yml              # Postgres+PostGIS, Redis, Mosquitto MQTT, FastAPI
├── mosquitto/
│   └── mosquitto.conf              # MQTT Broker configuration
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt            # FastAPI, GeoAlchemy2, PostGIS, Asyncpg, PyJWT, etc.
│   ├── alembic/                    # Database migrations
│   └── app/
│       ├── main.py                 # FastAPI application, CORS, WebSockets
│       ├── core/                   # config.py, security.py (HMAC-SHA256 OTP), smtp_mailer.py
│       ├── db/                     # session.py, PostGIS declarative Base
│       ├── models/                 # user.py, vehicle.py, node.py, booking.py, review.py
│       ├── schemas/                # Pydantic v2 strict schemas (auth, vehicle, node, booking, corridor)
│       ├── services/               # osrm_router.py, ocpp_mqtt.py, pricing_engine.py, redis_service.py
│       └── api/v1/                 # auth.py, discovery.py, bookings.py, host.py, ws.py
└── mobile/
    ├── package.json
    ├── app.json                    # Expo config with Camera, Location, Google Auth plugins
    ├── tailwind.config.js          # "Bioluminescent Kinetic Dark" design system tokens
    └── src/
        ├── app/                    # Expo Router screens
        │   ├── (auth)/             # splash.tsx, onboarding.tsx, login.tsx, register.tsx, otp-verify.tsx, garage-setup.tsx
        │   ├── (driver)/           # map-radar.tsx, route-planner.tsx, booking-sheet.tsx, gate-pass.tsx, active-charge.tsx
        │   ├── (host)/             # dashboard.tsx, add-charger.tsx, schedule-matrix.tsx, incoming-requests.tsx, wallet.tsx
        │   └── _layout.tsx         # Root provider + Dual-Core Mode Switcher transition
        ├── components/
        │   ├── animations/         # LiquidBatterySkia.tsx, ModeShockwave.tsx, RadarPulsePin.tsx, SwipeToSpark.tsx
        │   ├── ui/                 # GlassCard.tsx, NeonButton.tsx, OtpInputGrid.tsx, Badge.tsx
        │   └── ocr/                # SmartMeterScanner.tsx (VisionCamera + ML Kit)
        ├── store/                  # useAuthStore.ts, useModeStore.ts, useSessionStore.ts
        └── services/               # api.ts (Axios + auto JWT refresh), socket.ts, upiIntent.ts
```

---

## 🎨 UI/UX Design System: "Bioluminescent Kinetic Dark"

* **Deep Obsidian Canvas:** `#06090E`
* **Midnight Slate Surface:** `#0F1622` with `rgba(255, 255, 255, 0.07)` border
* **Volt Emerald (Driver Mode Accent):** `#00F59B`
* **Solar Amber (Host Mode Accent):** `#FFB800`
* **Cyber Cyan (DC Fast Grid Accent):** `#00E5FF`
* **Crimson Pulse (Overstay / Danger):** `#FF3B5C`
* **Dual-Core Switcher Shockwave:** Toggling between Driver and Host mode triggers a full-screen circular shockwave transition that morphs accent tokens smoothly across all navigation bars, cards, and buttons.
* **Liquid Battery Shader:** 3D glass battery cylinder rendered on active session screen with dynamic rising liquid waves based on SOC% and live animated neon electron particle streams.
* **Swipe-to-Spark Slider:** Replaces boring buttons with spring-loaded dragging slider accompanied by progressive haptic pulses (`expo-haptics`).

---

## 🇮🇳 India-First Localization Features

1. **State DISCOM Tariff Auto-Helper:** Pre-loaded with official domestic electricity unit rates (Kerala KSEB, Karnataka BESCOM, Maharashtra MSEDCL, Delhi Tata Power) following legal Ministry of Power cost-sharing guidelines.
2. **Society Digital Gate Pass:** Apartment and gated community entry card (MyGate / NoBrokerHood style) featuring Host Flat Number, Parking Bay approach photo, authorized vehicle RC plate (`KL-07-CD-4921`), and dynamic 4-digit start PIN / QR code for security verification.
3. **Smart Meter OCR:** On-device ML Kit recognition of analog/digital domestic sub-meters and dashboard SOC% to calculate accurate energy delivered without requiring expensive IoT smart chargers.
4. **Elevation & Ghat Route Matcher:** OSRM routing engine accounting for uphill Wh/km battery depletion on Ghat roads (Wayanad, Munnar, Lonavala) with 2km buffer polygon discovery.
5. **Zero-Gateway-Fee UPI Intent Settlement:** Directly deep-links into Google Pay, PhonePe, Paytm, or BHIM (`upi://pay?pa=...&pn=...&am=...&tr=...&cu=INR`).

---

## 🚀 Quickstart Guide

### 1. Launch Backend & Infrastructure (Docker Compose)
Ensure Docker is installed and running:
```bash
docker compose up -d
```
This spins up:
* **PostgreSQL 16 + PostGIS 3.4** on port `5432`
* **Redis 7** on port `6379`
* **Mosquitto MQTT** on port `1883`
* **FastAPI Backend** on port `8000`

### 2. Verify Backend Endpoints
Open your browser to:
* **Swagger Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **System Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### 3. Launch Mobile App (Expo)
```bash
cd mobile
npm install
npm start
```
* Press `a` for Android Emulator or `i` for iOS Simulator.
* Scan the QR code using the **Expo Go** app on your physical device.

