"""Audio processing utilities."""
import io
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import AudioRecording, AudioChunk, RecordingStatus
from ..config import settings
from .storage import audio_storage


class AudioProcessor:
    """Processes and manages audio recordings."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_recording(self, session_id: uuid.UUID) -> AudioRecording:
        """Create a new audio recording entry."""
        recording_id = uuid.uuid4()
        file_path = f"sessions/{session_id}/recordings/{recording_id}.webm"
        
        recording = AudioRecording(
            id=recording_id,
            session_id=session_id,
            file_path=file_path,
            status=RecordingStatus.RECORDING,
        )
        self.db.add(recording)
        await self.db.commit()
        await self.db.refresh(recording)
        return recording
    
    async def save_chunk(
        self,
        recording_id: uuid.UUID,
        session_id: uuid.UUID,
        chunk_index: int,
        audio_data: bytes,
        duration_seconds: float,
    ) -> AudioChunk:
        """Save an audio chunk to storage and database."""
        chunk_id = uuid.uuid4()
        file_path = f"sessions/{session_id}/chunks/{recording_id}/{chunk_index}.webm"
        
        # Upload to MinIO
        await audio_storage.upload_audio(file_path, audio_data)
        
        # Save to database
        chunk = AudioChunk(
            id=chunk_id,
            recording_id=recording_id,
            session_id=session_id,
            chunk_index=chunk_index,
            file_path=file_path,
            duration_seconds=duration_seconds,
        )
        self.db.add(chunk)
        await self.db.commit()
        await self.db.refresh(chunk)
        return chunk
    
    async def finalize_recording(
        self,
        recording_id: uuid.UUID,
        total_duration: float,
    ) -> Optional[AudioRecording]:
        """Finalize a recording after streaming ends."""
        from sqlalchemy import select
        
        result = await self.db.execute(
            select(AudioRecording).where(AudioRecording.id == recording_id)
        )
        recording = result.scalar_one_or_none()
        
        if recording:
            recording.status = RecordingStatus.COMPLETED
            recording.duration_seconds = total_duration
            await self.db.commit()
            await self.db.refresh(recording)
        
        return recording
    
    async def mark_failed(self, recording_id: uuid.UUID) -> None:
        """Mark a recording as failed."""
        from sqlalchemy import select
        
        result = await self.db.execute(
            select(AudioRecording).where(AudioRecording.id == recording_id)
        )
        recording = result.scalar_one_or_none()
        
        if recording:
            recording.status = RecordingStatus.FAILED
            await self.db.commit()

