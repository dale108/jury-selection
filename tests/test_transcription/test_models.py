"""Tests for Transcription service models."""
import pytest
import uuid
from datetime import datetime

from services.transcription.app.models import TranscriptSegment


class TestTranscriptSegmentModel:
    """Tests for the TranscriptSegment model."""
    
    def test_transcript_segment_repr(self):
        """Test TranscriptSegment string representation."""
        segment = TranscriptSegment(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            speaker_label="SPEAKER_00",
            content="This is a test transcript segment with some words.",
            start_time=10.5,
            end_time=15.2,
            confidence=0.95,
            created_at=datetime.utcnow(),
        )
        assert "SPEAKER_00" in repr(segment)
        assert "This is a test" in repr(segment)
    
    def test_transcript_segment_long_content_truncated(self):
        """Test that long content is truncated in repr."""
        long_content = "A" * 100  # 100 characters
        segment = TranscriptSegment(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            speaker_label="SPEAKER_01",
            content=long_content,
            start_time=0.0,
            end_time=5.0,
            confidence=0.9,
            created_at=datetime.utcnow(),
        )
        # repr should truncate to 50 chars
        assert len(repr(segment)) < len(long_content) + 50
    
    def test_transcript_segment_optional_recording_id(self):
        """Test that audio_recording_id can be None."""
        segment = TranscriptSegment(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            audio_recording_id=None,
            speaker_label="SPEAKER_00",
            content="Test content",
            start_time=0.0,
            end_time=5.0,
            confidence=0.95,
            created_at=datetime.utcnow(),
        )
        assert segment.audio_recording_id is None

