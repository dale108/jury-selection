"""Tests for Audio service models."""
import pytest
import uuid
from datetime import datetime

from services.audio.app.models import AudioRecording, AudioChunk, RecordingStatus


class TestAudioRecordingModel:
    """Tests for the AudioRecording model."""
    
    def test_recording_status_enum_values(self):
        """Test that RecordingStatus enum has expected values."""
        assert RecordingStatus.RECORDING.value == "recording"
        assert RecordingStatus.PROCESSING.value == "processing"
        assert RecordingStatus.COMPLETED.value == "completed"
        assert RecordingStatus.FAILED.value == "failed"
    
    def test_audio_recording_repr(self):
        """Test AudioRecording string representation."""
        recording = AudioRecording(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            file_path="test/path.webm",
            status=RecordingStatus.RECORDING,
            recorded_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        assert "AudioRecording" in repr(recording)
        assert "recording" in repr(recording)
    
    def test_audio_recording_optional_duration(self):
        """Test that duration_seconds can be None."""
        recording = AudioRecording(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            file_path="test/path.webm",
            status=RecordingStatus.RECORDING,
            duration_seconds=None,
            recorded_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        assert recording.duration_seconds is None


class TestAudioChunkModel:
    """Tests for the AudioChunk model."""
    
    def test_audio_chunk_repr(self):
        """Test AudioChunk string representation."""
        recording_id = uuid.uuid4()
        chunk = AudioChunk(
            id=uuid.uuid4(),
            recording_id=recording_id,
            session_id=uuid.uuid4(),
            chunk_index=5,
            file_path="test/chunk.webm",
            duration_seconds=5.0,
            created_at=datetime.utcnow(),
        )
        assert "AudioChunk" in repr(chunk)
        assert "5" in repr(chunk)

