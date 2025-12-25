"""Tests for shared event schemas."""
import pytest
from datetime import datetime
import uuid

from shared.schemas.events import (
    AudioChunkEvent,
    TranscriptReadyEvent,
    SessionStatusEvent,
)


class TestAudioChunkEvent:
    """Tests for AudioChunkEvent schema."""
    
    def test_audio_chunk_event_creation(self):
        """Test creating an audio chunk event."""
        event = AudioChunkEvent(
            session_id="session-123",
            recording_id="recording-456",
            chunk_index=5,
            file_path="sessions/123/chunks/456/5.webm",
            duration_seconds=5.0,
        )
        
        assert event.session_id == "session-123"
        assert event.recording_id == "recording-456"
        assert event.chunk_index == 5
        assert event.duration_seconds == 5.0
    
    def test_audio_chunk_event_auto_id(self):
        """Test that event_id is auto-generated."""
        event = AudioChunkEvent(
            session_id="session-123",
            recording_id="recording-456",
            chunk_index=0,
            file_path="test.webm",
            duration_seconds=5.0,
        )
        
        assert event.event_id is not None
        # Should be a valid UUID string
        uuid.UUID(event.event_id)
    
    def test_audio_chunk_event_auto_timestamp(self):
        """Test that timestamp is auto-generated."""
        event = AudioChunkEvent(
            session_id="session-123",
            recording_id="recording-456",
            chunk_index=0,
            file_path="test.webm",
            duration_seconds=5.0,
        )
        
        assert event.timestamp is not None
        assert isinstance(event.timestamp, datetime)


class TestTranscriptReadyEvent:
    """Tests for TranscriptReadyEvent schema."""
    
    def test_transcript_ready_event_creation(self):
        """Test creating a transcript ready event."""
        event = TranscriptReadyEvent(
            session_id="session-123",
            segment_id="segment-789",
            speaker_label="SPEAKER_00",
            content="Hello, this is a test transcript.",
            start_time=10.5,
            end_time=15.2,
            confidence=0.95,
        )
        
        assert event.session_id == "session-123"
        assert event.speaker_label == "SPEAKER_00"
        assert event.content == "Hello, this is a test transcript."
        assert event.confidence == 0.95
    
    def test_transcript_ready_event_serialization(self):
        """Test event serialization to JSON."""
        event = TranscriptReadyEvent(
            session_id="session-123",
            segment_id="segment-789",
            speaker_label="SPEAKER_01",
            content="Test content",
            start_time=0.0,
            end_time=5.0,
            confidence=0.9,
        )
        
        # Should be serializable
        data = event.model_dump(mode="json")
        
        assert data["session_id"] == "session-123"
        assert data["speaker_label"] == "SPEAKER_01"
        assert isinstance(data["timestamp"], str)  # ISO format string


class TestSessionStatusEvent:
    """Tests for SessionStatusEvent schema."""
    
    def test_session_status_event_creation(self):
        """Test creating a session status event."""
        event = SessionStatusEvent(
            session_id="session-123",
            old_status="pending",
            new_status="active",
        )
        
        assert event.session_id == "session-123"
        assert event.old_status == "pending"
        assert event.new_status == "active"
    
    def test_session_status_event_without_old_status(self):
        """Test event without old_status (initial status)."""
        event = SessionStatusEvent(
            session_id="session-123",
            new_status="pending",
        )
        
        assert event.old_status is None
        assert event.new_status == "pending"

