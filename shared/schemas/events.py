"""Event schemas for inter-service communication via Redis pub/sub."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class AudioChunkEvent(BaseModel):
    """Event published when an audio chunk is ready for processing."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    recording_id: str
    chunk_index: int
    file_path: str
    duration_seconds: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TranscriptReadyEvent(BaseModel):
    """Event published when a transcript segment is ready."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    segment_id: str
    speaker_label: str
    content: str
    start_time: float
    end_time: float
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SessionStatusEvent(BaseModel):
    """Event published when session status changes."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    old_status: Optional[str] = None
    new_status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class RecordingCompleteEvent(BaseModel):
    """Event published when a recording is complete and ready for transcription."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    recording_id: str
    file_path: str
    duration_seconds: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

