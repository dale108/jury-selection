"""Audio service API routes."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AudioRecording, AudioChunk
from ..schemas import AudioRecordingResponse, RecordingList, AudioChunkResponse
from ..websocket.audio_stream import AudioStreamHandler
from ..core.storage import audio_storage

router = APIRouter(prefix="/audio", tags=["audio"])


@router.get("/recordings/{session_id}", response_model=RecordingList)
async def list_recordings(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all recordings for a session."""
    result = await db.execute(
        select(AudioRecording)
        .where(AudioRecording.session_id == session_id)
        .order_by(AudioRecording.recorded_at.desc())
    )
    recordings = result.scalars().all()
    
    return RecordingList(
        items=recordings,
        total=len(recordings),
    )


@router.get("/recordings/{session_id}/{recording_id}", response_model=AudioRecordingResponse)
async def get_recording(
    session_id: uuid.UUID,
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific recording."""
    result = await db.execute(
        select(AudioRecording).where(
            AudioRecording.id == recording_id,
            AudioRecording.session_id == session_id,
        )
    )
    recording = result.scalar_one_or_none()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    return recording


@router.get("/recordings/{session_id}/{recording_id}/chunks", response_model=list[AudioChunkResponse])
async def list_chunks(
    session_id: uuid.UUID,
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all chunks for a recording."""
    result = await db.execute(
        select(AudioChunk)
        .where(
            AudioChunk.recording_id == recording_id,
            AudioChunk.session_id == session_id,
        )
        .order_by(AudioChunk.chunk_index)
    )
    chunks = result.scalars().all()
    return chunks


@router.get("/recordings/{session_id}/{recording_id}/download")
async def get_recording_url(
    session_id: uuid.UUID,
    recording_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a presigned URL to download a recording."""
    result = await db.execute(
        select(AudioRecording).where(
            AudioRecording.id == recording_id,
            AudioRecording.session_id == session_id,
        )
    )
    recording = result.scalar_one_or_none()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    try:
        url = await audio_storage.get_presigned_url(recording.file_path)
        return {"download_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/stream/{session_id}")
async def websocket_audio_stream(
    websocket: WebSocket,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for streaming audio."""
    handler = AudioStreamHandler(websocket, session_id, db)
    await handler.handle()

