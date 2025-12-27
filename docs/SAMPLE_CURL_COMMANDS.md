# Sample cURL Commands for Voir-Dire API

Complete set of cURL commands to test the voir-dire backend. All commands use the gateway at `http://localhost:8000/api`.

## Quick Start

Run the automated test workflow:
```bash
./scripts/test_workflow.sh
```

Or follow these manual steps:

## 1. Create a Session

```bash
curl -X POST http://localhost:8000/api/sessions/ \
  -H "Content-Type: application/json" \
  -d '{
    "case_number": "2024-TEST-001",
    "case_name": "State v. Test Defendant",
    "court": "King County Superior Court",
    "metadata": {
      "judge": "Hon. Test Judge",
      "courtroom": "E-501"
    }
  }'
```

**Save the `id` from the response as `SESSION_ID`**

## 2. Update Session Status

```bash
curl -X PATCH http://localhost:8000/api/sessions/{SESSION_ID}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

## 3. Create Jurors

```bash
# Juror 1
curl -X POST http://localhost:8000/api/jurors/ \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "{SESSION_ID}",
    "seat_number": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "occupation": "Software Engineer",
    "neighborhood": "Capitol Hill",
    "demographics": {"age_range": "30-40"},
    "notes": "Works from home"
  }'

# Juror 2
curl -X POST http://localhost:8000/api/jurors/ \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "{SESSION_ID}",
    "seat_number": 2,
    "first_name": "John",
    "last_name": "Doe",
    "occupation": "Teacher",
    "neighborhood": "Ballard",
    "demographics": {"age_range": "40-50"}
  }'
```

**Save the juror IDs from responses**

## 4. Load Sample Transcript

```bash
python scripts/load_sample_transcript.py {SESSION_ID}
```

This loads the sample transcript from `resources/sample_transcript.txt` into the database.

## 5. Map Speakers to Jurors

```bash
# Map SPEAKER_A to Juror 1
curl -X POST http://localhost:8000/api/jurors/{JUROR1_ID}/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_A"}'

# Map SPEAKER_B to Juror 2
curl -X POST http://localhost:8000/api/jurors/{JUROR2_ID}/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_B"}'
```

## 6. Query Transcripts

### Get all transcripts for a session
```bash
curl "http://localhost:8000/api/transcripts/?session_id={SESSION_ID}"
```

### Get transcripts for a specific juror
```bash
curl "http://localhost:8000/api/transcripts/?juror_id={JUROR_ID}"
```

### Get transcripts for a specific speaker
```bash
curl "http://localhost:8000/api/transcripts/?session_id={SESSION_ID}&speaker_label=SPEAKER_A"
```

### Get transcripts grouped by speaker
```bash
curl "http://localhost:8000/api/transcripts/session/{SESSION_ID}/by-speaker"
```

## 7. Get Juror with Transcript

```bash
curl http://localhost:8000/api/jurors/{JUROR_ID}
```

This returns the juror profile with all their transcript segments attached.

## 8. List All Jurors for Session

```bash
curl "http://localhost:8000/api/jurors/?session_id={SESSION_ID}"
```

## 9. Update Juror

```bash
curl -X PUT http://localhost:8000/api/jurors/{JUROR_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated notes after voir dire",
    "flags": {"cause_challenge": true}
  }'
```

## 10. Get Session Details

```bash
curl http://localhost:8000/api/sessions/{SESSION_ID}
```

## 11. List All Sessions

```bash
curl "http://localhost:8000/api/sessions/?page=1&page_size=20"
```

## 12. Filter Sessions by Status

```bash
curl "http://localhost:8000/api/sessions/?status=active"
```

## Using jq for Better Output

Install jq for formatted JSON output:
```bash
brew install jq  # macOS
```

Then pipe responses:
```bash
curl -s http://localhost:8000/api/sessions/{SESSION_ID} | jq '.'
```

## Sample Transcript Speakers

The sample transcript has these speakers:
- `SPEAKER_A` - Defense counsel (she might actually be a prosecutor -- can't tell)
- `SPEAKER_B` - Juror responses
- `SPEAKER_C` - Juror responses
- `SPEAKER_D` - Juror responses
- `SPEAKER_E` - Juror responses
- `SPEAKER_F` - Juror responses

## Complete Workflow Example

```bash
# 1. Create session
SESSION=$(curl -s -X POST http://localhost:8000/api/sessions/ \
  -H "Content-Type: application/json" \
  -d '{"case_number": "2024-TEST", "case_name": "Test", "court": "Test Court"}' \
  | jq -r '.id')

# 2. Create juror
JUROR=$(curl -s -X POST http://localhost:8000/api/jurors/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION\", \"seat_number\": 1, \"first_name\": \"Jane\", \"last_name\": \"Doe\"}" \
  | jq -r '.id')

# 3. Load transcript
python scripts/load_sample_transcript.py $SESSION

# 4. Map speaker
curl -X POST http://localhost:8000/api/jurors/$JUROR/speaker-mapping \
  -H "Content-Type: application/json" \
  -d '{"speaker_label": "SPEAKER_A"}'

# 5. Get juror with transcript
curl -s http://localhost:8000/api/jurors/$JUROR | jq '{name: "\(.first_name) \(.last_name)", segments: .transcript_segments | length}'
```

