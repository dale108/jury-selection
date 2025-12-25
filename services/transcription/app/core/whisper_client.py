"""OpenAI Whisper API client for transcription."""
import io
from typing import Optional
from openai import AsyncOpenAI

from ..config import settings


class WhisperClient:
    """Client for OpenAI Whisper API."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.whisper_model
    
    async def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = "en",
        prompt: Optional[str] = None,
    ) -> dict:
        """
        Transcribe audio using Whisper API.
        
        Returns dict with:
        - text: The transcribed text
        - segments: List of segments with timestamps (if available)
        """
        # Create a file-like object from bytes
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.webm"
        
        try:
            # Use verbose_json to get timestamps
            response = await self.client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                language=language,
                response_format="verbose_json",
                prompt=prompt,
            )
            
            return {
                "text": response.text,
                "segments": [
                    {
                        "text": seg.text,
                        "start": seg.start,
                        "end": seg.end,
                    }
                    for seg in (response.segments or [])
                ],
                "language": response.language,
                "duration": response.duration,
            }
            
        except Exception as e:
            raise Exception(f"Whisper transcription failed: {str(e)}")
    
    async def transcribe_with_timestamps(
        self,
        audio_data: bytes,
        language: Optional[str] = "en",
    ) -> list[dict]:
        """
        Transcribe audio and return segments with timestamps.
        """
        result = await self.transcribe(audio_data, language)
        return result.get("segments", [{"text": result["text"], "start": 0, "end": result.get("duration", 0)}])


# Global client instance
whisper_client = WhisperClient()

