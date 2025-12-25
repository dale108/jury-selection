"""Tests for Juror service API routes."""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime

from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from services.juror.app.main import app
from services.juror.app.database import get_db
from services.juror.app.models import Juror
from services.session.app.models import Session, SessionStatus


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


@pytest.mark.asyncio
class TestJurorAPI:
    """Tests for Juror API endpoints."""
    
    async def test_create_juror(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test POST /jurors/."""
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        
        response = await async_client.post("/jurors/", json=data)
        
        assert response.status_code == 201
        result = response.json()
        assert result["first_name"] == data["first_name"]
        assert result["session_id"] == str(created_session.id)
    
    async def test_create_juror_invalid_data(
        self,
        async_client: AsyncClient,
        created_session: Session,
    ):
        """Test POST /jurors/ with invalid data."""
        response = await async_client.post(
            "/jurors/",
            json={
                "session_id": str(created_session.id),
                "seat_number": 0,  # Invalid
                "first_name": "Jane",
                "last_name": "Doe",
            }
        )
        
        assert response.status_code == 422
    
    async def test_list_jurors(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test GET /jurors/?session_id=."""
        # Create a juror first
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        await async_client.post("/jurors/", json=data)
        
        response = await async_client.get(f"/jurors/?session_id={created_session.id}")
        
        assert response.status_code == 200
        result = response.json()
        assert "items" in result
        assert "total" in result
        assert result["total"] >= 1
    
    async def test_list_jurors_requires_session_id(self, async_client: AsyncClient):
        """Test that GET /jurors/ requires session_id."""
        response = await async_client.get("/jurors/")
        
        assert response.status_code == 422
    
    async def test_get_juror(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test GET /jurors/{id}."""
        # Create a juror
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        create_response = await async_client.post("/jurors/", json=data)
        juror_id = create_response.json()["id"]
        
        response = await async_client.get(f"/jurors/{juror_id}")
        
        assert response.status_code == 200
        result = response.json()
        assert result["id"] == juror_id
        assert "speaker_labels" in result
        assert "transcript_segments" in result
    
    async def test_get_juror_not_found(self, async_client: AsyncClient):
        """Test GET /jurors/{id} with non-existent ID."""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/jurors/{fake_id}")
        
        assert response.status_code == 404
    
    async def test_update_juror(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test PUT /jurors/{id}."""
        # Create a juror
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        create_response = await async_client.post("/jurors/", json=data)
        juror_id = create_response.json()["id"]
        
        # Update it
        response = await async_client.put(
            f"/jurors/{juror_id}",
            json={"notes": "Updated notes", "occupation": "New Job"}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["notes"] == "Updated notes"
        assert result["occupation"] == "New Job"
    
    async def test_delete_juror(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test DELETE /jurors/{id}."""
        # Create a juror
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        create_response = await async_client.post("/jurors/", json=data)
        juror_id = create_response.json()["id"]
        
        # Delete it
        response = await async_client.delete(f"/jurors/{juror_id}")
        
        assert response.status_code == 204
        
        # Verify it's gone
        get_response = await async_client.get(f"/jurors/{juror_id}")
        assert get_response.status_code == 404
    
    async def test_create_speaker_mapping(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test POST /jurors/{id}/speaker-mapping."""
        # Create a juror
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        create_response = await async_client.post("/jurors/", json=data)
        juror_id = create_response.json()["id"]
        
        # Create speaker mapping
        response = await async_client.post(
            f"/jurors/{juror_id}/speaker-mapping",
            json={"speaker_label": "SPEAKER_00"}
        )
        
        assert response.status_code == 201
        result = response.json()
        assert result["speaker_label"] == "SPEAKER_00"
        assert result["juror_id"] == juror_id
    
    async def test_get_speaker_mappings(
        self,
        async_client: AsyncClient,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test GET /jurors/{id}/speaker-mappings."""
        # Create a juror
        data = sample_juror_data.copy()
        data["session_id"] = str(created_session.id)
        create_response = await async_client.post("/jurors/", json=data)
        juror_id = create_response.json()["id"]
        
        # Create speaker mappings
        for i in range(2):
            await async_client.post(
                f"/jurors/{juror_id}/speaker-mapping",
                json={"speaker_label": f"SPEAKER_{i:02d}"}
            )
        
        # Get mappings
        response = await async_client.get(f"/jurors/{juror_id}/speaker-mappings")
        
        assert response.status_code == 200
        result = response.json()
        assert len(result) == 2
    
    async def test_health_check(self, async_client: AsyncClient):
        """Test GET /health."""
        response = await async_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "juror"

