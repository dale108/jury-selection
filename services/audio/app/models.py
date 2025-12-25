"""Audio service database models."""
from datetime import datetime
from typing import Optional
import uuid as uuid_lib
from sqlalchemy import String, DateTime, Float, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
import enum

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from shared.database import Base


class RecordingStatus(str, enum.Enum):
    """Possible recording statuses."""
    RECORDING = "recording"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioRecording(Base):
    """Audio recording model."""
    
    __tablename__ = "audio_recordings"
    
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
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[RecordingStatus] = mapped_column(
        SQLEnum(RecordingStatus),
        default=RecordingStatus.RECORDING,
        nullable=False,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<AudioRecording {self.id} ({self.status})>"


class AudioChunk(Base):
    """Audio chunk for real-time processing."""
    
    __tablename__ = "audio_chunks"
    
    id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid_lib.uuid4,
    )
    recording_id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    session_id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<AudioChunk {self.chunk_index} of {self.recording_id}>"

