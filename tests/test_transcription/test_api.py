"""Tests for Transcription service API routes."""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock

from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from services.transcription.app.main import app
from services.transcription.app.database import get_db
from services.transcription.app.models import TranscriptSegment
from services.session.app.models import Session
from services.juror.app.models import Juror, SpeakerMapping


@pytest.fixture
def mock_db_session(db_session):
    """Override the database dependency."""
    async def override_get_db():
        yield db_session
    return override_get_db


@pytest.fixture
def test_app(mock_db_session):
    """Create a test application with mocked dependencies."""
    app.dependency_overrides[get_db] = mock_db_session
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client(test_app):
    """Create an async test client."""
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def created_segments(
    db_session: AsyncSession,
    created_session: Session,
) -> list[TranscriptSegment]:
    """Create transcript segments in the database."""
    segments = []
    speakers = ["SPEAKER_00", "SPEAKER_01", "SPEAKER_00"]
    
    for i, speaker in enumerate(speakers):
        segment = TranscriptSegment(
            id=uuid.uuid4(),
            session_id=created_session.id,
            speaker_label=speaker,
            content=f"Test segment {i} from {speaker}",
            start_time=float(i * 5),
            end_time=float((i + 1) * 5),
            confidence=0.95,
            created_at=datetime.utcnow(),
        )
        db_session.add(segment)
        segments.append(segment)
    
    await db_session.commit()
    for segment in segments:
        await db_session.refresh(segment)
    return segments


@pytest.mark.asyncio
class TestTranscriptionAPI:
    """Tests for Transcription API endpoints."""
    
    async def test_list_transcripts(
        self,
        async_client: AsyncClient,
        created_segments: list[TranscriptSegment],
    ):
        """Test GET /transcripts/?session_id=."""
        session_id = created_segments[0].session_id
        response = await async_client.get(f"/transcripts/?session_id={session_id}")
        
        assert response.status_code == 200
        result = response.json()
        assert "items" in result
        assert "total" in result
        assert result["total"] == 3
    
    async def test_list_transcripts_filter_by_speaker(
        self,
        async_client: AsyncClient,
        created_segments: list[TranscriptSegment],
    ):
        """Test GET /transcripts/ filtered by speaker_label."""
        session_id = created_segments[0].session_id
        response = await async_client.get(
            f"/transcripts/?session_id={session_id}&speaker_label=SPEAKER_00"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 2  # Two segments from SPEAKER_00
    
    async def test_list_transcripts_pagination(
        self,
        async_client: AsyncClient,
        created_segments: list[TranscriptSegment],
    ):
        """Test GET /transcripts/ with pagination."""
        session_id = created_segments[0].session_id
        response = await async_client.get(
            f"/transcripts/?session_id={session_id}&skip=1&limit=1"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert len(result["items"]) == 1
    
    async def test_get_transcript_segment(
        self,
        async_client: AsyncClient,
        created_segments: list[TranscriptSegment],
    ):
        """Test GET /transcripts/{segment_id}."""
        segment = created_segments[0]
        response = await async_client.get(f"/transcripts/{segment.id}")
        
        assert response.status_code == 200
        result = response.json()
        assert result["id"] == str(segment.id)
        assert result["content"] == segment.content
    
    async def test_get_transcript_segment_not_found(
        self,
        async_client: AsyncClient,
    ):
        """Test GET /transcripts/{segment_id} not found."""
        fake_id = uuid.uuid4()
        response = await async_client.get(f"/transcripts/{fake_id}")
        
        assert response.status_code == 404
    
    async def test_get_transcripts_by_speaker(
        self,
        async_client: AsyncClient,
        created_segments: list[TranscriptSegment],
    ):
        """Test GET /transcripts/session/{session_id}/by-speaker."""
        session_id = created_segments[0].session_id
        response = await async_client.get(
            f"/transcripts/session/{session_id}/by-speaker"
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Should have 2 speakers
        assert len(result) == 2
        
        # Find SPEAKER_00
        speaker_00 = next(s for s in result if s["speaker_label"] == "SPEAKER_00")
        assert len(speaker_00["segments"]) == 2
        assert speaker_00["total_speaking_time"] == 10.0  # 2 segments * 5 seconds
    
    async def test_transcripts_ordered_by_start_time(
        self,
        async_client: AsyncClient,
        created_segments: list[TranscriptSegment],
    ):
        """Test that transcripts are ordered by start_time."""
        session_id = created_segments[0].session_id
        response = await async_client.get(f"/transcripts/?session_id={session_id}")
        
        assert response.status_code == 200
        result = response.json()
        items = result["items"]
        
        # Verify ordering
        for i in range(len(items) - 1):
            assert items[i]["start_time"] <= items[i + 1]["start_time"]
    
    async def test_health_check(self, async_client: AsyncClient):
        """Test GET /health."""
        response = await async_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "transcription"

