"""Redis client utilities for pub/sub and caching."""
import os
import json
from typing import Any, Callable, Optional
import redis.asyncio as redis


def get_redis_url() -> str:
    """Construct Redis URL from environment variables."""
    host = os.getenv("REDIS_HOST", "localhost")
    port = os.getenv("REDIS_PORT", "6379")
    return f"redis://{host}:{port}"


class RedisClient:
    """Async Redis client wrapper for pub/sub and caching."""
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._pubsub: Optional[redis.client.PubSub] = None
    
    async def connect(self) -> None:
        """Connect to Redis."""
        self._redis = redis.from_url(
            get_redis_url(),
            encoding="utf-8",
            decode_responses=True,
        )
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()
    
    async def publish(self, channel: str, message: dict) -> None:
        """Publish a message to a channel."""
        if self._redis:
            await self._redis.publish(channel, json.dumps(message))
    
    async def subscribe(self, channel: str) -> redis.client.PubSub:
        """Subscribe to a channel."""
        if self._redis:
            self._pubsub = self._redis.pubsub()
            await self._pubsub.subscribe(channel)
            return self._pubsub
        raise RuntimeError("Redis not connected")
    
    async def get(self, key: str) -> Optional[str]:
        """Get a value from Redis."""
        if self._redis:
            return await self._redis.get(key)
        return None
    
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> None:
        """Set a value in Redis."""
        if self._redis:
            if isinstance(value, dict):
                value = json.dumps(value)
            await self._redis.set(key, value, ex=expire)
    
    async def delete(self, key: str) -> None:
        """Delete a key from Redis."""
        if self._redis:
            await self._redis.delete(key)


# Global Redis client instance
redis_client = RedisClient()


# Channel names for pub/sub
class Channels:
    """Redis channel names for inter-service communication."""
    AUDIO_CHUNK = "audio:chunk:{session_id}"
    TRANSCRIPT_READY = "transcript:ready:{session_id}"
    SESSION_STATUS = "session:status:{session_id}"
    
    @classmethod
    def audio_chunk(cls, session_id: str) -> str:
        return cls.AUDIO_CHUNK.format(session_id=session_id)
    
    @classmethod
    def transcript_ready(cls, session_id: str) -> str:
        return cls.TRANSCRIPT_READY.format(session_id=session_id)
    
    @classmethod
    def session_status(cls, session_id: str) -> str:
        return cls.SESSION_STATUS.format(session_id=session_id)

