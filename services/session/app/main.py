"""Session service - manages voir dire sessions."""
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
    title="Voir-Dire Session Service",
    description="Manages voir dire sessions",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "session"}

