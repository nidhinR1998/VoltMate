import json
import logging
from typing import Optional, Any, Callable
try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None
from app.core.config import settings

logger = logging.getLogger("voltmate.redis")

# Atomic Lua script for safe distributed lock release
LUA_RELEASE_LOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

class RedisService:
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None
        self._in_memory_cache: dict = {}
        self._in_memory_locks: dict = {}

    async def connect(self):
        try:
            self.client = aioredis.from_url(
                settings.get_redis_url(),
                encoding="utf-8",
                decode_responses=True
            )
            await self.client.ping()
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to live Redis ({e}). Running in resilient fallback mode.")
            self.client = None

    async def close(self):
        if self.client:
            await self.client.aclose()

    # =========================================================
    # Distributed Locking (Redlock pattern with atomic token check)
    # =========================================================
    async def acquire_slot_lock(
        self,
        node_id: str,
        start_timestamp: int,
        lock_token: str,
        ttl_seconds: int = 300
    ) -> bool:
        """
        Acquires exclusive lock for a timeslot using token-based key.
        Prevents race conditions where two drivers try reserving the same bay simultaneously.
        """
        key = f"lock:slot:{node_id}:{start_timestamp}"
        if self.client:
            acquired = await self.client.set(key, lock_token, nx=True, ex=ttl_seconds)
            return bool(acquired)
        else:
            if key not in self._in_memory_locks:
                self._in_memory_locks[key] = lock_token
                return True
            return False

    async def release_slot_lock(
        self,
        node_id: str,
        start_timestamp: int,
        lock_token: str
    ) -> bool:
        """
        Atomically releases the lock only if the token matches.
        Prevents releasing a lock acquired by another client after TTL expiry.
        """
        key = f"lock:slot:{node_id}:{start_timestamp}"
        if self.client:
            try:
                res = await self.client.eval(LUA_RELEASE_LOCK_SCRIPT, 1, key, lock_token)
                return res == 1
            except Exception as e:
                logger.warning(f"Error releasing lock via Lua ({e}), falling back to direct del")
                curr = await self.client.get(key)
                if curr == lock_token:
                    await self.client.delete(key)
                    return True
                return False
        else:
            if self._in_memory_locks.get(key) == lock_token:
                del self._in_memory_locks[key]
                return True
            return False

    # =========================================================
    # OTP Caching with TTL & Brute-Force Rate Limiting
    # =========================================================
    async def set_otp(self, email: str, hashed_otp: str, ttl_seconds: int = 300) -> bool:
        key = f"otp:{email.lower().strip()}"
        data = {
            "hash": hashed_otp,
            "attempts": 0,
            "max_attempts": 3
        }
        if self.client:
            await self.client.set(key, json.dumps(data), ex=ttl_seconds)
        else:
            self._in_memory_cache[key] = data
        return True

    async def get_and_check_otp(self, email: str) -> Optional[dict]:
        key = f"otp:{email.lower().strip()}"
        if self.client:
            raw = await self.client.get(key)
            if not raw:
                return None
            return json.loads(raw)
        return self._in_memory_cache.get(key)

    async def increment_otp_attempts(self, email: str, current_data: dict, ttl_seconds: int = 300):
        key = f"otp:{email.lower().strip()}"
        current_data["attempts"] += 1
        if self.client:
            await self.client.set(key, json.dumps(current_data), ex=ttl_seconds)
        else:
            self._in_memory_cache[key] = current_data

    async def delete_otp(self, email: str):
        key = f"otp:{email.lower().strip()}"
        if self.client:
            await self.client.delete(key)
        else:
            self._in_memory_cache.pop(key, None)

    # =========================================================
    # Active Session Live Telemetry Cache & Pub/Sub
    # =========================================================
    async def set_session_telemetry(self, booking_id: str, telemetry: dict, ttl_seconds: int = 3600):
        key = f"telemetry:session:{booking_id}"
        payload = json.dumps(telemetry)
        if self.client:
            await self.client.set(key, payload, ex=ttl_seconds)
            # Publish to pub/sub channel for multi-server WebSocket scale
            await self.client.publish(f"channel:session:{booking_id}", payload)
        else:
            self._in_memory_cache[key] = telemetry

    async def get_session_telemetry(self, booking_id: str) -> Optional[dict]:
        key = f"telemetry:session:{booking_id}"
        if self.client:
            raw = await self.client.get(key)
            if raw:
                return json.loads(raw)
        return self._in_memory_cache.get(key)

    # =========================================================
    # Auto-Expiry Tracking for Booking Requests
    # =========================================================
    async def register_booking_expiration(self, booking_id: str, ttl_seconds: int = 300):
        key = f"booking:pending:{booking_id}"
        if self.client:
            await self.client.set(key, "pending", ex=ttl_seconds)

    async def clear_booking_expiration(self, booking_id: str):
        key = f"booking:pending:{booking_id}"
        if self.client:
            await self.client.delete(key)

redis_service = RedisService()
