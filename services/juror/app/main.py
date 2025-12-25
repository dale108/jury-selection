"""Juror service - manages juror profiles and speaker mappings."""
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .database import init_db
from .api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Voir-Dire Juror Service",
    description="Manages juror profiles and speaker mappings",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "juror"}

