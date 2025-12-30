"""OpenAI GPT-4o Transcribe API client with diarization."""
import tempfile
import os
from typing import Optional
from openai import AsyncOpenAI

from ..config import settings


class TranscriptionClient:
    """Client for OpenAI GPT-4o Transcribe API with diarization."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o-transcribe-diarize"
    
    async def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = "en",
        filename: Optional[str] = None,
    ) -> dict:
        """
        Transcribe audio using OpenAI GPT-4o Transcribe with diarization.
        
        Returns dict with:
        - text: The transcribed text
        - segments: List of segments with timestamps and speaker labels
        - language: Detected language
        - duration: Audio duration
        """
        # Determine file suffix based on filename or default to .wav
        if filename:
            if filename.endswith(".mp3"):
                suffix = ".mp3"
            elif filename.endswith(".webm"):
                suffix = ".webm"
            else:
                suffix = ".wav"
        else:
            suffix = ".wav"
        
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            temp_path = f.name
            f.write(audio_data)
        
        print(f"TranscriptionClient: Wrote {len(audio_data)} bytes to {temp_path}", flush=True)
        
        try:
            with open(temp_path, 'rb') as audio_file:
                print(f"TranscriptionClient: Calling API with model={self.model}", flush=True)
                
                response = await self.client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    language=language,
                    response_format="diarized_json",
                    extra_body={"chunking_strategy": "auto"},
                )
                
                print(f"TranscriptionClient: Got response", flush=True)
                print(f"TranscriptionClient: Response text: {getattr(response, 'text', 'N/A')[:200]}", flush=True)
                print(f"TranscriptionClient: Response segments attr: {hasattr(response, 'segments')}", flush=True)
                if hasattr(response, 'segments'):
                    print(f"TranscriptionClient: Segments count: {len(response.segments)}", flush=True)
            
            # Extract segments with speaker labels
            segments = []
            for seg in response.segments:
                segments.append({
                    "speaker": seg.speaker,
                    "text": seg.text,
                    "start": seg.start,
                    "end": seg.end,
                })
            
            # Get language (may not be available in diarized response)
            detected_language = getattr(response, 'language', language)
            
            # Calculate duration from segments
            duration = 0
            if segments:
                duration = max(seg["end"] for seg in segments)
            
            result = {
                "text": response.text,
                "segments": segments,
                "language": detected_language,
                "duration": duration,
            }
            
            speakers = set(seg["speaker"] for seg in segments)
            print(f"TranscriptionClient: {len(segments)} segments from {len(speakers)} speakers", flush=True)
            
            return result
            
        except Exception as e:
            print(f"TranscriptionClient error: {e}", flush=True)
            raise
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)


# Global client instance
transcription_client = TranscriptionClient()

