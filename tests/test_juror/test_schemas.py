"""Tests for Juror service schemas."""
import pytest
from datetime import datetime
import uuid

from pydantic import ValidationError

from services.juror.app.schemas import (
    JurorCreate,
    JurorUpdate,
    JurorResponse,
    JurorWithTranscript,
    JurorList,
    SpeakerMappingCreate,
    SpeakerMappingResponse,
)


class TestJurorCreate:
    """Tests for JurorCreate schema."""
    
    def test_valid_juror_create(self, sample_juror_data):
        """Test creating a valid juror."""
        data = sample_juror_data.copy()
        data["session_id"] = uuid.uuid4()
        juror = JurorCreate(**data)
        
        assert juror.first_name == data["first_name"]
        assert juror.last_name == data["last_name"]
        assert juror.seat_number == data["seat_number"]
    
    def test_juror_create_missing_required(self):
        """Test that missing required fields raise ValidationError."""
        with pytest.raises(ValidationError):
            JurorCreate(session_id=uuid.uuid4(), seat_number=1)
    
    def test_juror_create_invalid_seat_number(self):
        """Test that seat_number < 1 is rejected."""
        with pytest.raises(ValidationError):
            JurorCreate(
                session_id=uuid.uuid4(),
                seat_number=0,  # Invalid
                first_name="Jane",
                last_name="Doe",
            )
    
    def test_juror_create_with_all_optional_fields(self, sample_juror_data):
        """Test creating juror with all optional fields."""
        data = sample_juror_data.copy()
        data["session_id"] = uuid.uuid4()
        data["occupation"] = "Software Engineer"
        data["neighborhood"] = "Capitol Hill"
        data["notes"] = "Test notes"
        data["demographics"] = {"age_range": "30-40"}
        data["flags"] = {"cause_challenge": True}
        
        juror = JurorCreate(**data)
        
        assert juror.occupation == "Software Engineer"
        assert juror.neighborhood == "Capitol Hill"
        assert juror.flags == {"cause_challenge": True}


class TestJurorUpdate:
    """Tests for JurorUpdate schema."""
    
    def test_juror_update_partial(self):
        """Test partial update with only some fields."""
        update = JurorUpdate(notes="Updated notes")
        assert update.notes == "Updated notes"
        assert update.first_name is None
        assert update.seat_number is None
    
    def test_juror_update_demographics(self):
        """Test updating demographics field."""
        update = JurorUpdate(demographics={"age_range": "40-50", "education": "college"})
        assert update.demographics["education"] == "college"


class TestJurorResponse:
    """Tests for JurorResponse schema."""
    
    def test_juror_response_from_dict(self, sample_juror_data):
        """Test creating response from dictionary."""
        data = sample_juror_data.copy()
        data["id"] = uuid.uuid4()
        data["session_id"] = uuid.uuid4()
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        
        response = JurorResponse(**data)
        assert response.id == data["id"]
        assert response.first_name == data["first_name"]


class TestJurorWithTranscript:
    """Tests for JurorWithTranscript schema."""
    
    def test_juror_with_empty_transcript(self, sample_juror_data):
        """Test juror response with no transcript."""
        data = sample_juror_data.copy()
        data["id"] = uuid.uuid4()
        data["session_id"] = uuid.uuid4()
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        
        response = JurorWithTranscript(**data)
        assert response.transcript_segments == []
        assert response.speaker_labels == []
    
    def test_juror_with_speaker_labels(self, sample_juror_data):
        """Test juror response with speaker labels."""
        data = sample_juror_data.copy()
        data["id"] = uuid.uuid4()
        data["session_id"] = uuid.uuid4()
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        data["speaker_labels"] = ["SPEAKER_00", "SPEAKER_02"]
        
        response = JurorWithTranscript(**data)
        assert len(response.speaker_labels) == 2
        assert "SPEAKER_00" in response.speaker_labels


class TestSpeakerMappingSchemas:
    """Tests for SpeakerMapping schemas."""
    
    def test_speaker_mapping_create(self):
        """Test creating a speaker mapping."""
        mapping = SpeakerMappingCreate(speaker_label="SPEAKER_01")
        assert mapping.speaker_label == "SPEAKER_01"
    
    def test_speaker_mapping_create_empty_label(self):
        """Test that empty speaker_label is rejected."""
        with pytest.raises(ValidationError):
            SpeakerMappingCreate(speaker_label="")
    
    def test_speaker_mapping_response(self):
        """Test speaker mapping response."""
        response = SpeakerMappingResponse(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            juror_id=uuid.uuid4(),
            speaker_label="SPEAKER_00",
            created_at=datetime.utcnow(),
        )
        assert response.speaker_label == "SPEAKER_00"


class TestJurorList:
    """Tests for JurorList schema."""
    
    def test_juror_list_empty(self):
        """Test empty juror list."""
        juror_list = JurorList(items=[], total=0, page=1, page_size=50)
        assert len(juror_list.items) == 0
        assert juror_list.total == 0

