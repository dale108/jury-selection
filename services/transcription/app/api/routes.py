"""Transcription service API routes."""
import asyncio
import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import TranscriptSegment
from ..schemas import TranscriptSegmentResponse, TranscriptList, TranscriptByJuror

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from shared.redis_client import redis_client, Channels
from ..config import settings

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


@router.get("/mode")
async def get_transcription_mode():
    """Get the current transcription mode (demo or live)."""
    return {
        "mode": "demo" if settings.use_sample_transcript else "live",
        "demo_mode": settings.use_sample_transcript,
        "description": "Using sample transcript file" if settings.use_sample_transcript else "Using OpenAI API for live transcription",
    }


@router.get("/", response_model=TranscriptList)
async def list_transcripts(
    session_id: Optional[uuid.UUID] = Query(None),
    juror_id: Optional[uuid.UUID] = Query(None),
    speaker_label: Optional[str] = Query(None),
    start_time_min: Optional[float] = Query(None, description="Filter segments starting at or after this time (seconds)"),
    start_time_max: Optional[float] = Query(None, description="Filter segments starting at or before this time (seconds)"),
    search: Optional[str] = Query(None, description="Search text in transcript content"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List transcript segments with filtering.
    
    Supports filtering by:
    - session_id: Filter by session
    - juror_id: Filter by juror (via speaker mappings)
    - speaker_label: Filter by specific speaker
    - start_time_min: Segments starting at or after this timestamp (seconds)
    - start_time_max: Segments starting at or before this timestamp (seconds)
    - search: Text search in transcript content (case-insensitive)
    """
    query = select(TranscriptSegment)
    count_query = select(func.count()).select_from(TranscriptSegment)
    
    if session_id:
        query = query.where(TranscriptSegment.session_id == session_id)
        count_query = count_query.where(TranscriptSegment.session_id == session_id)
    
    if speaker_label:
        query = query.where(TranscriptSegment.speaker_label == speaker_label)
        count_query = count_query.where(TranscriptSegment.speaker_label == speaker_label)
    
    if juror_id:
        # Get speaker labels for this juror from speaker_mappings
        from sqlalchemy import text
        speaker_result = await db.execute(
            text("SELECT speaker_label FROM speaker_mappings WHERE juror_id = :juror_id"),
            {"juror_id": juror_id},
        )
        speaker_labels = [row[0] for row in speaker_result]
        
        if speaker_labels:
            query = query.where(TranscriptSegment.speaker_label.in_(speaker_labels))
            count_query = count_query.where(TranscriptSegment.speaker_label.in_(speaker_labels))
        else:
            # No mappings, return empty
            return TranscriptList(items=[], total=0, session_id=session_id)
    
    # Timestamp filters
    if start_time_min is not None:
        query = query.where(TranscriptSegment.start_time >= start_time_min)
        count_query = count_query.where(TranscriptSegment.start_time >= start_time_min)
    
    if start_time_max is not None:
        query = query.where(TranscriptSegment.start_time <= start_time_max)
        count_query = count_query.where(TranscriptSegment.start_time <= start_time_max)
    
    # Text search
    if search:
        search_pattern = f"%{search}%"
        query = query.where(TranscriptSegment.content.ilike(search_pattern))
        count_query = count_query.where(TranscriptSegment.content.ilike(search_pattern))
    
    # Get count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get segments
    query = query.order_by(TranscriptSegment.start_time).offset(skip).limit(limit)
    result = await db.execute(query)
    segments = result.scalars().all()
    
    return TranscriptList(
        items=segments,
        total=total,
        session_id=session_id,
    )


@router.get("/{segment_id}", response_model=TranscriptSegmentResponse)
async def get_transcript_segment(
    segment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific transcript segment."""
    result = await db.execute(
        select(TranscriptSegment).where(TranscriptSegment.id == segment_id)
    )
    segment = result.scalar_one_or_none()
    
    if not segment:
        raise HTTPException(status_code=404, detail="Transcript segment not found")
    
    return segment


@router.get("/session/{session_id}/by-speaker", response_model=list[TranscriptByJuror])
async def get_transcripts_by_speaker(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get transcript segments grouped by speaker for a session."""
    # Get all segments for the session
    result = await db.execute(
        select(TranscriptSegment)
        .where(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time)
    )
    segments = result.scalars().all()
    
    # Get speaker mappings
    from sqlalchemy import text
    mapping_result = await db.execute(
        text("""
            SELECT sm.speaker_label, sm.juror_id, j.first_name, j.last_name
            FROM speaker_mappings sm
            LEFT JOIN jurors j ON sm.juror_id = j.id
            WHERE sm.session_id = :session_id
        """),
        {"session_id": session_id},
    )
    mappings = {row[0]: {"juror_id": row[1], "name": f"{row[2]} {row[3]}" if row[2] else None} 
                for row in mapping_result}
    
    # Group by speaker
    speakers = {}
    for seg in segments:
        if seg.speaker_label not in speakers:
            mapping = mappings.get(seg.speaker_label, {})
            speakers[seg.speaker_label] = {
                "speaker_label": seg.speaker_label,
                "juror_id": mapping.get("juror_id"),
                "juror_name": mapping.get("name"),
                "segments": [],
                "total_speaking_time": 0.0,
            }
        speakers[seg.speaker_label]["segments"].append(seg)
        speakers[seg.speaker_label]["total_speaking_time"] += seg.end_time - seg.start_time
    
    return [TranscriptByJuror(**data) for data in speakers.values()]


@router.websocket("/live/{session_id}")
async def websocket_live_transcript(
    websocket: WebSocket,
    session_id: uuid.UUID,
):
    """WebSocket endpoint for receiving live transcripts."""
    await websocket.accept()
    
    # Subscribe to transcript ready channel
    channel = Channels.transcript_ready(str(session_id))
    pubsub = await redis_client.subscribe(channel)
    
    try:
        while True:
            # Check for new messages
            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1.0,
            )
            
            if message and message["type"] == "message":
                # Forward to client
                await websocket.send_text(message["data"])
            
            # Also check for client messages (ping/close)
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=0.1,
                )
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                break
                
    finally:
        await pubsub.unsubscribe(channel)


@router.post("/load-sample/{session_id}", status_code=201)
async def load_sample_transcript(
    session_id: uuid.UUID,
    transcript_file: Optional[str] = Query(None, description="Path to transcript file"),
    db: AsyncSession = Depends(get_db),
):
    """Load sample transcript from file into database."""
    import re
    from pathlib import Path
    
    # Default transcript path
    if not transcript_file:
        # Try to find the sample transcript file
        # Try multiple locations
        possible_paths = [
            Path("resources/sample_transcript.txt"),  # Relative to current dir
            Path("/app/resources/sample_transcript.txt"),  # Docker container
            Path(__file__).parent.parent.parent.parent.parent / "resources" / "sample_transcript.txt",  # Project root
        ]
        
        for path in possible_paths:
            if path.exists():
                transcript_file = str(path)
                break
        else:
            raise HTTPException(status_code=404, detail="Sample transcript file not found in any expected location")
    
    transcript_path = Path(transcript_file)
    if not transcript_path.exists():
        raise HTTPException(status_code=404, detail=f"Transcript file not found: {transcript_file}")
    
    # Parse transcript
    segments = []
    with open(transcript_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match: [13.7s - 26.9s] A
    pattern = r'\[(\d+\.?\d*)s\s*-\s*(\d+\.?\d*)s\]\s*([A-Z])\s*\n\s*(.+?)(?=\n\[|\Z)'
    matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
    
    for match in matches:
        start_time = float(match.group(1))
        end_time = float(match.group(2))
        speaker = match.group(3)
        text = match.group(4).strip()
        text = re.sub(r'\s+', ' ', text)
        
        segments.append({
            "speaker": f"SPEAKER_{speaker}",
            "text": text,
            "start": start_time,
            "end": end_time,
        })
    
    if not segments:
        raise HTTPException(status_code=400, detail="No segments found in transcript file")
    
    # Check for existing segments
    result = await db.execute(
        select(TranscriptSegment).where(TranscriptSegment.session_id == session_id)
    )
    existing = result.scalars().all()
    
    if existing:
        # Delete existing
        for seg in existing:
            await db.delete(seg)
        await db.commit()
    
    # Create new segments
    created_count = 0
    for seg_data in segments:
        segment = TranscriptSegment(
            session_id=session_id,
            audio_recording_id=None,
            speaker_label=seg_data["speaker"],
            content=seg_data["text"],
            start_time=seg_data["start"],
            end_time=seg_data["end"],
            confidence=0.95,
        )
        db.add(segment)
        created_count += 1
    
    await db.commit()
    
    speakers = set(seg["speaker"] for seg in segments)
    
    return {
        "message": "Sample transcript loaded successfully",
        "session_id": str(session_id),
        "segments_loaded": created_count,
        "speakers": sorted(list(speakers)),
        "duration_seconds": max(seg["end"] for seg in segments),
    }


@router.post("/retranscribe/{session_id}/{recording_id}")
async def retranscribe_recording(
    session_id: uuid.UUID,
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Re-transcribe an existing recording.
    Useful for testing transcription after code changes.
    """
    from ..core.processor import TranscriptionProcessor
    from shared.schemas.events import RecordingCompleteEvent
    
    # Get recording info from MinIO path pattern
    file_path = f"sessions/{session_id}/recordings/{recording_id}.webm"
    
    # Create a mock event
    event = RecordingCompleteEvent(
        session_id=str(session_id),
        recording_id=str(recording_id),
        file_path=file_path,
        duration_seconds=0,  # Will be determined from audio
    )
    
    # Delete existing transcripts for this recording
    await db.execute(
        select(TranscriptSegment)
        .where(TranscriptSegment.audio_recording_id == recording_id)
    )
    from sqlalchemy import delete
    await db.execute(
        delete(TranscriptSegment)
        .where(TranscriptSegment.audio_recording_id == recording_id)
    )
    await db.commit()
    
    # Process the recording
    processor = TranscriptionProcessor(db)
    segments = await processor.process_recording(event)
    
    return {
        "message": "Retranscription complete",
        "session_id": str(session_id),
        "recording_id": str(recording_id),
        "segments_created": len(segments),
        "segments": [
            {
                "speaker": seg.speaker_label,
                "content": seg.content[:100] + "..." if len(seg.content) > 100 else seg.content,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
            }
            for seg in segments
        ]
    }

