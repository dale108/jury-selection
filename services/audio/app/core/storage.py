"""MinIO storage client for audio files."""
import io
from typing import Optional
from minio import Minio
from minio.error import S3Error

from ..config import settings


class AudioStorage:
    """MinIO storage client for audio files."""
    
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False,
        )
        self.bucket = settings.minio_bucket
    
    async def ensure_bucket(self) -> None:
        """Ensure the audio bucket exists."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error as e:
            print(f"Error creating bucket: {e}")
    
    async def upload_audio(
        self,
        file_path: str,
        data: bytes,
        content_type: str = "audio/webm",
    ) -> str:
        """Upload audio data to MinIO."""
        try:
            self.client.put_object(
                self.bucket,
                file_path,
                io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            return f"{self.bucket}/{file_path}"
        except S3Error as e:
            raise Exception(f"Failed to upload audio: {e}")
    
    async def get_audio(self, file_path: str) -> Optional[bytes]:
        """Download audio data from MinIO."""
        try:
            response = self.client.get_object(self.bucket, file_path)
            return response.read()
        except S3Error:
            return None
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()
    
    async def delete_audio(self, file_path: str) -> bool:
        """Delete audio file from MinIO."""
        try:
            self.client.remove_object(self.bucket, file_path)
            return True
        except S3Error:
            return False
    
    async def get_presigned_url(self, file_path: str, expires_hours: int = 1) -> str:
        """Get a presigned URL for downloading audio."""
        from datetime import timedelta
        try:
            return self.client.presigned_get_object(
                self.bucket,
                file_path,
                expires=timedelta(hours=expires_hours),
            )
        except S3Error as e:
            raise Exception(f"Failed to get presigned URL: {e}")


# Global storage instance
audio_storage = AudioStorage()

