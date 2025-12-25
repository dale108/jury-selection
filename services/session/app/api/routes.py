"""Session service API routes."""
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import (
    SessionCreate,
    SessionUpdate,
    SessionStatusUpdate,
    SessionResponse,
    SessionList,
)
from ..crud import session as session_crud

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionResponse, status_code=201)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new voir dire session."""
    session = await session_crud.create_session(db, session_data)
    # Convert SQLAlchemy model to dict to avoid metadata conflict
    return SessionResponse(
        id=session.id,
        case_number=session.case_number,
        case_name=session.case_name,
        court=session.court,
        status=session.status.value if hasattr(session.status, 'value') else str(session.status),
        started_at=session.started_at,
        ended_at=session.ended_at,
        metadata=session.metadata_,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.get("/", response_model=SessionList)
async def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all sessions with pagination."""
    skip = (page - 1) * page_size
    sessions, total = await session_crud.get_sessions(
        db, skip=skip, limit=page_size, status=status
    )
    # Convert SQLAlchemy models to response models
    session_responses = [
        SessionResponse(
            id=s.id,
            case_number=s.case_number,
            case_name=s.case_name,
            court=s.court,
            status=s.status.value if hasattr(s.status, 'value') else str(s.status),
            started_at=s.started_at,
            ended_at=s.ended_at,
            metadata=s.metadata_,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sessions
    ]
    return SessionList(
        items=session_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a session by ID."""
    session = await session_crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # Convert SQLAlchemy model to dict to avoid metadata conflict
    return SessionResponse(
        id=session.id,
        case_number=session.case_number,
        case_name=session.case_name,
        court=session.court,
        status=session.status.value if hasattr(session.status, 'value') else str(session.status),
        started_at=session.started_at,
        ended_at=session.ended_at,
        metadata=session.metadata_,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: uuid.UUID,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a session."""
    session = await session_crud.update_session(db, session_id, session_data)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # Convert SQLAlchemy model to dict to avoid metadata conflict
    return SessionResponse(
        id=session.id,
        case_number=session.case_number,
        case_name=session.case_name,
        court=session.court,
        status=session.status.value if hasattr(session.status, 'value') else str(session.status),
        started_at=session.started_at,
        ended_at=session.ended_at,
        metadata=session.metadata_,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.patch("/{session_id}/status", response_model=SessionResponse)
async def update_session_status(
    session_id: uuid.UUID,
    status_update: SessionStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update session status."""
    session = await session_crud.update_session_status(db, session_id, status_update)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # Convert SQLAlchemy model to dict to avoid metadata conflict
    return SessionResponse(
        id=session.id,
        case_number=session.case_number,
        case_name=session.case_name,
        court=session.court,
        status=session.status.value if hasattr(session.status, 'value') else str(session.status),
        started_at=session.started_at,
        ended_at=session.ended_at,
        metadata=session.metadata_,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a session."""
    deleted = await session_crud.delete_session(db, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return None

