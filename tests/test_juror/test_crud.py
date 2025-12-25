"""Tests for Juror service CRUD operations."""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from services.juror.app.models import Juror, SpeakerMapping
from services.session.app.models import Session, SessionStatus
from services.juror.app.schemas import JurorCreate, JurorUpdate, SpeakerMappingCreate
from services.juror.app.crud.juror import (
    create_juror,
    get_juror,
    get_jurors_by_session,
    update_juror,
    delete_juror,
    create_speaker_mapping,
    get_speaker_mappings_by_session,
)


@pytest.mark.asyncio
class TestJurorCRUD:
    """Tests for Juror CRUD operations."""
    
    async def test_create_juror(
        self,
        db_session: AsyncSession,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test creating a new juror."""
        data = sample_juror_data.copy()
        data["session_id"] = created_session.id
        juror_create = JurorCreate(**data)
        
        juror = await create_juror(db_session, juror_create)
        
        assert juror.id is not None
        assert juror.first_name == data["first_name"]
        assert juror.last_name == data["last_name"]
        assert juror.session_id == created_session.id
    
    async def test_get_juror(
        self,
        db_session: AsyncSession,
        created_juror: Juror,
    ):
        """Test getting a juror by ID."""
        retrieved = await get_juror(db_session, created_juror.id)
        
        assert retrieved is not None
        assert retrieved.id == created_juror.id
        assert retrieved.first_name == created_juror.first_name
    
    async def test_get_juror_not_found(self, db_session: AsyncSession):
        """Test getting a non-existent juror."""
        fake_id = uuid.uuid4()
        retrieved = await get_juror(db_session, fake_id)
        
        assert retrieved is None
    
    async def test_get_jurors_by_session(
        self,
        db_session: AsyncSession,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test listing jurors for a session."""
        # Create multiple jurors
        for i in range(3):
            data = sample_juror_data.copy()
            data["session_id"] = created_session.id
            data["seat_number"] = i + 1
            data["first_name"] = f"Juror{i}"
            juror_create = JurorCreate(**data)
            await create_juror(db_session, juror_create)
        
        jurors, total = await get_jurors_by_session(db_session, created_session.id)
        
        assert len(jurors) == 3
        assert total == 3
        # Should be ordered by seat number
        assert jurors[0].seat_number < jurors[1].seat_number
    
    async def test_get_jurors_by_session_pagination(
        self,
        db_session: AsyncSession,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test pagination when listing jurors."""
        # Create multiple jurors
        for i in range(5):
            data = sample_juror_data.copy()
            data["session_id"] = created_session.id
            data["seat_number"] = i + 1
            data["first_name"] = f"Juror{i}"
            juror_create = JurorCreate(**data)
            await create_juror(db_session, juror_create)
        
        jurors, total = await get_jurors_by_session(
            db_session, created_session.id, skip=2, limit=2
        )
        
        assert len(jurors) == 2
        assert total == 5
    
    async def test_update_juror(
        self,
        db_session: AsyncSession,
        created_juror: Juror,
    ):
        """Test updating a juror."""
        update_data = JurorUpdate(
            notes="Updated notes for testing",
            occupation="Updated Occupation",
        )
        
        updated = await update_juror(db_session, created_juror.id, update_data)
        
        assert updated is not None
        assert updated.notes == "Updated notes for testing"
        assert updated.occupation == "Updated Occupation"
        assert updated.first_name == created_juror.first_name  # Unchanged
    
    async def test_update_juror_demographics(
        self,
        db_session: AsyncSession,
        created_juror: Juror,
    ):
        """Test updating juror demographics."""
        update_data = JurorUpdate(
            demographics={"age_range": "50-60", "education": "graduate"},
        )
        
        updated = await update_juror(db_session, created_juror.id, update_data)
        
        assert updated is not None
        assert updated.demographics["age_range"] == "50-60"
        assert updated.demographics["education"] == "graduate"
    
    async def test_update_juror_not_found(self, db_session: AsyncSession):
        """Test updating a non-existent juror."""
        fake_id = uuid.uuid4()
        update_data = JurorUpdate(notes="New notes")
        
        updated = await update_juror(db_session, fake_id, update_data)
        
        assert updated is None
    
    async def test_delete_juror(
        self,
        db_session: AsyncSession,
        created_juror: Juror,
    ):
        """Test deleting a juror."""
        deleted = await delete_juror(db_session, created_juror.id)
        
        assert deleted is True
        
        # Verify it's gone
        retrieved = await get_juror(db_session, created_juror.id)
        assert retrieved is None
    
    async def test_delete_juror_not_found(self, db_session: AsyncSession):
        """Test deleting a non-existent juror."""
        fake_id = uuid.uuid4()
        deleted = await delete_juror(db_session, fake_id)
        
        assert deleted is False


@pytest.mark.asyncio
class TestSpeakerMappingCRUD:
    """Tests for SpeakerMapping CRUD operations."""
    
    async def test_create_speaker_mapping(
        self,
        db_session: AsyncSession,
        created_session: Session,
        created_juror: Juror,
    ):
        """Test creating a speaker mapping."""
        mapping_data = SpeakerMappingCreate(speaker_label="SPEAKER_00")
        
        mapping = await create_speaker_mapping(
            db_session,
            created_juror.id,
            created_session.id,
            mapping_data,
        )
        
        assert mapping is not None
        assert mapping.speaker_label == "SPEAKER_00"
        assert mapping.juror_id == created_juror.id
        assert mapping.session_id == created_session.id
    
    async def test_create_speaker_mapping_updates_existing(
        self,
        db_session: AsyncSession,
        created_session: Session,
        sample_juror_data: dict,
    ):
        """Test that creating a mapping for existing label updates it."""
        # Create two jurors
        data1 = sample_juror_data.copy()
        data1["session_id"] = created_session.id
        data1["seat_number"] = 1
        juror1_create = JurorCreate(**data1)
        juror1 = await create_juror(db_session, juror1_create)
        
        data2 = sample_juror_data.copy()
        data2["session_id"] = created_session.id
        data2["seat_number"] = 2
        data2["first_name"] = "Other"
        juror2_create = JurorCreate(**data2)
        juror2 = await create_juror(db_session, juror2_create)
        
        # Create mapping for juror1
        mapping_data = SpeakerMappingCreate(speaker_label="SPEAKER_00")
        await create_speaker_mapping(
            db_session, juror1.id, created_session.id, mapping_data
        )
        
        # Create same mapping for juror2 (should update)
        updated_mapping = await create_speaker_mapping(
            db_session, juror2.id, created_session.id, mapping_data
        )
        
        assert updated_mapping.juror_id == juror2.id
    
    async def test_get_speaker_mappings_by_session(
        self,
        db_session: AsyncSession,
        created_session: Session,
        created_juror: Juror,
    ):
        """Test getting all speaker mappings for a session."""
        # Create multiple mappings
        for i in range(3):
            mapping_data = SpeakerMappingCreate(speaker_label=f"SPEAKER_{i:02d}")
            await create_speaker_mapping(
                db_session, created_juror.id, created_session.id, mapping_data
            )
        
        mappings = await get_speaker_mappings_by_session(db_session, created_session.id)
        
        assert len(mappings) == 3
    
    async def test_speaker_mapping_cascade_delete(
        self,
        db_session: AsyncSession,
        created_session: Session,
        created_juror: Juror,
    ):
        """Test that deleting juror cascades to speaker mappings."""
        # Create mapping
        mapping_data = SpeakerMappingCreate(speaker_label="SPEAKER_00")
        await create_speaker_mapping(
            db_session, created_juror.id, created_session.id, mapping_data
        )
        
        # Delete juror
        await delete_juror(db_session, created_juror.id)
        
        # Mappings should be gone too
        mappings = await get_speaker_mappings_by_session(db_session, created_session.id)
        assert len(mappings) == 0

