"""Tests for shared Redis client module."""
import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock

from shared.redis_client import RedisClient, Channels, get_redis_url


class TestGetRedisUrl:
    """Tests for Redis URL construction."""
    
    def test_get_redis_url_defaults(self):
        """Test Redis URL with default values."""
        with patch.dict('os.environ', {}, clear=True):
            url = get_redis_url()
        
        assert url == "redis://localhost:6379"
    
    def test_get_redis_url_from_env(self):
        """Test Redis URL from environment variables."""
        import os
        env = {
            "REDIS_HOST": "redis-server",
            "REDIS_PORT": "6380",
        }
        with patch.dict(os.environ, env, clear=True):
            url = get_redis_url()
        
        assert url == "redis://redis-server:6380"


class TestChannels:
    """Tests for Redis channel names."""
    
    def test_audio_chunk_channel(self):
        """Test audio chunk channel name."""
        channel = Channels.audio_chunk("session-123")
        assert channel == "audio:chunk:session-123"
    
    def test_transcript_ready_channel(self):
        """Test transcript ready channel name."""
        channel = Channels.transcript_ready("session-456")
        assert channel == "transcript:ready:session-456"
    
    def test_session_status_channel(self):
        """Test session status channel name."""
        channel = Channels.session_status("session-789")
        assert channel == "session:status:session-789"


class TestRedisClient:
    """Tests for RedisClient class."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis instance."""
        with patch('shared.redis_client.redis') as mock:
            yield mock
    
    @pytest.fixture
    def client(self, mock_redis):
        """Create a RedisClient instance."""
        return RedisClient()
    
    @pytest.mark.asyncio
    async def test_connect(self, client, mock_redis):
        """Test connecting to Redis."""
        mock_redis.from_url.return_value = MagicMock()
        
        await client.connect()
        
        mock_redis.from_url.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_disconnect(self, client, mock_redis):
        """Test disconnecting from Redis."""
        mock_redis_instance = MagicMock()
        mock_redis_instance.close = AsyncMock()
        client._redis = mock_redis_instance
        
        await client.disconnect()
        
        mock_redis_instance.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_publish(self, client, mock_redis):
        """Test publishing a message."""
        mock_redis_instance = MagicMock()
        mock_redis_instance.publish = AsyncMock()
        client._redis = mock_redis_instance
        
        message = {"type": "test", "data": "hello"}
        await client.publish("test-channel", message)
        
        mock_redis_instance.publish.assert_called_once()
        call_args = mock_redis_instance.publish.call_args
        assert call_args[0][0] == "test-channel"
        assert json.loads(call_args[0][1]) == message
    
    @pytest.mark.asyncio
    async def test_set_and_get(self, client, mock_redis):
        """Test setting and getting values."""
        mock_redis_instance = MagicMock()
        mock_redis_instance.set = AsyncMock()
        mock_redis_instance.get = AsyncMock(return_value="test-value")
        client._redis = mock_redis_instance
        
        await client.set("test-key", "test-value")
        result = await client.get("test-key")
        
        mock_redis_instance.set.assert_called_once()
        mock_redis_instance.get.assert_called_once()
        assert result == "test-value"
    
    @pytest.mark.asyncio
    async def test_set_with_dict(self, client, mock_redis):
        """Test setting a dictionary value."""
        mock_redis_instance = MagicMock()
        mock_redis_instance.set = AsyncMock()
        client._redis = mock_redis_instance
        
        value = {"key": "value", "number": 123}
        await client.set("test-key", value)
        
        call_args = mock_redis_instance.set.call_args
        # Should be JSON serialized
        assert json.loads(call_args[0][1]) == value
    
    @pytest.mark.asyncio
    async def test_delete(self, client, mock_redis):
        """Test deleting a key."""
        mock_redis_instance = MagicMock()
        mock_redis_instance.delete = AsyncMock()
        client._redis = mock_redis_instance
        
        await client.delete("test-key")
        
        mock_redis_instance.delete.assert_called_once_with("test-key")

