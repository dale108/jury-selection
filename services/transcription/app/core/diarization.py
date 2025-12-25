"""Speaker diarization using pyannote-audio."""
import io
import tempfile
import os
from typing import Optional
import numpy as np

from ..config import settings


class DiarizationPipeline:
    """Speaker diarization pipeline using pyannote-audio."""
    
    def __init__(self):
        self._pipeline = None
        self._initialized = False
    
    async def initialize(self) -> bool:
        """Initialize the diarization pipeline."""
        if self._initialized:
            return True
        
        if not settings.hf_auth_token:
            print("Warning: HF_AUTH_TOKEN not set, diarization disabled")
            return False
        
        try:
            from pyannote.audio import Pipeline
            
            # Load the pretrained pipeline
            self._pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=settings.hf_auth_token,
            )
            
            self._initialized = True
            return True
            
        except Exception as e:
            print(f"Failed to initialize diarization pipeline: {e}")
            return False
    
    async def diarize(
        self,
        audio_data: bytes,
        num_speakers: Optional[int] = None,
    ) -> list[dict]:
        """
        Perform speaker diarization on audio data.
        
        Returns list of segments with:
        - speaker: Speaker label (e.g., "SPEAKER_00")
        - start: Start time in seconds
        - end: End time in seconds
        """
        if not self._initialized:
            if not await self.initialize():
                # Return a single speaker if diarization unavailable
                return [{"speaker": "SPEAKER_00", "start": 0.0, "end": float('inf')}]
        
        try:
            import soundfile as sf
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                # Convert webm to wav if needed
                audio_array, sample_rate = self._load_audio(audio_data)
                sf.write(f.name, audio_array, sample_rate)
                temp_path = f.name
            
            try:
                # Run diarization
                if num_speakers:
                    diarization = self._pipeline(temp_path, num_speakers=num_speakers)
                else:
                    diarization = self._pipeline(temp_path)
                
                # Convert to list of segments
                segments = []
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    segments.append({
                        "speaker": speaker,
                        "start": turn.start,
                        "end": turn.end,
                    })
                
                return segments
                
            finally:
                # Clean up temp file
                os.unlink(temp_path)
                
        except Exception as e:
            print(f"Diarization failed: {e}")
            return [{"speaker": "SPEAKER_00", "start": 0.0, "end": float('inf')}]
    
    def _load_audio(self, audio_data: bytes) -> tuple[np.ndarray, int]:
        """Load audio data into numpy array."""
        import librosa
        
        # Load audio from bytes
        audio_array, sample_rate = librosa.load(
            io.BytesIO(audio_data),
            sr=16000,  # Resample to 16kHz for diarization
            mono=True,
        )
        
        return audio_array, sample_rate
    
    def merge_transcription_with_diarization(
        self,
        transcription_segments: list[dict],
        diarization_segments: list[dict],
    ) -> list[dict]:
        """
        Merge transcription segments with speaker labels from diarization.
        
        Each transcription segment gets assigned the speaker who was speaking
        for the majority of that segment's duration.
        """
        result = []
        
        for trans_seg in transcription_segments:
            trans_start = trans_seg["start"]
            trans_end = trans_seg["end"]
            
            # Find overlapping diarization segments
            speaker_times = {}
            for diar_seg in diarization_segments:
                overlap_start = max(trans_start, diar_seg["start"])
                overlap_end = min(trans_end, diar_seg["end"])
                
                if overlap_start < overlap_end:
                    overlap_duration = overlap_end - overlap_start
                    speaker = diar_seg["speaker"]
                    speaker_times[speaker] = speaker_times.get(speaker, 0) + overlap_duration
            
            # Assign the speaker with most overlap time
            if speaker_times:
                speaker = max(speaker_times, key=speaker_times.get)
            else:
                speaker = "SPEAKER_00"
            
            result.append({
                "speaker": speaker,
                "text": trans_seg["text"],
                "start": trans_start,
                "end": trans_end,
            })
        
        return result


# Global pipeline instance
diarization_pipeline = DiarizationPipeline()

