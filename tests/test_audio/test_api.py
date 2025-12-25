"""Tests for Audio service API routes."""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock

from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from services.audio.app.main import app
from services.audio.app.database import get_db
from services.audio.app.models import AudioRecording, AudioChunk, RecordingStatus
from services.session.app.models import Session


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
async def created_recording(
    db_session: AsyncSession,
    created_session: Session,
) -> AudioRecording:
    """Create a recording in the database."""
    recording = AudioRecording(
        id=uuid.uuid4(),
        session_id=created_session.id,
        file_path=f"sessions/{created_session.id}/recordings/test.webm",
        status=RecordingStatus.COMPLETED,
        duration_seconds=120.0,
        recorded_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db_session.add(recording)
    await db_session.commit()
    await db_session.refresh(recording)
    return recording


@pytest_asyncio.fixture
async def created_chunks(
    db_session: AsyncSession,
    created_recording: AudioRecording,
) -> list[AudioChunk]:
    """Create audio chunks in the database."""
    chunks = []
    for i in range(3):
        chunk = AudioChunk(
            id=uuid.uuid4(),
            recording_id=created_recording.id,
            session_id=created_recording.session_id,
            chunk_index=i,
            file_path=f"sessions/{created_recording.session_id}/chunks/{created_recording.id}/{i}.webm",
            duration_seconds=5.0,
            created_at=datetime.utcnow(),
        )
        db_session.add(chunk)
        chunks.append(chunk)
    await db_session.commit()
    for chunk in chunks:
        await db_session.refresh(chunk)
    return chunks


@pytest.mark.asyncio
class TestAudioAPI:
    """Tests for Audio API endpoints."""
    
    async def test_list_recordings(
        self,
        async_client: AsyncClient,
        created_recording: AudioRecording,
    ):
        """Test GET /audio/recordings/{session_id}."""
        response = await async_client.get(
            f"/audio/recordings/{created_recording.session_id}"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "items" in result
        assert "total" in result
        assert result["total"] >= 1
    
    async def test_list_recordings_empty(
        self,
        async_client: AsyncClient,
        created_session: Session,
    ):
        """Test GET /audio/recordings/{session_id} with no recordings."""
        response = await async_client.get(
            f"/audio/recordings/{created_session.id}"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 0
    
    async def test_get_recording(
        self,
        async_client: AsyncClient,
        created_recording: AudioRecording,
    ):
        """Test GET /audio/recordings/{session_id}/{recording_id}."""
        response = await async_client.get(
            f"/audio/recordings/{created_recording.session_id}/{created_recording.id}"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["id"] == str(created_recording.id)
        assert result["status"] == "completed"
    
    async def test_get_recording_not_found(
        self,
        async_client: AsyncClient,
        created_session: Session,
    ):
        """Test GET /audio/recordings/{session_id}/{recording_id} not found."""
        fake_id = uuid.uuid4()
        response = await async_client.get(
            f"/audio/recordings/{created_session.id}/{fake_id}"
        )
        
        assert response.status_code == 404
    
    async def test_list_chunks(
        self,
        async_client: AsyncClient,
        created_recording: AudioRecording,
        created_chunks: list[AudioChunk],
    ):
        """Test GET /audio/recordings/{session_id}/{recording_id}/chunks."""
        response = await async_client.get(
            f"/audio/recordings/{created_recording.session_id}/{created_recording.id}/chunks"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert len(result) == 3
        # Should be ordered by chunk_index
        assert result[0]["chunk_index"] == 0
        assert result[1]["chunk_index"] == 1
    
    @patch('services.audio.app.core.storage.audio_storage')
    async def test_get_recording_download_url(
        self,
        mock_storage,
        async_client: AsyncClient,
        created_recording: AudioRecording,
    ):
        """Test GET /audio/recordings/{session_id}/{recording_id}/download."""
        mock_storage.get_presigned_url = AsyncMock(
            return_value="https://example.com/signed-url"
        )
        
        response = await async_client.get(
            f"/audio/recordings/{created_recording.session_id}/{created_recording.id}/download"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "download_url" in result
    
    async def test_health_check(self, async_client: AsyncClient):
        """Test GET /health."""
        response = await async_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "audio"

