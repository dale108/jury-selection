# Voir-Dire Backend

A microservices backend for managing voir dire proceedings in Washington State public defense. Features real-time audio transcription with speaker diarization, juror profile management, and transcript attribution.

## Architecture

The system consists of the following microservices:

- **Gateway Service** (Port 8000): Central API entry point with routing and CORS
- **Audio Service** (Port 8001): WebSocket audio streaming and storage
- **Transcription Service** (Port 8002): Real-time transcription with speaker diarization
- **Juror Service** (Port 8003): Juror profile CRUD and speaker mapping
- **Session Service** (Port 8004): Voir dire session management

## Prerequisites

- Docker and Docker Compose
- OpenAI API key (for Whisper transcription)
- Hugging Face token (for pyannote-audio speaker diarization)

## Quick Start

1. Copy the environment file and configure your API keys:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY and HF_AUTH_TOKEN
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the services:
   - Gateway API: http://localhost:8000
   - Gateway Docs: http://localhost:8000/docs
   - MinIO Console: http://localhost:9001

## API Endpoints

### Sessions
- `POST /api/sessions/` - Create new voir dire session
- `GET /api/sessions/{id}` - Get session details with jurors
- `PATCH /api/sessions/{id}/status` - Update session status
- `GET /api/sessions/` - List all sessions

### Jurors
- `POST /api/jurors/` - Create juror profile
- `GET /api/jurors/{id}` - Get juror with transcript
- `GET /api/jurors/?session_id=` - List jurors for session
- `PUT /api/jurors/{id}` - Update juror profile
- `POST /api/jurors/{id}/speaker-mapping` - Map speaker to juror

### Audio
- `WS /api/audio/stream/{session_id}` - Stream audio for recording
- `GET /api/audio/recordings/{session_id}` - List recordings

### Transcripts
- `GET /api/transcripts/?session_id=` - Get session transcripts
- `GET /api/transcripts/?juror_id=` - Get juror transcripts
- `WS /api/transcripts/live/{session_id}` - Real-time transcript stream

## Development

### Running Individual Services

```bash
# Start only infrastructure
docker-compose up postgres redis minio -d

# Run a service locally
cd services/session
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

### Database Migrations

```bash
# Generate a new migration
cd services/session
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Technology Stack

- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15
- **Cache/PubSub**: Redis 7
- **Object Storage**: MinIO (S3-compatible)
- **Transcription**: OpenAI Whisper API
- **Speaker Diarization**: pyannote-audio
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2

## License

Open source - designed for Washington State public defense.

