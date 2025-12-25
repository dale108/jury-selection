"""Tests for shared database module."""
import pytest
import os
from unittest.mock import patch

from shared.database import get_database_url, Base


class TestDatabaseUrl:
    """Tests for database URL construction."""
    
    def test_get_database_url_defaults(self):
        """Test database URL with default values."""
        with patch.dict(os.environ, {}, clear=True):
            url = get_database_url()
        
        assert "postgresql+asyncpg://" in url
        assert "voirdire" in url
    
    def test_get_database_url_from_env(self):
        """Test database URL from environment variables."""
        env = {
            "POSTGRES_HOST": "testhost",
            "POSTGRES_PORT": "5433",
            "POSTGRES_USER": "testuser",
            "POSTGRES_PASSWORD": "testpass",
            "POSTGRES_DB": "testdb",
        }
        with patch.dict(os.environ, env, clear=True):
            url = get_database_url()
        
        assert "testhost" in url
        assert "5433" in url
        assert "testuser" in url
        assert "testpass" in url
        assert "testdb" in url


class TestBase:
    """Tests for SQLAlchemy Base class."""
    
    def test_base_is_declarative(self):
        """Test that Base is a declarative base."""
        assert hasattr(Base, "metadata")
        assert hasattr(Base, "__tablename__")

