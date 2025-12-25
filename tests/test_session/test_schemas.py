"""Tests for Session service schemas."""
import pytest
from datetime import datetime
import uuid

from pydantic import ValidationError

from services.session.app.schemas import (
    SessionCreate,
    SessionUpdate,
    SessionStatusUpdate,
    SessionResponse,
    SessionList,
)


class TestSessionCreate:
    """Tests for SessionCreate schema."""
    
    def test_valid_session_create(self, sample_session_data):
        """Test creating a valid session."""
        session = SessionCreate(**sample_session_data)
        assert session.case_number == sample_session_data["case_number"]
        assert session.case_name == sample_session_data["case_name"]
        assert session.court == sample_session_data["court"]
    
    def test_session_create_missing_required(self):
        """Test that missing required fields raise ValidationError."""
        with pytest.raises(ValidationError):
            SessionCreate(case_number="123")  # Missing case_name and court
    
    def test_session_create_empty_case_number(self):
        """Test that empty case_number is rejected."""
        with pytest.raises(ValidationError):
            SessionCreate(
                case_number="",
                case_name="Test Case",
                court="Test Court",
            )
    
    def test_session_create_with_metadata(self):
        """Test creating session with metadata."""
        session = SessionCreate(
            case_number="2024-CR-001",
            case_name="Test Case",
            court="Test Court",
            metadata={"judge": "Test Judge"},
        )
        assert session.metadata_ == {"judge": "Test Judge"}


class TestSessionUpdate:
    """Tests for SessionUpdate schema."""
    
    def test_session_update_partial(self):
        """Test partial update with only some fields."""
        update = SessionUpdate(case_name="New Case Name")
        assert update.case_name == "New Case Name"
        assert update.case_number is None
        assert update.court is None
    
    def test_session_update_all_fields(self):
        """Test update with all fields."""
        update = SessionUpdate(
            case_number="NEW-123",
            case_name="New Name",
            court="New Court",
        )
        assert update.case_number == "NEW-123"
        assert update.case_name == "New Name"
        assert update.court == "New Court"


class TestSessionStatusUpdate:
    """Tests for SessionStatusUpdate schema."""
    
    def test_valid_status_values(self):
        """Test all valid status values."""
        valid_statuses = ["pending", "active", "paused", "completed", "cancelled"]
        for status in valid_statuses:
            update = SessionStatusUpdate(status=status)
            assert update.status == status
    
    def test_invalid_status_value(self):
        """Test that invalid status is rejected."""
        with pytest.raises(ValidationError):
            SessionStatusUpdate(status="invalid_status")


class TestSessionResponse:
    """Tests for SessionResponse schema."""
    
    def test_session_response_from_dict(self):
        """Test creating response from dictionary."""
        data = {
            "id": uuid.uuid4(),
            "case_number": "2024-CR-001",
            "case_name": "Test Case",
            "court": "Test Court",
            "status": "active",
            "started_at": datetime.utcnow(),
            "ended_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "metadata": {"key": "value"},
        }
        response = SessionResponse(**data)
        assert response.id == data["id"]
        assert response.status == "active"


class TestSessionList:
    """Tests for SessionList schema."""
    
    def test_session_list_empty(self):
        """Test empty session list."""
        session_list = SessionList(items=[], total=0, page=1, page_size=20)
        assert len(session_list.items) == 0
        assert session_list.total == 0
    
    def test_session_list_pagination(self):
        """Test session list with pagination info."""
        session_list = SessionList(items=[], total=100, page=5, page_size=20)
        assert session_list.page == 5
        assert session_list.page_size == 20
        assert session_list.total == 100

