"""Gateway configuration."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Gateway service settings."""
    
    # Service URLs
    audio_service_url: str = os.getenv("AUDIO_SERVICE_URL", "http://localhost:8001")
    transcription_service_url: str = os.getenv("TRANSCRIPTION_SERVICE_URL", "http://localhost:8002")
    juror_service_url: str = os.getenv("JUROR_SERVICE_URL", "http://localhost:8003")
    session_service_url: str = os.getenv("SESSION_SERVICE_URL", "http://localhost:8004")
    
    # Server settings
    host: str = os.getenv("GATEWAY_HOST", "0.0.0.0")
    port: int = int(os.getenv("GATEWAY_PORT", "8000"))
    
    # CORS settings
    cors_origins: list[str] = ["*"]
    
    class Config:
        env_prefix = ""


settings = Settings()

