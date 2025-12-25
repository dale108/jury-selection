"""Session service Pydantic schemas."""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict
import uuid


class SessionBase(BaseModel):
    """Base session schema."""
    case_number: str = Field(..., min_length=1, max_length=100)
    case_name: str = Field(..., min_length=1, max_length=500)
    court: str = Field(..., min_length=1, max_length=200)
    metadata_: Optional[dict[str, Any]] = Field(default=None, alias="metadata")


class SessionCreate(SessionBase):
    """Schema for creating a session."""
    pass


class SessionUpdate(BaseModel):
    """Schema for updating a session."""
    case_number: Optional[str] = Field(None, min_length=1, max_length=100)
    case_name: Optional[str] = Field(None, min_length=1, max_length=500)
    court: Optional[str] = Field(None, min_length=1, max_length=200)
    metadata_: Optional[dict[str, Any]] = Field(default=None, alias="metadata")


class SessionStatusUpdate(BaseModel):
    """Schema for updating session status."""
    status: str = Field(..., pattern="^(pending|active|paused|completed|cancelled)$")


class SessionResponse(BaseModel):
    """Schema for session response."""
    id: uuid.UUID
    case_number: str
    case_name: str
    court: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class SessionWithStats(SessionResponse):
    """Session response with statistics."""
    juror_count: int = 0
    transcript_segment_count: int = 0
    total_audio_duration: float = 0.0


class SessionList(BaseModel):
    """Paginated list of sessions."""
    items: list[SessionResponse]
    total: int
    page: int
    page_size: int

