"""Transcription service configuration."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Transcription service settings."""
    
    # Database
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_user: str = os.getenv("POSTGRES_USER", "voirdire")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "voirdire_secret")
    postgres_db: str = os.getenv("POSTGRES_DB", "voirdire")
    
    # Redis
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # MinIO (for fetching audio)
    minio_host: str = os.getenv("MINIO_HOST", "localhost")
    minio_port: int = int(os.getenv("MINIO_PORT", "9000"))
    minio_root_user: str = os.getenv("MINIO_ROOT_USER", "minioadmin")
    minio_root_password: str = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
    minio_bucket: str = os.getenv("MINIO_BUCKET", "audio-recordings")
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Hugging Face (for pyannote)
    hf_auth_token: str = os.getenv("HF_AUTH_TOKEN", "")
    
    # Transcription settings
    whisper_model: str = "whisper-1"
    diarization_enabled: bool = True
    
    # Mock mode - use sample transcript instead of API
    use_sample_transcript: bool = os.getenv("USE_SAMPLE_TRANSCRIPT", "false").lower() == "true"
    sample_transcript_path: str = os.getenv("SAMPLE_TRANSCRIPT_PATH", "resources/sample_transcript.txt")
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def minio_endpoint(self) -> str:
        return f"{self.minio_host}:{self.minio_port}"
    
    class Config:
        env_prefix = ""


settings = Settings()

