"""Session CRUD operations."""
from datetime import datetime
from typing import Optional
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Session, SessionStatus
from ..schemas import SessionCreate, SessionUpdate, SessionStatusUpdate


async def create_session(db: AsyncSession, session_data: SessionCreate) -> Session:
    """Create a new voir dire session."""
    session = Session(
        case_number=session_data.case_number,
        case_name=session_data.case_name,
        court=session_data.court,
        metadata_=session_data.metadata_,
        status=SessionStatus.PENDING,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: uuid.UUID) -> Optional[Session]:
    """Get a session by ID."""
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_sessions(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
) -> tuple[list[Session], int]:
    """Get a paginated list of sessions."""
    query = select(Session)
    
    if status:
        query = query.where(Session.status == SessionStatus(status))
    
    # Get total count
    count_query = select(func.count()).select_from(Session)
    if status:
        count_query = count_query.where(Session.status == SessionStatus(status))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    query = query.order_by(Session.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return list(sessions), total


async def update_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    session_data: SessionUpdate,
) -> Optional[Session]:
    """Update a session."""
    session = await get_session(db, session_id)
    if not session:
        return None
    
    update_data = session_data.model_dump(exclude_unset=True, by_alias=True)
    for field, value in update_data.items():
        if field == "metadata":
            setattr(session, "metadata_", value)
        else:
            setattr(session, field, value)
    
    await db.commit()
    await db.refresh(session)
    return session


async def update_session_status(
    db: AsyncSession,
    session_id: uuid.UUID,
    status_update: SessionStatusUpdate,
) -> Optional[Session]:
    """Update session status."""
    session = await get_session(db, session_id)
    if not session:
        return None
    
    new_status = SessionStatus(status_update.status)
    session.status = new_status
    
    # Update timestamps based on status
    if new_status == SessionStatus.ACTIVE and not session.started_at:
        session.started_at = datetime.utcnow()
    elif new_status in [SessionStatus.COMPLETED, SessionStatus.CANCELLED]:
        session.ended_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(session)
    return session


async def delete_session(db: AsyncSession, session_id: uuid.UUID) -> bool:
    """Delete a session."""
    session = await get_session(db, session_id)
    if not session:
        return False
    
    await db.delete(session)
    await db.commit()
    return True

