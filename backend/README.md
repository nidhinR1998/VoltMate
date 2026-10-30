# ⚡ VoltMate Backend Service

> **Python FastAPI + PostgreSQL 16 / PostGIS 3.4 + Redis 7 + Mosquitto MQTT**  
> *India-Specific Peer-to-Peer (P2P) EV Charger Sharing, Route Matching & Public Grid Aggregation Platform API*

---

## 🌟 Tech Stack & Infrastructure (₹0 Operating Cost)
* **Framework:** Python FastAPI (Async REST + WebSockets)
* **Spatial GIS Engine:** PostGIS 3.4 (`ST_DWithin`, `ST_Buffer`, OSRM elevation recovery)
* **Cache & Locks:** Redis 7 (TTL 5 mins atomic slot reservations & HMAC-SHA256 OTP caching)
* **IoT / Smart Plug Broker:** Eclipse Mosquitto MQTT & OCPP 1.6J WebSocket endpoints
* **Security & Auth:** Argon2/Bcrypt, Google OAuth2, HMAC-SHA256 Email OTP (Gmail SMTP / Resend)

---

## 🚀 Quick Start (Local Run)

### 1. Setup Virtual Environment
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in your database URL, Redis credentials, and SMTP configuration
```

### 3. Start Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **Swagger UI Docs:** http://localhost:8000/docs
* **Health Check:** http://localhost:8000/health
* **WebSockets Hub:** `ws://localhost:8000/api/v1/ws/charging/{session_id}`

---

## 🧪 Running Unit Tests
```bash
python -m unittest tests/test_core_engines.py
```

