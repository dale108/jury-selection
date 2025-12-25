"""Tests for Juror service models."""
import pytest
import uuid
from datetime import datetime

from services.juror.app.models import Juror, SpeakerMapping


class TestJurorModel:
    """Tests for the Juror model."""
    
    def test_juror_repr(self):
        """Test Juror string representation."""
        juror = Juror(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            seat_number=5,
            first_name="Jane",
            last_name="Doe",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        assert "Jane" in repr(juror)
        assert "Doe" in repr(juror)
        assert "Seat 5" in repr(juror)
    
    def test_juror_optional_fields(self):
        """Test that optional fields can be None."""
        juror = Juror(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            seat_number=1,
            first_name="John",
            last_name="Smith",
            occupation=None,
            neighborhood=None,
            notes=None,
            demographics=None,
            flags=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        assert juror.occupation is None
        assert juror.neighborhood is None


class TestSpeakerMappingModel:
    """Tests for the SpeakerMapping model."""
    
    def test_speaker_mapping_repr(self):
        """Test SpeakerMapping string representation."""
        juror_id = uuid.uuid4()
        mapping = SpeakerMapping(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            juror_id=juror_id,
            speaker_label="SPEAKER_00",
            created_at=datetime.utcnow(),
        )
        assert "SPEAKER_00" in repr(mapping)
        assert str(juror_id) in repr(mapping)

