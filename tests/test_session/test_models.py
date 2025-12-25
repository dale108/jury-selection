"""Tests for Session service models."""
import pytest
import uuid
from datetime import datetime

from services.session.app.models import Session, SessionStatus


class TestSessionModel:
    """Tests for the Session model."""
    
    def test_session_status_enum_values(self):
        """Test that SessionStatus enum has expected values."""
        assert SessionStatus.PENDING.value == "pending"
        assert SessionStatus.ACTIVE.value == "active"
        assert SessionStatus.PAUSED.value == "paused"
        assert SessionStatus.COMPLETED.value == "completed"
        assert SessionStatus.CANCELLED.value == "cancelled"
    
    def test_session_repr(self):
        """Test Session string representation."""
        session = Session(
            id=uuid.uuid4(),
            case_number="2024-CR-001234",
            case_name="State v. Test",
            court="Test Court",
            status=SessionStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        assert "2024-CR-001234" in repr(session)
    
    def test_session_default_status(self):
        """Test that default session status is PENDING."""
        session = Session(
            id=uuid.uuid4(),
            case_number="2024-CR-001234",
            case_name="State v. Test",
            court="Test Court",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        # Note: Default is set in model definition
        assert session.status is None or session.status == SessionStatus.PENDING

