"""Audio service - handles audio recording and streaming."""
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .database import init_db
from .api.routes import router
from .core.storage import audio_storage

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from shared.redis_client import redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()
    await audio_storage.ensure_bucket()
    await redis_client.connect()
    yield
    # Shutdown
    await redis_client.disconnect()


app = FastAPI(
    title="Voir-Dire Audio Service",
    description="Handles audio recording and streaming",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "audio"}

