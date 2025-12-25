"""Shared test fixtures for all services."""
import asyncio
import os
import sys
from typing import AsyncGenerator, Generator
from datetime import datetime
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from faker import Faker

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.database import Base

# Import all models to register them
from services.session.app.models import Session, SessionStatus
from services.juror.app.models import Juror, SpeakerMapping
from services.audio.app.models import AudioRecording, AudioChunk, RecordingStatus
from services.transcription.app.models import TranscriptSegment

fake = Faker()


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def async_engine():
    """Create an async SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a database session for testing."""
    async_session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def sample_session_data() -> dict:
    """Generate sample session data."""
    return {
        "case_number": f"2024-CR-{fake.random_number(digits=6)}",
        "case_name": f"State v. {fake.last_name()}",
        "court": fake.random_element([
            "King County Superior Court",
            "Pierce County Superior Court",
            "Snohomish County Superior Court",
        ]),
        "metadata": {
            "judge": f"Hon. {fake.name()}",
            "courtroom": f"E-{fake.random_number(digits=3)}",
        },
    }


@pytest.fixture
def sample_juror_data() -> dict:
    """Generate sample juror data."""
    return {
        "seat_number": fake.random_int(min=1, max=12),
        "first_name": fake.first_name(),
        "last_name": fake.last_name(),
        "occupation": fake.job(),
        "neighborhood": fake.city(),
        "demographics": {
            "age_range": fake.random_element(["18-30", "30-40", "40-50", "50-60", "60+"]),
        },
        "notes": fake.sentence(),
        "flags": {},
    }


@pytest.fixture
def sample_transcript_segment_data() -> dict:
    """Generate sample transcript segment data."""
    start_time = fake.pyfloat(min_value=0, max_value=300)
    return {
        "speaker_label": f"SPEAKER_{fake.random_int(min=0, max=5):02d}",
        "content": fake.paragraph(),
        "start_time": start_time,
        "end_time": start_time + fake.pyfloat(min_value=1, max_value=30),
        "confidence": fake.pyfloat(min_value=0.7, max_value=1.0),
    }


@pytest_asyncio.fixture
async def created_session(db_session: AsyncSession, sample_session_data: dict) -> Session:
    """Create a session in the database."""
    session = Session(
        id=uuid.uuid4(),
        case_number=sample_session_data["case_number"],
        case_name=sample_session_data["case_name"],
        court=sample_session_data["court"],
        status=SessionStatus.PENDING,
        metadata_=sample_session_data.get("metadata"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture
async def created_juror(
    db_session: AsyncSession,
    created_session: Session,
    sample_juror_data: dict,
) -> Juror:
    """Create a juror in the database."""
    juror = Juror(
        id=uuid.uuid4(),
        session_id=created_session.id,
        seat_number=sample_juror_data["seat_number"],
        first_name=sample_juror_data["first_name"],
        last_name=sample_juror_data["last_name"],
        occupation=sample_juror_data["occupation"],
        neighborhood=sample_juror_data["neighborhood"],
        demographics=sample_juror_data.get("demographics"),
        notes=sample_juror_data.get("notes"),
        flags=sample_juror_data.get("flags"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(juror)
    await db_session.commit()
    await db_session.refresh(juror)
    return juror

