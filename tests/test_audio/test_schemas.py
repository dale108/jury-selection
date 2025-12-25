"""Tests for Audio service schemas."""
import pytest
from datetime import datetime
import uuid

from pydantic import ValidationError

from services.audio.app.schemas import (
    AudioRecordingCreate,
    AudioRecordingResponse,
    AudioChunkResponse,
    RecordingList,
    StreamStartResponse,
    StreamMessage,
)


class TestAudioRecordingSchemas:
    """Tests for AudioRecording schemas."""
    
    def test_audio_recording_create(self):
        """Test creating an audio recording."""
        recording = AudioRecordingCreate(session_id=uuid.uuid4())
        assert recording.session_id is not None
    
    def test_audio_recording_response(self):
        """Test audio recording response."""
        response = AudioRecordingResponse(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            file_path="sessions/123/recordings/abc.webm",
            duration_seconds=120.5,
            status="completed",
            recorded_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        assert response.status == "completed"
        assert response.duration_seconds == 120.5


class TestAudioChunkResponse:
    """Tests for AudioChunkResponse schema."""
    
    def test_chunk_response(self):
        """Test audio chunk response."""
        response = AudioChunkResponse(
            id=uuid.uuid4(),
            recording_id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            chunk_index=3,
            file_path="sessions/123/chunks/abc/3.webm",
            duration_seconds=5.0,
            created_at=datetime.utcnow(),
        )
        assert response.chunk_index == 3
        assert response.duration_seconds == 5.0


class TestRecordingList:
    """Tests for RecordingList schema."""
    
    def test_recording_list_empty(self):
        """Test empty recording list."""
        recording_list = RecordingList(items=[], total=0)
        assert len(recording_list.items) == 0
        assert recording_list.total == 0
    
    def test_recording_list_with_items(self):
        """Test recording list with items."""
        items = [
            AudioRecordingResponse(
                id=uuid.uuid4(),
                session_id=uuid.uuid4(),
                file_path="test.webm",
                duration_seconds=60.0,
                status="completed",
                recorded_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
        ]
        recording_list = RecordingList(items=items, total=1)
        assert len(recording_list.items) == 1


class TestStreamSchemas:
    """Tests for stream-related schemas."""
    
    def test_stream_start_response(self):
        """Test stream start response."""
        response = StreamStartResponse(
            recording_id=uuid.uuid4(),
            session_id=uuid.uuid4(),
        )
        assert response.status == "recording"
        assert response.message == "Audio stream started"
    
    def test_stream_message_start(self):
        """Test stream message for start."""
        message = StreamMessage(
            type="start",
            data={"recording_id": "123", "session_id": "456"},
        )
        assert message.type == "start"
        assert message.error is None
    
    def test_stream_message_error(self):
        """Test stream message for error."""
        message = StreamMessage(
            type="error",
            error="Connection failed",
        )
        assert message.type == "error"
        assert message.error == "Connection failed"

