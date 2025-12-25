# Resources

This folder contains static resources used by the voir-dire backend.

## Files

- `sample_transcript.txt` - Sample voir dire transcript with speaker diarization for testing and development

## Usage

The sample transcript can be loaded into the database via:

1. **API Endpoint** (recommended):
   ```bash
   curl -X POST http://localhost:8000/api/transcripts/load-sample/{session_id}
   ```

2. **Python Script**:
   ```bash
   python scripts/load_sample_transcript.py {session_id}
   ```

3. **Mock Mode**: Set `USE_SAMPLE_TRANSCRIPT=true` in `.env` to automatically use this transcript instead of calling the OpenAI API.

## Transcript Format

The transcript file uses this format:
```
[start_time - end_time] SPEAKER
   transcript text content
```

Speakers are labeled A, B, C, etc. and are automatically converted to `SPEAKER_A`, `SPEAKER_B`, etc. in the database.

