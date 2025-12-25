"""Juror CRUD operations."""
from typing import Optional
import uuid
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Juror, SpeakerMapping
from ..schemas import JurorCreate, JurorUpdate, SpeakerMappingCreate


async def create_juror(db: AsyncSession, juror_data: JurorCreate) -> Juror:
    """Create a new juror profile."""
    juror = Juror(**juror_data.model_dump())
    db.add(juror)
    await db.commit()
    await db.refresh(juror)
    return juror


async def get_juror(db: AsyncSession, juror_id: uuid.UUID) -> Optional[Juror]:
    """Get a juror by ID."""
    result = await db.execute(
        select(Juror)
        .options(selectinload(Juror.speaker_mappings))
        .where(Juror.id == juror_id)
    )
    return result.scalar_one_or_none()


async def get_jurors_by_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[Juror], int]:
    """Get all jurors for a session."""
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Juror).where(Juror.session_id == session_id)
    )
    total = count_result.scalar()
    
    # Get jurors
    result = await db.execute(
        select(Juror)
        .options(selectinload(Juror.speaker_mappings))
        .where(Juror.session_id == session_id)
        .order_by(Juror.seat_number)
        .offset(skip)
        .limit(limit)
    )
    jurors = result.scalars().all()
    
    return list(jurors), total


async def update_juror(
    db: AsyncSession,
    juror_id: uuid.UUID,
    juror_data: JurorUpdate,
) -> Optional[Juror]:
    """Update a juror."""
    juror = await get_juror(db, juror_id)
    if not juror:
        return None
    
    update_data = juror_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(juror, field, value)
    
    await db.commit()
    await db.refresh(juror)
    return juror


async def delete_juror(db: AsyncSession, juror_id: uuid.UUID) -> bool:
    """Delete a juror."""
    juror = await get_juror(db, juror_id)
    if not juror:
        return False
    
    await db.delete(juror)
    await db.commit()
    return True


async def create_speaker_mapping(
    db: AsyncSession,
    juror_id: uuid.UUID,
    session_id: uuid.UUID,
    mapping_data: SpeakerMappingCreate,
) -> Optional[SpeakerMapping]:
    """Create a speaker mapping for a juror."""
    juror = await get_juror(db, juror_id)
    if not juror:
        return None
    
    # Check if mapping already exists
    existing = await db.execute(
        select(SpeakerMapping).where(
            SpeakerMapping.session_id == session_id,
            SpeakerMapping.speaker_label == mapping_data.speaker_label,
        )
    )
    if existing.scalar_one_or_none():
        # Update existing mapping
        await db.execute(
            text("""
                UPDATE speaker_mappings 
                SET juror_id = :juror_id 
                WHERE session_id = :session_id AND speaker_label = :speaker_label
            """),
            {"juror_id": juror_id, "session_id": session_id, "speaker_label": mapping_data.speaker_label}
        )
        await db.commit()
        result = await db.execute(
            select(SpeakerMapping).where(
                SpeakerMapping.session_id == session_id,
                SpeakerMapping.speaker_label == mapping_data.speaker_label,
            )
        )
        return result.scalar_one_or_none()
    
    mapping = SpeakerMapping(
        juror_id=juror_id,
        session_id=session_id,
        speaker_label=mapping_data.speaker_label,
    )
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return mapping


async def get_speaker_mappings_by_session(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> list[SpeakerMapping]:
    """Get all speaker mappings for a session."""
    result = await db.execute(
        select(SpeakerMapping).where(SpeakerMapping.session_id == session_id)
    )
    return list(result.scalars().all())


async def get_transcript_segments_for_juror(
    db: AsyncSession,
    juror_id: uuid.UUID,
) -> list[dict]:
    """Get all transcript segments attributed to a juror via speaker mappings."""
    # Get juror's speaker labels
    juror = await get_juror(db, juror_id)
    if not juror or not juror.speaker_mappings:
        return []
    
    speaker_labels = [m.speaker_label for m in juror.speaker_mappings]
    
    # Query transcript_segments table (from transcription service)
    # Using raw SQL since the model is in another service
    result = await db.execute(
        text("""
            SELECT id, content, start_time, end_time, confidence, created_at
            FROM transcript_segments
            WHERE session_id = :session_id AND speaker_label = ANY(:labels)
            ORDER BY start_time
        """),
        {"session_id": juror.session_id, "labels": speaker_labels}
    )
    
    segments = []
    for row in result:
        segments.append({
            "id": row.id,
            "content": row.content,
            "start_time": row.start_time,
            "end_time": row.end_time,
            "confidence": row.confidence,
            "created_at": row.created_at,
        })
    
    return segments

