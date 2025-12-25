"""Session service database models."""
from datetime import datetime
from typing import Optional
import uuid as uuid_lib
from sqlalchemy import String, DateTime, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from shared.database import Base


class SessionStatus(str, enum.Enum):
    """Possible session statuses."""
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Session(Base):
    """Voir dire session model."""
    
    __tablename__ = "sessions"
    
    id: Mapped[uuid_lib.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid_lib.uuid4,
    )
    case_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    case_name: Mapped[str] = mapped_column(String(500), nullable=False)
    court: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        SQLEnum(SessionStatus),
        default=SessionStatus.PENDING,
        nullable=False,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
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
    
    # Relationships will be loaded from other services
    # jurors: Mapped[list["Juror"]] = relationship(back_populates="session")
    
    def __repr__(self) -> str:
        return f"<Session {self.case_number}>"

