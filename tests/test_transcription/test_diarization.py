"""Tests for speaker diarization."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import numpy as np

from services.transcription.app.core.diarization import DiarizationPipeline


class TestDiarizationPipeline:
    """Tests for DiarizationPipeline class."""
    
    @pytest.fixture
    def pipeline(self):
        """Create a DiarizationPipeline instance."""
        return DiarizationPipeline()
    
    def test_merge_transcription_with_diarization(self, pipeline):
        """Test merging transcription with diarization segments."""
        transcription_segments = [
            {"text": "Hello, how are you?", "start": 0.0, "end": 3.0},
            {"text": "I'm doing great, thanks.", "start": 3.5, "end": 6.0},
            {"text": "That's wonderful to hear.", "start": 6.5, "end": 9.0},
        ]
        
        diarization_segments = [
            {"speaker": "SPEAKER_00", "start": 0.0, "end": 3.2},
            {"speaker": "SPEAKER_01", "start": 3.2, "end": 6.5},
            {"speaker": "SPEAKER_00", "start": 6.5, "end": 10.0},
        ]
        
        result = pipeline.merge_transcription_with_diarization(
            transcription_segments,
            diarization_segments,
        )
        
        assert len(result) == 3
        assert result[0]["speaker"] == "SPEAKER_00"
        assert result[0]["text"] == "Hello, how are you?"
        assert result[1]["speaker"] == "SPEAKER_01"
        assert result[2]["speaker"] == "SPEAKER_00"
    
    def test_merge_with_overlapping_speakers(self, pipeline):
        """Test merging when speakers overlap."""
        transcription_segments = [
            {"text": "Testing overlap", "start": 2.0, "end": 5.0},
        ]
        
        diarization_segments = [
            {"speaker": "SPEAKER_00", "start": 0.0, "end": 3.0},  # 1 second overlap
            {"speaker": "SPEAKER_01", "start": 3.0, "end": 10.0},  # 2 seconds overlap
        ]
        
        result = pipeline.merge_transcription_with_diarization(
            transcription_segments,
            diarization_segments,
        )
        
        # SPEAKER_01 has more overlap (2s vs 1s)
        assert result[0]["speaker"] == "SPEAKER_01"
    
    def test_merge_with_no_diarization(self, pipeline):
        """Test merging with empty diarization."""
        transcription_segments = [
            {"text": "No speakers detected", "start": 0.0, "end": 3.0},
        ]
        
        diarization_segments = []
        
        result = pipeline.merge_transcription_with_diarization(
            transcription_segments,
            diarization_segments,
        )
        
        # Should default to SPEAKER_00
        assert result[0]["speaker"] == "SPEAKER_00"
    
    def test_merge_preserves_timestamps(self, pipeline):
        """Test that merge preserves original timestamps."""
        transcription_segments = [
            {"text": "Test", "start": 5.5, "end": 8.3},
        ]
        
        diarization_segments = [
            {"speaker": "SPEAKER_02", "start": 0.0, "end": 10.0},
        ]
        
        result = pipeline.merge_transcription_with_diarization(
            transcription_segments,
            diarization_segments,
        )
        
        assert result[0]["start"] == 5.5
        assert result[0]["end"] == 8.3
    
    @pytest.mark.asyncio
    async def test_diarize_without_initialization(self, pipeline):
        """Test diarize returns default speaker when not initialized."""
        # Without HF_AUTH_TOKEN, initialization should fail gracefully
        audio_data = b"fake audio data"
        
        with patch.object(pipeline, '_initialized', False):
            with patch.object(pipeline, 'initialize', AsyncMock(return_value=False)):
                result = await pipeline.diarize(audio_data)
        
        # Should return default speaker
        assert len(result) == 1
        assert result[0]["speaker"] == "SPEAKER_00"

