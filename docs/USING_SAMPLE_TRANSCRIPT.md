# Using Sample Transcript

The voir-dire backend can use a sample transcript file instead of calling the OpenAI API. This is useful for testing and development.

## Option 1: Load Sample Transcript Directly (Recommended)

Load the sample transcript into the database for a specific session:

```bash
# First, create a session and get its ID
# Then load the transcript:
python scripts/load_sample_transcript.py <session_id>

# With optional recording ID:
python scripts/load_sample_transcript.py <session_id> --recording-id <recording_id>
```

This will parse `resources/sample_transcript.txt` and load all segments into the database.

## Option 2: Use Sample Transcript in Mock Mode

Enable mock mode so the transcription service uses the sample transcript automatically:

```bash
# In your .env file:
USE_SAMPLE_TRANSCRIPT=true
SAMPLE_TRANSCRIPT_PATH=resources/sample_transcript.txt
```

Then restart the transcription service:

```bash
docker compose restart transcription
```

When audio chunks are received, the service will use segments from the sample transcript instead of calling the API.

## Sample Transcript Format

The sample transcript file should be in this format:

```
[13.7s - 26.9s] A
   be fair and impartial and listen to the evidence with an open mind.

[27.1s - 31.5s] A
   There's no right or wrong answer to these questions.

[105.9s - 106.8s] B
   Um, body language.
```

Where:
- `[start_time - end_time]` is the timestamp range
- `A`, `B`, `C`, etc. are speaker labels (will be converted to `SPEAKER_A`, `SPEAKER_B`, etc.)
- The text below is the transcript content

## Example Workflow

1. **Start services:**
   ```bash
   docker compose up -d
   ```

2. **Create a session:**
   ```bash
   curl -X POST http://localhost:8000/api/sessions/ \
     -H "Content-Type: application/json" \
     -d '{"case_number": "2024-TEST-001", "case_name": "Test", "court": "Test Court"}'
   ```
   Save the `id` from the response.

3. **Load sample transcript:**
   ```bash
   python scripts/load_sample_transcript.py <session_id>
   ```

4. **Query transcripts:**
   ```bash
   curl http://localhost:8000/api/transcripts/?session_id=<session_id>
   ```

5. **Map speakers to jurors:**
   ```bash
   # Create a juror first, then map speaker
   curl -X POST http://localhost:8000/api/jurors/<juror_id>/speaker-mapping \
     -H "Content-Type: application/json" \
     -d '{"speaker_label": "SPEAKER_A"}'
   ```

## Notes

- The sample transcript has speakers labeled A, B, C, D, E, F
- These are converted to `SPEAKER_A`, `SPEAKER_B`, etc. in the database
- You can map these speaker labels to actual jurors using the speaker mapping API
- The transcript duration is ~351 seconds (about 6 minutes)

