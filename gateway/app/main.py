"""Gateway service - API entry point for voir-dire backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import router

app = FastAPI(
    title="Voir-Dire API Gateway",
    description="Central API gateway for voir-dire backend microservices",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "voir-dire-gateway",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

