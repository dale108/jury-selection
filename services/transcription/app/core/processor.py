"""Transcription processor using OpenAI GPT-4o-transcribe."""
import json
import uuid
import asyncio
import re
import io
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from minio import Minio
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import TranscriptSegment
from .transcription_client import transcription_client

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from shared.redis_client import redis_client, Channels
from shared.schemas.events import AudioChunkEvent, RecordingCompleteEvent, TranscriptReadyEvent


class TranscriptionProcessor:
    """Processes complete audio recordings and produces transcripts."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.minio_client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False,
        )
        self._sample_transcript_cache = None
    
    def _load_sample_transcript(self) -> list[dict]:
        """Load and parse the sample transcript file."""
        if self._sample_transcript_cache is not None:
            return self._sample_transcript_cache
        
        transcript_path = Path(settings.sample_transcript_path)
        if not transcript_path.is_absolute() and not transcript_path.exists():
            # Try relative to project root
            project_root = Path(__file__).parent.parent.parent.parent.parent
            transcript_path = project_root / settings.sample_transcript_path
        # Also try in /app/resources (Docker container)
        if not transcript_path.exists():
            docker_path = Path("/app") / settings.sample_transcript_path
            if docker_path.exists():
                transcript_path = docker_path
        
        if not transcript_path.exists():
            print(f"Warning: Sample transcript not found at {transcript_path}", flush=True)
            return []
        
        segments = []
        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Pattern to match: [13.7s - 26.9s] A
        pattern = r'\[(\d+\.?\d*)s\s*-\s*(\d+\.?\d*)s\]\s*([A-Z])\s*\n\s*(.+?)(?=\n\[|\Z)'
        matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
        
        for match in matches:
            start_time = float(match.group(1))
            end_time = float(match.group(2))
            speaker = match.group(3)
            text = match.group(4).strip()
            text = re.sub(r'\s+', ' ', text)
            
            segments.append({
                "speaker": f"SPEAKER_{speaker}",
                "text": text,
                "start": start_time,
                "end": end_time,
            })
        
        self._sample_transcript_cache = segments
        return segments
    
    async def process_recording(self, event: RecordingCompleteEvent) -> list[TranscriptSegment]:
        """Process a complete audio recording and create transcript segments."""
        print(f"Processing recording {event.recording_id} for session {event.session_id}", flush=True)
        
        # Use sample transcript if enabled
        if settings.use_sample_transcript:
            return await self._process_with_sample_transcript(event)
        
        # Fetch complete audio from MinIO
        audio_data = await self._fetch_audio(event.file_path)
        if not audio_data:
            print(f"Failed to fetch audio from {event.file_path}", flush=True)
            return []
        
        print(f"Fetched {len(audio_data)} bytes", flush=True)
        
        # Audio is already in WAV format from frontend (PCM encoded)
        # WAV is natively supported by OpenAI API - no conversion needed
        audio_to_transcribe = audio_data
        filename = "audio.wav"
        print(f"Using WAV format (no conversion needed)", flush=True)
        
        # Transcribe with GPT-4o-transcribe-diarize
        try:
            result = await transcription_client.transcribe(audio_to_transcribe, filename=filename)
            print(f"Transcription complete: {len(result.get('segments', []))} segments", flush=True)
            print(f"Transcription text preview: {result.get('text', '')[:200]}...", flush=True)
        except Exception as e:
            print(f"Transcription error: {e}", flush=True)
            return []
        
        # Extract segments
        transcription_segments = result.get("segments", [])
        if not transcription_segments and result.get("text"):
            # Create single segment from full text
            transcription_segments = [{
                "text": result["text"],
                "start": 0,
                "end": event.duration_seconds,
                "speaker": "SPEAKER_00",
            }]
        
        if not transcription_segments:
            print("No transcription segments returned", flush=True)
            return []
        
        # Save transcript segments
        saved_segments = []
        for seg in transcription_segments:
            text = seg.get("text", "").strip()
            if not text:
                continue
                
            segment = TranscriptSegment(
                session_id=uuid.UUID(event.session_id),
                audio_recording_id=uuid.UUID(event.recording_id),
                speaker_label=seg.get("speaker", "SPEAKER_00"),
                content=text,
                start_time=seg.get("start", 0),
                end_time=seg.get("end", 0),
                confidence=0.95,
            )
            self.db.add(segment)
            saved_segments.append(segment)
        
        await self.db.commit()
        
        # Refresh to get IDs
        for seg in saved_segments:
            await self.db.refresh(seg)
        
        print(f"Saved {len(saved_segments)} transcript segments", flush=True)
        
        # Publish transcript ready events
        for segment in saved_segments:
            ready_event = TranscriptReadyEvent(
                session_id=str(segment.session_id),
                segment_id=str(segment.id),
                speaker_label=segment.speaker_label,
                content=segment.content,
                start_time=segment.start_time,
                end_time=segment.end_time,
                confidence=segment.confidence,
            )
            await redis_client.publish(
                Channels.transcript_ready(str(segment.session_id)),
                ready_event.model_dump(mode="json"),
            )
        
        return saved_segments
    
    async def _fetch_audio(self, file_path: str) -> Optional[bytes]:
        """Fetch audio data from MinIO."""
        try:
            response = self.minio_client.get_object(settings.minio_bucket, file_path)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except Exception as e:
            print(f"Failed to fetch audio: {e}", flush=True)
            return None
    
    async def _convert_audio_with_ffmpeg(self, audio_data: bytes) -> Optional[bytes]:
        """
        Use FFmpeg to re-encode/fix the audio file.
        This fixes any container issues from WebM concatenation.
        Converts to mp3 which is well-supported by the OpenAI API.
        """
        try:
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as input_file:
                input_path = input_file.name
                input_file.write(audio_data)
            
            output_path = input_path.replace('.webm', '.mp3')
            
            # Use FFmpeg to convert WebM to MP3
            # -y: overwrite output
            # -i: input file
            # -vn: no video
            # -acodec libmp3lame: use MP3 codec
            # -ar 16000: sample rate 16kHz (good for speech)
            # -ac 1: mono audio
            # -b:a 64k: bitrate
            cmd = [
                'ffmpeg', '-y',
                '-i', input_path,
                '-vn',
                '-acodec', 'libmp3lame',
                '-ar', '16000',
                '-ac', '1',
                '-b:a', '64k',
                output_path
            ]
            
            print(f"Running FFmpeg conversion...", flush=True)
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            # Log FFmpeg output for debugging
            if result.stderr:
                print(f"FFmpeg output: {result.stderr[:500]}", flush=True)
            
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}", flush=True)
                # Try to clean up
                os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)
                return None
            
            # Read the converted file
            with open(output_path, 'rb') as f:
                converted_data = f.read()
            
            # Clean up temp files
            os.unlink(input_path)
            os.unlink(output_path)
            
            print(f"FFmpeg conversion complete: {len(audio_data)} -> {len(converted_data)} bytes", flush=True)
            
            # Save a debug copy
            debug_path = "/tmp/debug_converted.mp3"
            with open(debug_path, 'wb') as f:
                f.write(converted_data)
            print(f"Debug: Saved converted audio to {debug_path}", flush=True)
            
            return converted_data
            
        except subprocess.TimeoutExpired:
            print("FFmpeg conversion timed out", flush=True)
            return None
        except Exception as e:
            print(f"FFmpeg conversion error: {e}", flush=True)
            return None
    
    async def _process_with_sample_transcript(self, event: RecordingCompleteEvent) -> list[TranscriptSegment]:
        """Process using sample transcript instead of API."""
        # Load sample transcript
        sample_segments = self._load_sample_transcript()
        
        if not sample_segments:
            print(f"Warning: No sample transcript segments found", flush=True)
            return []
        
        # Use all sample segments (since this is a complete recording)
        saved_segments = []
        for seg in sample_segments:
            segment = TranscriptSegment(
                session_id=uuid.UUID(event.session_id),
                audio_recording_id=uuid.UUID(event.recording_id),
                speaker_label=seg["speaker"],
                content=seg["text"],
                start_time=seg["start"],
                end_time=seg["end"],
                confidence=1.0,  # Sample transcript is "perfect"
            )
            self.db.add(segment)
            saved_segments.append(segment)
        
        try:
            await self.db.commit()
            
            for seg in saved_segments:
                await self.db.refresh(seg)
            
            # Publish transcript ready events
            for segment in saved_segments:
                ready_event = TranscriptReadyEvent(
                    session_id=str(segment.session_id),
                    segment_id=str(segment.id),
                    speaker_label=segment.speaker_label,
                    content=segment.content,
                    start_time=segment.start_time,
                    end_time=segment.end_time,
                    confidence=segment.confidence,
                )
                await redis_client.publish(
                    Channels.transcript_ready(str(segment.session_id)),
                    ready_event.model_dump(mode="json"),
                )
        except Exception as e:
            print(f"Error saving sample transcript segments: {e}", flush=True)
            await self.db.rollback()
            return []
        
        return saved_segments


class RecordingSubscriber:
    """Subscribes to recording complete events and processes them."""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.running = False
    
    async def start(self):
        """Start listening for recording complete events."""
        self.running = True
        print("RecordingSubscriber: Starting to listen for complete recordings...", flush=True)
        
        # Subscribe to recording complete events for all sessions
        channel = "recording:complete:*"
        
        try:
            # Get the pubsub object
            pubsub = await redis_client.subscribe(channel)
            print(f"RecordingSubscriber: Subscribed to {channel}", flush=True)
            
            # Listen for messages
            while self.running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                
                if message is None:
                    continue
                
                try:
                    print(f"RecordingSubscriber: Received message: {message}", flush=True)
                    
                    # Skip non-data messages
                    if message.get('type') not in ('message', 'pmessage'):
                        continue
                    
                    # Parse the event data
                    data = message.get('data')
                    if isinstance(data, str):
                        event_data = json.loads(data)
                    elif isinstance(data, dict):
                        event_data = data
                    else:
                        print(f"RecordingSubscriber: Unexpected data type: {type(data)}", flush=True)
                        continue
                    
                    event = RecordingCompleteEvent(**event_data)
                    
                    # Process in a new database session
                    async with self.db_session_factory() as db:
                        processor = TranscriptionProcessor(db)
                        segments = await processor.process_recording(event)
                        print(f"RecordingSubscriber: Created {len(segments)} transcript segments", flush=True)
                        
                except Exception as e:
                    import traceback
                    print(f"RecordingSubscriber: Error processing message: {e}", flush=True)
                    traceback.print_exc()
                    
        except Exception as e:
            import traceback
            print(f"RecordingSubscriber: Subscription error: {e}", flush=True)
            traceback.print_exc()
        finally:
            print("RecordingSubscriber: Stopped listening", flush=True)
    
    def stop(self):
        """Stop the subscriber."""
        self.running = False


# Keep old name for backward compatibility with main.py
ChunkSubscriber = RecordingSubscriber
