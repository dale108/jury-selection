"""Audio service Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid


class AudioRecordingBase(BaseModel):
    """Base audio recording schema."""
    session_id: uuid.UUID


class AudioRecordingCreate(AudioRecordingBase):
    """Schema for creating an audio recording."""
    pass


class AudioRecordingResponse(AudioRecordingBase):
    """Schema for audio recording response."""
    id: uuid.UUID
    file_path: str
    duration_seconds: Optional[float] = None
    status: str
    recorded_at: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AudioChunkResponse(BaseModel):
    """Schema for audio chunk response."""
    id: uuid.UUID
    recording_id: uuid.UUID
    session_id: uuid.UUID
    chunk_index: int
    file_path: str
    duration_seconds: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RecordingList(BaseModel):
    """List of recordings for a session."""
    items: list[AudioRecordingResponse]
    total: int


class StreamStartResponse(BaseModel):
    """Response when starting audio stream."""
    recording_id: uuid.UUID
    session_id: uuid.UUID
    status: str = "recording"
    message: str = "Audio stream started"


class StreamMessage(BaseModel):
    """WebSocket message format."""
    type: str  # "start", "chunk", "end", "error"
    data: Optional[dict] = None
    error: Optional[str] = None

