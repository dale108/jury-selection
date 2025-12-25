"""Transcription service database models."""
from datetime import datetime
from typing import Optional
import uuid as uuid_lib
from sqlalchemy import String, DateTime, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from shared.database import Base


class TranscriptSegment(Base):
    """Transcript segment model."""
    
    __tablename__ = "transcript_segments"
    
    id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid_lib.uuid4,
    )
    session_id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    audio_recording_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    speaker_label: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<TranscriptSegment {self.speaker_label}: {self.content[:50]}...>"

