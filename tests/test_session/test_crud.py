"""Tests for Session service CRUD operations."""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from services.session.app.models import Session, SessionStatus
from services.session.app.schemas import SessionCreate, SessionUpdate, SessionStatusUpdate
from services.session.app.crud.session import (
    create_session,
    get_session,
    get_sessions,
    update_session,
    update_session_status,
    delete_session,
)


@pytest.mark.asyncio
class TestSessionCRUD:
    """Tests for Session CRUD operations."""
    
    async def test_create_session(self, db_session: AsyncSession, sample_session_data: dict):
        """Test creating a new session."""
        session_create = SessionCreate(**sample_session_data)
        session = await create_session(db_session, session_create)
        
        assert session.id is not None
        assert session.case_number == sample_session_data["case_number"]
        assert session.case_name == sample_session_data["case_name"]
        assert session.court == sample_session_data["court"]
        assert session.status == SessionStatus.PENDING
    
    async def test_get_session(self, db_session: AsyncSession, created_session: Session):
        """Test getting a session by ID."""
        retrieved = await get_session(db_session, created_session.id)
        
        assert retrieved is not None
        assert retrieved.id == created_session.id
        assert retrieved.case_number == created_session.case_number
    
    async def test_get_session_not_found(self, db_session: AsyncSession):
        """Test getting a non-existent session."""
        fake_id = uuid.uuid4()
        retrieved = await get_session(db_session, fake_id)
        
        assert retrieved is None
    
    async def test_get_sessions_list(self, db_session: AsyncSession, sample_session_data: dict):
        """Test listing sessions with pagination."""
        # Create multiple sessions
        for i in range(5):
            data = sample_session_data.copy()
            data["case_number"] = f"2024-CR-{i:06d}"
            session_create = SessionCreate(**data)
            await create_session(db_session, session_create)
        
        sessions, total = await get_sessions(db_session, skip=0, limit=3)
        
        assert len(sessions) == 3
        assert total == 5
    
    async def test_get_sessions_filter_by_status(self, db_session: AsyncSession, sample_session_data: dict):
        """Test filtering sessions by status."""
        # Create sessions with different statuses
        session_create = SessionCreate(**sample_session_data)
        session = await create_session(db_session, session_create)
        
        # Update one to active
        await update_session_status(
            db_session, session.id, SessionStatusUpdate(status="active")
        )
        
        # Filter by active
        sessions, total = await get_sessions(db_session, status="active")
        
        assert total >= 1
        for s in sessions:
            assert s.status == SessionStatus.ACTIVE
    
    async def test_update_session(self, db_session: AsyncSession, created_session: Session):
        """Test updating a session."""
        update_data = SessionUpdate(case_name="Updated Case Name")
        updated = await update_session(db_session, created_session.id, update_data)
        
        assert updated is not None
        assert updated.case_name == "Updated Case Name"
        assert updated.case_number == created_session.case_number  # Unchanged
    
    async def test_update_session_not_found(self, db_session: AsyncSession):
        """Test updating a non-existent session."""
        fake_id = uuid.uuid4()
        update_data = SessionUpdate(case_name="New Name")
        updated = await update_session(db_session, fake_id, update_data)
        
        assert updated is None
    
    async def test_update_session_status_to_active(self, db_session: AsyncSession, created_session: Session):
        """Test updating session status to active sets started_at."""
        status_update = SessionStatusUpdate(status="active")
        updated = await update_session_status(db_session, created_session.id, status_update)
        
        assert updated is not None
        assert updated.status == SessionStatus.ACTIVE
        assert updated.started_at is not None
    
    async def test_update_session_status_to_completed(self, db_session: AsyncSession, created_session: Session):
        """Test updating session status to completed sets ended_at."""
        # First activate
        await update_session_status(
            db_session, created_session.id, SessionStatusUpdate(status="active")
        )
        
        # Then complete
        status_update = SessionStatusUpdate(status="completed")
        updated = await update_session_status(db_session, created_session.id, status_update)
        
        assert updated is not None
        assert updated.status == SessionStatus.COMPLETED
        assert updated.ended_at is not None
    
    async def test_delete_session(self, db_session: AsyncSession, created_session: Session):
        """Test deleting a session."""
        deleted = await delete_session(db_session, created_session.id)
        
        assert deleted is True
        
        # Verify it's gone
        retrieved = await get_session(db_session, created_session.id)
        assert retrieved is None
    
    async def test_delete_session_not_found(self, db_session: AsyncSession):
        """Test deleting a non-existent session."""
        fake_id = uuid.uuid4()
        deleted = await delete_session(db_session, fake_id)
        
        assert deleted is False

