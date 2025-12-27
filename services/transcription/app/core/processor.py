"""Transcription processor that combines Whisper and diarization."""
import json
import uuid
import asyncio
import re
from pathlib import Path
from typing import Optional
from minio import Minio
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import TranscriptSegment
from .whisper_client import whisper_client
from .diarization import diarization_pipeline

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from shared.redis_client import redis_client, Channels
from shared.schemas.events import AudioChunkEvent, TranscriptReadyEvent


class TranscriptionProcessor:
    """Processes audio chunks and produces transcripts."""
    
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
            print(f"Warning: Sample transcript not found at {transcript_path}")
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
    
    async def process_chunk(self, event: AudioChunkEvent) -> list[TranscriptSegment]:
        """Process an audio chunk and create transcript segments."""
        # Use sample transcript if enabled
        if settings.use_sample_transcript:
            return await self._process_with_sample_transcript(event)
        
        # Fetch audio from MinIO
        audio_data = await self._fetch_audio(event.file_path)
        if not audio_data:
            return []
        
        # Transcribe with Whisper
        transcription_segments = await whisper_client.transcribe_with_timestamps(audio_data)
        
        if not transcription_segments:
            return []
        
        # Perform diarization if enabled
        if settings.diarization_enabled:
            diarization_segments = await diarization_pipeline.diarize(audio_data)
            merged_segments = diarization_pipeline.merge_transcription_with_diarization(
                transcription_segments,
                diarization_segments,
            )
        else:
            # No diarization, use default speaker
            merged_segments = [
                {
                    "speaker": "SPEAKER_00",
                    "text": seg["text"],
                    "start": seg["start"],
                    "end": seg["end"],
                }
                for seg in transcription_segments
            ]
        
        # Calculate time offset based on chunk index
        time_offset = event.chunk_index * event.duration_seconds
        
        # Save transcript segments
        saved_segments = []
        for seg in merged_segments:
            segment = TranscriptSegment(
                session_id=uuid.UUID(event.session_id),
                audio_recording_id=uuid.UUID(event.recording_id),
                speaker_label=seg["speaker"],
                content=seg["text"].strip(),
                start_time=seg["start"] + time_offset,
                end_time=seg["end"] + time_offset,
                confidence=0.95,  # Whisper doesn't provide per-segment confidence
            )
            self.db.add(segment)
            saved_segments.append(segment)
        
        await self.db.commit()
        
        # Refresh to get IDs
        for seg in saved_segments:
            await self.db.refresh(seg)
        
        # Publish transcript ready events
        for segment in saved_segments:
            event = TranscriptReadyEvent(
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
                event.model_dump(mode="json"),
            )
        
        return saved_segments
    
    async def _process_with_sample_transcript(self, event: AudioChunkEvent) -> list[TranscriptSegment]:
        """Process using sample transcript instead of API."""
        # Load sample transcript
        sample_segments = self._load_sample_transcript()
        
        if not sample_segments:
            print("Warning: No sample transcript segments found")
            return []
        
        # Calculate time offset based on chunk index
        time_offset = event.chunk_index * event.duration_seconds
        
        # Filter segments that fall within this chunk's time range
        chunk_start = time_offset
        chunk_end = time_offset + event.duration_seconds
        
        # Get segments that overlap with this chunk
        relevant_segments = [
            seg for seg in sample_segments
            if seg["start"] < chunk_end and seg["end"] > chunk_start
        ]
        
        if not relevant_segments:
            # If no segments in this chunk, return empty
            return []
        
        # Save transcript segments
        saved_segments = []
        for seg in relevant_segments:
            segment = TranscriptSegment(
                session_id=uuid.UUID(event.session_id),
                audio_recording_id=uuid.UUID(event.recording_id),
                speaker_label=seg["speaker"],
                content=seg["text"].strip(),
                start_time=seg["start"],
                end_time=seg["end"],
                confidence=0.95,
            )
            self.db.add(segment)
            saved_segments.append(segment)
        
        await self.db.commit()
        
        # Refresh to get IDs
        for seg in saved_segments:
            await self.db.refresh(seg)
        
        # Publish transcript ready events
        for segment in saved_segments:
            event_obj = TranscriptReadyEvent(
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
                event_obj.model_dump(mode="json"),
            )
        
        return saved_segments
    
    async def _fetch_audio(self, file_path: str) -> Optional[bytes]:
        """Fetch audio data from MinIO."""
        try:
            # Remove bucket prefix if present
            if file_path.startswith(f"{settings.minio_bucket}/"):
                file_path = file_path[len(settings.minio_bucket) + 1:]
            
            response = self.minio_client.get_object(settings.minio_bucket, file_path)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except Exception as e:
            print(f"Failed to fetch audio: {e}")
            return None


class ChunkSubscriber:
    """Subscribes to audio chunk events and processes them."""
    
    def __init__(self, db_factory):
        self.db_factory = db_factory
        self.running = False
    
    async def start(self, session_id: Optional[str] = None):
        """Start listening for audio chunks."""
        self.running = True
        
        # Subscribe to audio chunk channel
        channel = Channels.audio_chunk(session_id or "*")
        pubsub = await redis_client.subscribe(channel)
        
        try:
            print(f"ChunkSubscriber: Listening on channel {channel}")
            while self.running:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                
                # Handle both regular and pattern messages
                if message and message["type"] in ("message", "pmessage"):
                    print(f"ChunkSubscriber: Received message: {message}")
                    event_data = json.loads(message["data"])
                    event = AudioChunkEvent(**event_data)
                    
                    # Process in a new database session
                    async with self.db_factory() as db:
                        processor = TranscriptionProcessor(db)
                        segments = await processor.process_chunk(event)
                        print(f"ChunkSubscriber: Processed {len(segments)} segments")
                
                await asyncio.sleep(0.1)
                
        finally:
            if "*" in channel:
                await pubsub.punsubscribe(channel)
            else:
                await pubsub.unsubscribe(channel)
    
    def stop(self):
        """Stop listening for audio chunks."""
        self.running = False

