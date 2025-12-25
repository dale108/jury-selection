"""Tests for Transcription service schemas."""
import pytest
from datetime import datetime
import uuid

from pydantic import ValidationError

from services.transcription.app.schemas import (
    TranscriptSegmentCreate,
    TranscriptSegmentResponse,
    TranscriptList,
    TranscriptByJuror,
    LiveTranscriptMessage,
)


class TestTranscriptSegmentSchemas:
    """Tests for TranscriptSegment schemas."""
    
    def test_transcript_segment_create(self, sample_transcript_segment_data):
        """Test creating a transcript segment."""
        data = sample_transcript_segment_data.copy()
        data["session_id"] = uuid.uuid4()
        
        segment = TranscriptSegmentCreate(**data)
        
        assert segment.speaker_label == data["speaker_label"]
        assert segment.content == data["content"]
        assert segment.start_time == data["start_time"]
        assert segment.end_time == data["end_time"]
    
    def test_transcript_segment_create_with_recording_id(self, sample_transcript_segment_data):
        """Test creating segment with audio recording ID."""
        data = sample_transcript_segment_data.copy()
        data["session_id"] = uuid.uuid4()
        data["audio_recording_id"] = uuid.uuid4()
        
        segment = TranscriptSegmentCreate(**data)
        
        assert segment.audio_recording_id is not None
    
    def test_transcript_segment_response(self, sample_transcript_segment_data):
        """Test transcript segment response."""
        data = sample_transcript_segment_data.copy()
        data["id"] = uuid.uuid4()
        data["session_id"] = uuid.uuid4()
        data["created_at"] = datetime.utcnow()
        
        response = TranscriptSegmentResponse(**data)
        
        assert response.id == data["id"]
        assert response.speaker_label == data["speaker_label"]


class TestTranscriptList:
    """Tests for TranscriptList schema."""
    
    def test_transcript_list_empty(self):
        """Test empty transcript list."""
        transcript_list = TranscriptList(items=[], total=0)
        assert len(transcript_list.items) == 0
        assert transcript_list.total == 0
    
    def test_transcript_list_with_session_id(self):
        """Test transcript list with session ID."""
        session_id = uuid.uuid4()
        transcript_list = TranscriptList(items=[], total=0, session_id=session_id)
        assert transcript_list.session_id == session_id


class TestTranscriptByJuror:
    """Tests for TranscriptByJuror schema."""
    
    def test_transcript_by_juror(self, sample_transcript_segment_data):
        """Test transcript grouped by juror."""
        segment_data = sample_transcript_segment_data.copy()
        segment_data["id"] = uuid.uuid4()
        segment_data["session_id"] = uuid.uuid4()
        segment_data["created_at"] = datetime.utcnow()
        
        segments = [TranscriptSegmentResponse(**segment_data)]
        
        by_juror = TranscriptByJuror(
            speaker_label="SPEAKER_00",
            juror_id=uuid.uuid4(),
            juror_name="Jane Doe",
            segments=segments,
            total_speaking_time=30.5,
        )
        
        assert by_juror.speaker_label == "SPEAKER_00"
        assert by_juror.juror_name == "Jane Doe"
        assert by_juror.total_speaking_time == 30.5
    
    def test_transcript_by_juror_no_mapping(self, sample_transcript_segment_data):
        """Test transcript with no juror mapping."""
        segment_data = sample_transcript_segment_data.copy()
        segment_data["id"] = uuid.uuid4()
        segment_data["session_id"] = uuid.uuid4()
        segment_data["created_at"] = datetime.utcnow()
        
        by_juror = TranscriptByJuror(
            speaker_label="SPEAKER_02",
            juror_id=None,
            juror_name=None,
            segments=[],
            total_speaking_time=0.0,
        )
        
        assert by_juror.juror_id is None
        assert by_juror.juror_name is None


class TestLiveTranscriptMessage:
    """Tests for LiveTranscriptMessage schema."""
    
    def test_live_message_segment(self):
        """Test live transcript message for segment."""
        message = LiveTranscriptMessage(
            type="segment",
            session_id="abc-123",
            data={
                "speaker_label": "SPEAKER_00",
                "content": "Hello world",
            },
        )
        assert message.type == "segment"
        assert message.data["content"] == "Hello world"
    
    def test_live_message_error(self):
        """Test live transcript message for error."""
        message = LiveTranscriptMessage(
            type="error",
            session_id="abc-123",
            error="Transcription failed",
        )
        assert message.type == "error"
        assert message.error == "Transcription failed"

