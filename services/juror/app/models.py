"""Juror service database models."""
from datetime import datetime
from typing import Optional
import uuid as uuid_lib
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from shared.database import Base


class Juror(Base):
    """Juror profile model."""
    
    __tablename__ = "jurors"
    
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
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    occupation: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    neighborhood: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    demographics: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    flags: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    speaker_mappings: Mapped[list["SpeakerMapping"]] = relationship(
        back_populates="juror",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Juror {self.first_name} {self.last_name} (Seat {self.seat_number})>"


class SpeakerMapping(Base):
    """Maps speaker labels from transcription to juror profiles."""
    
    __tablename__ = "speaker_mappings"
    
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
    juror_id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jurors.id", ondelete="CASCADE"),
        nullable=False,
    )
    speaker_label: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    juror: Mapped["Juror"] = relationship(back_populates="speaker_mappings")
    
    def __repr__(self) -> str:
        return f"<SpeakerMapping {self.speaker_label} -> Juror {self.juror_id}>"

