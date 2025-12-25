"""Juror service API routes."""
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import (
    JurorCreate,
    JurorUpdate,
    JurorResponse,
    JurorWithTranscript,
    JurorList,
    SpeakerMappingCreate,
    SpeakerMappingResponse,
    TranscriptSegmentInfo,
)
from ..crud import juror as juror_crud

router = APIRouter(prefix="/jurors", tags=["jurors"])


@router.post("/", response_model=JurorResponse, status_code=201)
async def create_juror(
    juror_data: JurorCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new juror profile."""
    juror = await juror_crud.create_juror(db, juror_data)
    return juror


@router.get("/", response_model=JurorList)
async def list_jurors(
    session_id: uuid.UUID = Query(..., description="Session ID to filter jurors"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all jurors for a session."""
    skip = (page - 1) * page_size
    jurors, total = await juror_crud.get_jurors_by_session(
        db, session_id, skip=skip, limit=page_size
    )
    return JurorList(
        items=jurors,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{juror_id}", response_model=JurorWithTranscript)
async def get_juror(
    juror_id: uuid.UUID,
    include_transcript: bool = Query(True, description="Include transcript segments"),
    db: AsyncSession = Depends(get_db),
):
    """Get a juror by ID with their transcript segments."""
    juror = await juror_crud.get_juror(db, juror_id)
    if not juror:
        raise HTTPException(status_code=404, detail="Juror not found")
    
    response = JurorWithTranscript(
        id=juror.id,
        session_id=juror.session_id,
        seat_number=juror.seat_number,
        first_name=juror.first_name,
        last_name=juror.last_name,
        occupation=juror.occupation,
        neighborhood=juror.neighborhood,
        notes=juror.notes,
        demographics=juror.demographics,
        flags=juror.flags,
        created_at=juror.created_at,
        updated_at=juror.updated_at,
        speaker_labels=[m.speaker_label for m in juror.speaker_mappings],
    )
    
    if include_transcript:
        try:
            segments = await juror_crud.get_transcript_segments_for_juror(db, juror_id)
            response.transcript_segments = [
                TranscriptSegmentInfo(**seg) for seg in segments
            ]
        except Exception:
            # Transcript table may not exist yet
            response.transcript_segments = []
    
    return response


@router.put("/{juror_id}", response_model=JurorResponse)
async def update_juror(
    juror_id: uuid.UUID,
    juror_data: JurorUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a juror."""
    juror = await juror_crud.update_juror(db, juror_id, juror_data)
    if not juror:
        raise HTTPException(status_code=404, detail="Juror not found")
    return juror


@router.delete("/{juror_id}", status_code=204)
async def delete_juror(
    juror_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a juror."""
    deleted = await juror_crud.delete_juror(db, juror_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Juror not found")
    return None


@router.post("/{juror_id}/speaker-mapping", response_model=SpeakerMappingResponse, status_code=201)
async def create_speaker_mapping(
    juror_id: uuid.UUID,
    mapping_data: SpeakerMappingCreate,
    db: AsyncSession = Depends(get_db),
):
    """Map a speaker label to a juror."""
    # Get juror to get session_id
    juror = await juror_crud.get_juror(db, juror_id)
    if not juror:
        raise HTTPException(status_code=404, detail="Juror not found")
    
    mapping = await juror_crud.create_speaker_mapping(
        db, juror_id, juror.session_id, mapping_data
    )
    if not mapping:
        raise HTTPException(status_code=400, detail="Failed to create speaker mapping")
    return mapping


@router.get("/{juror_id}/speaker-mappings", response_model=list[SpeakerMappingResponse])
async def get_juror_speaker_mappings(
    juror_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all speaker mappings for a juror."""
    juror = await juror_crud.get_juror(db, juror_id)
    if not juror:
        raise HTTPException(status_code=404, detail="Juror not found")
    
    return juror.speaker_mappings

