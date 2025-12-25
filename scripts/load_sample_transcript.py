#!/usr/bin/env python3
"""
Load sample transcript into the database for a given session.

Usage:
    python scripts/load_sample_transcript.py <session_id>
    python scripts/load_sample_transcript.py <session_id> --recording-id <recording_id>
"""

import argparse
import asyncio
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
try:
    from sqlalchemy.ext.asyncio import async_sessionmaker
except ImportError:
    # Fallback for older SQLAlchemy versions
    from sqlalchemy.orm import sessionmaker as async_sessionmaker_base
    from sqlalchemy.ext.asyncio import AsyncSession as AsyncSessionBase
    async_sessionmaker = lambda **kwargs: sessionmaker(class_=AsyncSessionBase, **kwargs)

from sqlalchemy import select

from services.transcription.app.models import TranscriptSegment
from services.transcription.app.config import settings


def parse_sample_transcript(file_path: str) -> list[dict]:
    """Parse the sample transcript file into segments.
    
    Expected format:
    [start_time - end_time] SPEAKER
       text content
    """
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
        
        # Clean up text (remove extra whitespace)
        text = re.sub(r'\s+', ' ', text)
        
        segments.append({
            "speaker": f"SPEAKER_{speaker}",  # Convert A, B, C to SPEAKER_A, SPEAKER_B, etc.
            "text": text,
            "start": start_time,
            "end": end_time,
        })
    
    return segments


async def load_transcript_to_db(
    session_id: uuid.UUID,
    segments: list[dict],
    recording_id: uuid.UUID = None,
):
    """Load transcript segments into the database."""
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
        # Check if segments already exist for this session
        result = await db.execute(
            select(TranscriptSegment).where(
                TranscriptSegment.session_id == session_id
            )
        )
        existing = result.scalars().all()
        
        if existing:
            print(f"⚠️  Found {len(existing)} existing transcript segments for this session.")
            response = input("Delete existing segments and replace? (y/N): ")
            if response.lower() == 'y':
                for seg in existing:
                    await db.delete(seg)
                await db.commit()
                print("✓ Deleted existing segments")
            else:
                print("Cancelled.")
                return
        
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
        
        # Refresh to get IDs
        for seg in created_segments:
            await db.refresh(seg)
        
        print(f"✓ Loaded {len(created_segments)} transcript segments")
        
        # Show summary
        speakers = set(seg.speaker_label for seg in created_segments)
        print(f"  Speakers: {', '.join(sorted(speakers))}")
        print(f"  Duration: {max(seg.end_time for seg in created_segments):.1f}s")
    
    await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(
        description="Load sample transcript into the database"
    )
    parser.add_argument(
        "session_id",
        type=str,
        help="Session ID (UUID)",
    )
    parser.add_argument(
        "--recording-id",
        type=str,
        help="Optional audio recording ID (UUID)",
    )
    parser.add_argument(
        "--transcript-file",
        type=str,
        default="resources/sample_transcript.txt",
        help="Path to transcript file (default: resources/sample_transcript.txt)",
    )
    
    args = parser.parse_args()
    
    # Parse session ID
    try:
        session_id = uuid.UUID(args.session_id)
    except ValueError:
        print(f"Error: Invalid session ID format: {args.session_id}")
        sys.exit(1)
    
    # Parse recording ID if provided
    recording_id = None
    if args.recording_id:
        try:
            recording_id = uuid.UUID(args.recording_id)
        except ValueError:
            print(f"Error: Invalid recording ID format: {args.recording_id}")
            sys.exit(1)
    
    # Check if transcript file exists
    transcript_path = Path(args.transcript_file)
    if not transcript_path.exists():
        print(f"Error: Transcript file not found: {transcript_path}")
        sys.exit(1)
    
    # Parse transcript
    print(f"Parsing transcript from {transcript_path}...")
    segments = parse_sample_transcript(str(transcript_path))
    
    if not segments:
        print("Error: No segments found in transcript file")
        sys.exit(1)
    
    print(f"✓ Parsed {len(segments)} segments")
    
    # Load into database
    await load_transcript_to_db(session_id, segments, recording_id)
    
    print("\n✓ Sample transcript loaded successfully!")
    print(f"\nYou can now query transcripts for session: {session_id}")


if __name__ == "__main__":
    asyncio.run(main())

