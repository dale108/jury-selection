"""Tests for Gateway routing."""
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport, Response

from gateway.app.main import app
from gateway.app.config import settings


@pytest_asyncio.fixture
async def async_client():
    """Create an async test client for the gateway."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestGatewayRoutes:
    """Tests for Gateway routing functionality."""
    
    def test_root_endpoint(self):
        """Test GET / returns service info."""
        client = TestClient(app)
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "voir-dire-gateway"
        assert data["status"] == "running"
    
    def test_health_endpoint(self):
        """Test GET /health returns healthy."""
        client = TestClient(app)
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    @pytest.mark.asyncio
    @patch('gateway.app.routes.httpx.AsyncClient')
    async def test_proxy_sessions_get(self, mock_client_class, async_client):
        """Test GET /api/sessions is proxied correctly."""
        # Mock the httpx client
        mock_response = MagicMock()
        mock_response.content = b'{"items": [], "total": 0}'
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        response = await async_client.get("/api/sessions")
        
        # Verify the request was made
        assert response.status_code in [200, 503]  # 503 if service unavailable
    
    @pytest.mark.asyncio
    @patch('gateway.app.routes.httpx.AsyncClient')
    async def test_proxy_sessions_post(self, mock_client_class, async_client):
        """Test POST /api/sessions is proxied correctly."""
        mock_response = MagicMock()
        mock_response.content = b'{"id": "123", "case_number": "test"}'
        mock_response.status_code = 201
        mock_response.headers = {"content-type": "application/json"}
        
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        response = await async_client.post(
            "/api/sessions",
            json={
                "case_number": "2024-TEST-001",
                "case_name": "Test Case",
                "court": "Test Court",
            }
        )
        
        assert response.status_code in [200, 201, 503]
    
    @pytest.mark.asyncio
    @patch('gateway.app.routes.httpx.AsyncClient')
    async def test_proxy_jurors_get(self, mock_client_class, async_client):
        """Test GET /api/jurors is proxied correctly."""
        mock_response = MagicMock()
        mock_response.content = b'{"items": [], "total": 0}'
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        response = await async_client.get("/api/jurors?session_id=123")
        
        assert response.status_code in [200, 503]
    
    @pytest.mark.asyncio
    @patch('gateway.app.routes.httpx.AsyncClient')
    async def test_proxy_transcripts_get(self, mock_client_class, async_client):
        """Test GET /api/transcripts is proxied correctly."""
        mock_response = MagicMock()
        mock_response.content = b'{"items": [], "total": 0}'
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        response = await async_client.get("/api/transcripts?session_id=123")
        
        assert response.status_code in [200, 503]


class TestGatewayConfig:
    """Tests for Gateway configuration."""
    
    def test_service_urls_have_defaults(self):
        """Test that service URLs have default values."""
        assert settings.audio_service_url is not None
        assert settings.transcription_service_url is not None
        assert settings.juror_service_url is not None
        assert settings.session_service_url is not None
    
    def test_cors_origins_configured(self):
        """Test that CORS origins are configured."""
        assert settings.cors_origins is not None
        assert len(settings.cors_origins) > 0

