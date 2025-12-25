"""Transcription service Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid


class TranscriptSegmentBase(BaseModel):
    """Base transcript segment schema."""
    session_id: uuid.UUID
    speaker_label: str
    content: str
    start_time: float
    end_time: float
    confidence: float = 1.0


class TranscriptSegmentCreate(TranscriptSegmentBase):
    """Schema for creating a transcript segment."""
    audio_recording_id: Optional[uuid.UUID] = None


class TranscriptSegmentResponse(TranscriptSegmentBase):
    """Schema for transcript segment response."""
    id: uuid.UUID
    audio_recording_id: Optional[uuid.UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TranscriptList(BaseModel):
    """List of transcript segments."""
    items: list[TranscriptSegmentResponse]
    total: int
    session_id: Optional[uuid.UUID] = None


class TranscriptByJuror(BaseModel):
    """Transcript grouped by juror/speaker."""
    speaker_label: str
    juror_id: Optional[uuid.UUID] = None
    juror_name: Optional[str] = None
    segments: list[TranscriptSegmentResponse]
    total_speaking_time: float


class LiveTranscriptMessage(BaseModel):
    """WebSocket message for live transcription."""
    type: str  # "segment", "status", "error"
    session_id: str
    data: Optional[dict] = None
    error: Optional[str] = None

