import asyncio
import json
import logging
from typing import Dict, Set, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.services.telemetry_engine import telemetry_physics
from app.services.redis_service import redis_service
from app.services.ocpp_mqtt import hardware_broker

logger = logging.getLogger("voltmate.api.ws")
router = APIRouter(tags=["Real-Time WebSockets & Telemetry"])

class MultiClientSessionRoom:
    """Manages active WebSockets and telemetry streaming for a specific charging booking."""
    def __init__(self, booking_id: str):
        self.booking_id = booking_id
        self.clients: Set[WebSocket] = set()
        self.telemetry_task: Optional[asyncio.Task] = None
        self.elapsed_seconds = 0
        self.is_paused = False
        self.nominal_power_kw = 3.3
        self.battery_capacity_kwh = 40.5
        self.initial_soc = 32.0
        self.price_per_kwh = 8.50

    def add_client(self, ws: WebSocket):
        self.clients.add(ws)

    def remove_client(self, ws: WebSocket):
        self.clients.discard(ws)

    def has_clients(self) -> bool:
        return len(self.clients) > 0

    async def broadcast(self, message: dict):
        payload_str = json.dumps(message)
        dead = set()
        for ws in self.clients:
            try:
                await ws.send_text(payload_str)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.clients.discard(ws)

    def start_telemetry(self):
        if not self.telemetry_task or self.telemetry_task.done():
            self.telemetry_task = asyncio.create_task(self._telemetry_loop())

    def stop_telemetry(self):
        if self.telemetry_task and not self.telemetry_task.done():
            self.telemetry_task.cancel()
            self.telemetry_task = None

    async def _telemetry_loop(self):
        try:
            while True:
                await asyncio.sleep(1.0)
                if self.is_paused:
                    continue

                self.elapsed_seconds += 1

                # Physics-based telemetry computation
                telemetry = telemetry_physics.compute_tick(
                    elapsed_seconds=self.elapsed_seconds,
                    nominal_power_kw=self.nominal_power_kw,
                    battery_capacity_kwh=self.battery_capacity_kwh,
                    initial_soc=self.initial_soc,
                    price_per_kwh=self.price_per_kwh,
                )

                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "booking_id": self.booking_id,
                    **telemetry,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

                # Cache in Redis and broadcast to all connected mobile clients
                await redis_service.set_session_telemetry(self.booking_id, payload)
                await self.broadcast(payload)
        except asyncio.CancelledError:
            pass

class SessionHub:
    def __init__(self):
        self.rooms: Dict[str, MultiClientSessionRoom] = {}

    def get_or_create_room(self, booking_id: str) -> MultiClientSessionRoom:
        if booking_id not in self.rooms:
            self.rooms[booking_id] = MultiClientSessionRoom(booking_id)
        return self.rooms[booking_id]

    def remove_room_if_empty(self, booking_id: str):
        room = self.rooms.get(booking_id)
        if room and not room.has_clients():
            room.stop_telemetry()
            del self.rooms[booking_id]
            logger.info(f"Cleaned up empty session room {booking_id}")

hub = SessionHub()

@router.websocket("/ws/session/{booking_id}")
async def active_session_websocket(
    websocket: WebSocket,
    booking_id: str,
    role: str = Query("DRIVER")
):
    """
    Bidirectional WebSocket connection for live telemetry, chat, and WebRTC signaling.
    Supports Driver, Host, and Guard participants simultaneously.
    """
    await websocket.accept()
    room = hub.get_or_create_room(booking_id)
    room.add_client(websocket)
    room.start_telemetry()

    logger.info(f"Client ({role}) connected to booking session {booking_id}. Total connected: {len(room.clients)}")

    try:
        # Send initial confirmation handshake
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "booking_id": booking_id,
            "role": role,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))

        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            msg_type = data.get("type", "CHAT_MESSAGE")

            # 1. Driver <-> Host In-App Chat
            if msg_type == "CHAT_MESSAGE":
                await room.broadcast({
                    "type": "CHAT_MESSAGE",
                    "sender": role,
                    "payload": {
                        "text": data.get("payload", {}).get("text", ""),
                        "sender_id": data.get("sender_id", ""),
                    },
                    "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p")
                })

            # 2. WebRTC Signaling for Free In-App Voice Handshake
            elif msg_type in ["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE"]:
                await room.broadcast({
                    "type": msg_type,
                    "sender": role,
                    "payload": data.get("payload", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

            # 3. Emergency SOS Cut-Off
            elif msg_type == "EMERGENCY_SOS":
                logger.critical(f"🚨 EMERGENCY SOS TRIGGERED FOR BOOKING {booking_id} BY {role}")
                room.is_paused = True
                # Trigger smart relay off immediately
                hardware_broker.send_relay_command("emergency_relay", "OFF")
                await room.broadcast({
                    "type": "EMERGENCY_ALERT",
                    "sender": role,
                    "message": "Power cut-off command executed immediately. Security notified.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

            # 4. In-Session Pause / Resume
            elif msg_type == "PAUSE_SESSION":
                room.is_paused = True
                await room.broadcast({"type": "SESSION_PAUSED", "by": role})

            elif msg_type == "RESUME_SESSION":
                room.is_paused = False
                await room.broadcast({"type": "SESSION_RESUMED", "by": role})

    except WebSocketDisconnect:
        room.remove_client(websocket)
        hub.remove_room_if_empty(booking_id)
        logger.info(f"Client ({role}) disconnected from session {booking_id}")
    except Exception as e:
        logger.warning(f"WebSocket session error ({e})")
        room.remove_client(websocket)
        hub.remove_room_if_empty(booking_id)
