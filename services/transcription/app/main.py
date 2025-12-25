"""Transcription service - handles audio transcription and speaker diarization."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .database import init_db, AsyncSessionLocal
from .api.routes import router
from .core.processor import ChunkSubscriber
from .core.diarization import diarization_pipeline

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from shared.redis_client import redis_client

# Global subscriber task
subscriber_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    global subscriber_task
    
    # Startup
    await init_db()
    await redis_client.connect()
    
    # Initialize diarization pipeline (can be slow, do it on startup)
    # This is optional - will initialize lazily if not done here
    # await diarization_pipeline.initialize()
    
    # Start chunk subscriber in background
    subscriber = ChunkSubscriber(AsyncSessionLocal)
    subscriber_task = asyncio.create_task(subscriber.start())
    
    yield
    
    # Shutdown
    if subscriber_task:
        subscriber_task.cancel()
        try:
            await subscriber_task
        except asyncio.CancelledError:
            pass
    await redis_client.disconnect()


app = FastAPI(
    title="Voir-Dire Transcription Service",
    description="Handles audio transcription and speaker diarization",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "transcription"}

