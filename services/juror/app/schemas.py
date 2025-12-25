"""Juror service Pydantic schemas."""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict
import uuid


class JurorBase(BaseModel):
    """Base juror schema."""
    session_id: uuid.UUID
    seat_number: int = Field(..., ge=1)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    occupation: Optional[str] = Field(None, max_length=200)
    neighborhood: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None
    demographics: Optional[dict[str, Any]] = None
    flags: Optional[dict[str, Any]] = None


class JurorCreate(JurorBase):
    """Schema for creating a juror."""
    pass


class JurorUpdate(BaseModel):
    """Schema for updating a juror."""
    seat_number: Optional[int] = Field(None, ge=1)
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    occupation: Optional[str] = Field(None, max_length=200)
    neighborhood: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None
    demographics: Optional[dict[str, Any]] = None
    flags: Optional[dict[str, Any]] = None


class JurorResponse(JurorBase):
    """Schema for juror response."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SpeakerMappingCreate(BaseModel):
    """Schema for creating a speaker mapping."""
    speaker_label: str = Field(..., min_length=1, max_length=50)


class SpeakerMappingResponse(BaseModel):
    """Schema for speaker mapping response."""
    id: uuid.UUID
    session_id: uuid.UUID
    juror_id: uuid.UUID
    speaker_label: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TranscriptSegmentInfo(BaseModel):
    """Transcript segment info for juror profile."""
    id: uuid.UUID
    content: str
    start_time: float
    end_time: float
    confidence: float
    created_at: datetime


class JurorWithTranscript(JurorResponse):
    """Juror response with their transcript segments."""
    speaker_labels: list[str] = []
    transcript_segments: list[TranscriptSegmentInfo] = []


class JurorList(BaseModel):
    """Paginated list of jurors."""
    items: list[JurorResponse]
    total: int
    page: int
    page_size: int

