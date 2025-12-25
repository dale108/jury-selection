"""Tests for Audio storage module."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import io

from services.audio.app.core.storage import AudioStorage


class TestAudioStorage:
    """Tests for AudioStorage class."""
    
    @pytest.fixture
    def mock_minio_client(self):
        """Create a mock MinIO client."""
        with patch('services.audio.app.core.storage.Minio') as mock:
            client = MagicMock()
            mock.return_value = client
            yield client
    
    @pytest.fixture
    def storage(self, mock_minio_client):
        """Create an AudioStorage instance with mocked client."""
        return AudioStorage()
    
    @pytest.mark.asyncio
    async def test_ensure_bucket_creates_if_not_exists(self, storage, mock_minio_client):
        """Test that ensure_bucket creates bucket if it doesn't exist."""
        mock_minio_client.bucket_exists.return_value = False
        
        await storage.ensure_bucket()
        
        mock_minio_client.bucket_exists.assert_called_once()
        mock_minio_client.make_bucket.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ensure_bucket_skips_if_exists(self, storage, mock_minio_client):
        """Test that ensure_bucket skips creation if bucket exists."""
        mock_minio_client.bucket_exists.return_value = True
        
        await storage.ensure_bucket()
        
        mock_minio_client.bucket_exists.assert_called_once()
        mock_minio_client.make_bucket.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_upload_audio(self, storage, mock_minio_client):
        """Test uploading audio data."""
        audio_data = b"fake audio data"
        file_path = "test/audio.webm"
        
        result = await storage.upload_audio(file_path, audio_data)
        
        mock_minio_client.put_object.assert_called_once()
        assert file_path in result
    
    @pytest.mark.asyncio
    async def test_get_audio(self, storage, mock_minio_client):
        """Test downloading audio data."""
        mock_response = MagicMock()
        mock_response.read.return_value = b"fake audio data"
        mock_minio_client.get_object.return_value = mock_response
        
        result = await storage.get_audio("test/audio.webm")
        
        assert result == b"fake audio data"
        mock_response.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_audio_not_found(self, storage, mock_minio_client):
        """Test downloading non-existent audio."""
        from minio.error import S3Error
        mock_minio_client.get_object.side_effect = S3Error(
            "NoSuchKey", "Not Found", "test", "test", "test", "test"
        )
        
        result = await storage.get_audio("nonexistent.webm")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_audio(self, storage, mock_minio_client):
        """Test deleting audio file."""
        result = await storage.delete_audio("test/audio.webm")
        
        assert result is True
        mock_minio_client.remove_object.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_presigned_url(self, storage, mock_minio_client):
        """Test getting presigned download URL."""
        mock_minio_client.presigned_get_object.return_value = "https://example.com/signed"
        
        result = await storage.get_presigned_url("test/audio.webm")
        
        assert result == "https://example.com/signed"
        mock_minio_client.presigned_get_object.assert_called_once()

