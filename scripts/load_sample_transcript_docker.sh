#!/bin/bash
# Load sample transcript using Docker container (avoids local SQLAlchemy version issues)

SESSION_ID=$1
RECORDING_ID=$2

if [ -z "$SESSION_ID" ]; then
    echo "Usage: ./scripts/load_sample_transcript_docker.sh <session_id> [recording_id]"
    exit 1
fi

# Copy transcript file into container and run the script there
docker compose exec -T transcription python3 << EOF
import asyncio
import re
import uuid
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
import sys
import os

# Add app to path
sys.path.insert(0, '/app')

from app.models import TranscriptSegment
from app.config import settings

def parse_sample_transcript(file_path: str):
    """Parse the sample transcript file into segments."""
    segments = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
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
    
    return segments

async def load_transcript(session_id_str, recording_id_str=None):
    session_id = uuid.UUID(session_id_str)
    recording_id = uuid.UUID(recording_id_str) if recording_id_str else None
    
    # Parse transcript
    transcript_path = Path('/app/../resources/sample_transcript.txt')
    if not transcript_path.exists():
        transcript_path = Path('/app/resources/sample_transcript.txt')
    
    print(f"Parsing transcript from {transcript_path}...")
    segments = parse_sample_transcript(str(transcript_path))
    print(f"✓ Parsed {len(segments)} segments")
    
    # Create database connection
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
    )
    
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_factory() as db:
        # Check if segments already exist
        result = await db.execute(
            select(TranscriptSegment).where(
                TranscriptSegment.session_id == session_id
            )
        )
        existing = result.scalars().all()
        
        if existing:
            print(f"⚠️  Found {len(existing)} existing segments. Deleting...")
            for seg in existing:
                await db.delete(seg)
            await db.commit()
        
        # Create new segments
        created_segments = []
        for seg_data in segments:
            segment = TranscriptSegment(
                session_id=session_id,
                audio_recording_id=recording_id,
                speaker_label=seg_data["speaker"],
                content=seg_data["text"],
                start_time=seg_data["start"],
                end_time=seg_data["end"],
                confidence=0.95,
                created_at=datetime.utcnow(),
            )
            db.add(segment)
            created_segments.append(segment)
        
        await db.commit()
        
        for seg in created_segments:
            await db.refresh(seg)
        
        print(f"✓ Loaded {len(created_segments)} transcript segments")
        speakers = set(seg.speaker_label for seg in created_segments)
        print(f"  Speakers: {', '.join(sorted(speakers))}")
        print(f"  Duration: {max(seg.end_time for seg in created_segments):.1f}s")
    
    await engine.dispose()

# Run
asyncio.run(load_transcript("$SESSION_ID", "$RECORDING_ID"))
EOF

