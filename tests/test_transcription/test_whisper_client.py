"""Tests for Whisper client."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import io

from services.transcription.app.core.whisper_client import WhisperClient


class TestWhisperClient:
    """Tests for WhisperClient class."""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Create a mock OpenAI client."""
        with patch('services.transcription.app.core.whisper_client.AsyncOpenAI') as mock:
            client = MagicMock()
            mock.return_value = client
            yield client
    
    @pytest.fixture
    def whisper_client(self, mock_openai_client):
        """Create a WhisperClient instance with mocked client."""
        return WhisperClient()
    
    @pytest.mark.asyncio
    async def test_transcribe_returns_text(self, whisper_client, mock_openai_client):
        """Test that transcribe returns transcribed text."""
        # Mock the response
        mock_response = MagicMock()
        mock_response.text = "This is a test transcription."
        mock_response.segments = [
            MagicMock(text=" This is a test", start=0.0, end=2.0),
            MagicMock(text=" transcription.", start=2.0, end=4.0),
        ]
        mock_response.language = "en"
        mock_response.duration = 4.0
        
        mock_openai_client.audio.transcriptions.create = AsyncMock(
            return_value=mock_response
        )
        
        audio_data = b"fake audio data"
        result = await whisper_client.transcribe(audio_data)
        
        assert result["text"] == "This is a test transcription."
        assert len(result["segments"]) == 2
        assert result["language"] == "en"
        assert result["duration"] == 4.0
    
    @pytest.mark.asyncio
    async def test_transcribe_with_language(self, whisper_client, mock_openai_client):
        """Test transcribe with specific language."""
        mock_response = MagicMock()
        mock_response.text = "Test"
        mock_response.segments = []
        mock_response.language = "es"
        mock_response.duration = 1.0
        
        mock_openai_client.audio.transcriptions.create = AsyncMock(
            return_value=mock_response
        )
        
        audio_data = b"fake audio data"
        result = await whisper_client.transcribe(audio_data, language="es")
        
        # Verify the API was called
        mock_openai_client.audio.transcriptions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_transcribe_error_handling(self, whisper_client, mock_openai_client):
        """Test that transcribe raises exception on error."""
        mock_openai_client.audio.transcriptions.create = AsyncMock(
            side_effect=Exception("API Error")
        )
        
        audio_data = b"fake audio data"
        
        with pytest.raises(Exception) as exc_info:
            await whisper_client.transcribe(audio_data)
        
        assert "Whisper transcription failed" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_transcribe_with_timestamps(self, whisper_client, mock_openai_client):
        """Test transcribe_with_timestamps returns segments."""
        mock_response = MagicMock()
        mock_response.text = "Hello world"
        mock_response.segments = [
            MagicMock(text="Hello", start=0.0, end=1.0),
            MagicMock(text="world", start=1.0, end=2.0),
        ]
        mock_response.language = "en"
        mock_response.duration = 2.0
        
        mock_openai_client.audio.transcriptions.create = AsyncMock(
            return_value=mock_response
        )
        
        audio_data = b"fake audio data"
        segments = await whisper_client.transcribe_with_timestamps(audio_data)
        
        assert len(segments) == 2
        assert segments[0]["text"] == "Hello"
        assert segments[0]["start"] == 0.0
        assert segments[0]["end"] == 1.0

