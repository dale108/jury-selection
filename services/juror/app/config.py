"""Juror service configuration."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Juror service settings."""
    
    # Database
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_user: str = os.getenv("POSTGRES_USER", "voirdire")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "voirdire_secret")
    postgres_db: str = os.getenv("POSTGRES_DB", "voirdire")
    
    # Redis
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        env_prefix = ""


settings = Settings()

