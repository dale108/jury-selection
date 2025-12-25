"""Audio service configuration."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Audio service settings."""
    
    # Database
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_user: str = os.getenv("POSTGRES_USER", "voirdire")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "voirdire_secret")
    postgres_db: str = os.getenv("POSTGRES_DB", "voirdire")
    
    # Redis
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # MinIO
    minio_host: str = os.getenv("MINIO_HOST", "localhost")
    minio_port: int = int(os.getenv("MINIO_PORT", "9000"))
    minio_root_user: str = os.getenv("MINIO_ROOT_USER", "minioadmin")
    minio_root_password: str = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
    minio_bucket: str = os.getenv("MINIO_BUCKET", "audio-recordings")
    
    # Audio settings
    chunk_duration_seconds: float = 5.0
    sample_rate: int = 16000
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def minio_endpoint(self) -> str:
        return f"{self.minio_host}:{self.minio_port}"
    
    class Config:
        env_prefix = ""


settings = Settings()

