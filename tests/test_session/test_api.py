"""Tests for Session service API routes."""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from services.session.app.main import app
from services.session.app.database import get_db
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


@pytest.fixture
def client(test_app):
    """Create a test client."""
    return TestClient(test_app)


@pytest_asyncio.fixture
async def async_client(test_app):
    """Create an async test client."""
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
class TestSessionAPI:
    """Tests for Session API endpoints."""
    
    async def test_create_session(self, async_client: AsyncClient, sample_session_data: dict):
        """Test POST /sessions/."""
        response = await async_client.post("/sessions/", json=sample_session_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["case_number"] == sample_session_data["case_number"]
        assert data["status"] == "pending"
        assert "id" in data
    
    async def test_create_session_invalid_data(self, async_client: AsyncClient):
        """Test POST /sessions/ with invalid data."""
        response = await async_client.post("/sessions/", json={"case_number": ""})
        
        assert response.status_code == 422  # Validation error
    
    async def test_list_sessions(self, async_client: AsyncClient, sample_session_data: dict):
        """Test GET /sessions/."""
        # Create a session first
        await async_client.post("/sessions/", json=sample_session_data)
        
        response = await async_client.get("/sessions/")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
    
    async def test_list_sessions_pagination(self, async_client: AsyncClient, sample_session_data: dict):
        """Test GET /sessions/ with pagination."""
        # Create multiple sessions
        for i in range(5):
            data = sample_session_data.copy()
            data["case_number"] = f"2024-CR-{i:06d}"
            await async_client.post("/sessions/", json=data)
        
        response = await async_client.get("/sessions/?page=1&page_size=2")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2
    
    async def test_get_session(self, async_client: AsyncClient, sample_session_data: dict):
        """Test GET /sessions/{id}."""
        # Create a session
        create_response = await async_client.post("/sessions/", json=sample_session_data)
        session_id = create_response.json()["id"]
        
        response = await async_client.get(f"/sessions/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
    
    async def test_get_session_not_found(self, async_client: AsyncClient):
        """Test GET /sessions/{id} with non-existent ID."""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(f"/sessions/{fake_id}")
        
        assert response.status_code == 404
    
    async def test_update_session(self, async_client: AsyncClient, sample_session_data: dict):
        """Test PUT /sessions/{id}."""
        # Create a session
        create_response = await async_client.post("/sessions/", json=sample_session_data)
        session_id = create_response.json()["id"]
        
        # Update it
        response = await async_client.put(
            f"/sessions/{session_id}",
            json={"case_name": "Updated Name"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["case_name"] == "Updated Name"
    
    async def test_update_session_status(self, async_client: AsyncClient, sample_session_data: dict):
        """Test PATCH /sessions/{id}/status."""
        # Create a session
        create_response = await async_client.post("/sessions/", json=sample_session_data)
        session_id = create_response.json()["id"]
        
        # Update status
        response = await async_client.patch(
            f"/sessions/{session_id}/status",
            json={"status": "active"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        assert data["started_at"] is not None
    
    async def test_delete_session(self, async_client: AsyncClient, sample_session_data: dict):
        """Test DELETE /sessions/{id}."""
        # Create a session
        create_response = await async_client.post("/sessions/", json=sample_session_data)
        session_id = create_response.json()["id"]
        
        # Delete it
        response = await async_client.delete(f"/sessions/{session_id}")
        
        assert response.status_code == 204
        
        # Verify it's gone
        get_response = await async_client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 404
    
    async def test_health_check(self, async_client: AsyncClient):
        """Test GET /health."""
        response = await async_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "session"

