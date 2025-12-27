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

### Option 1: Full Demo with Test Data

The fastest way to see the app in action:

```bash
# 1. Start all backend services
docker-compose up -d

# 2. Run the test script (creates session, jurors, loads sample transcript)
./scripts/test_workflow.sh

# 3. Open the frontend in your browser
#    The script will print the URL with session ID, e.g.:
#    http://localhost:5174/?session=<session-id>
```

The test script will:
- Clean up any existing test data
- Create a new voir dire session
- Create 5 jurors
- Load a sample transcript with multiple speakers
- Map speakers to jurors and defense counsel
- Launch the frontend with the session pre-loaded

### Option 2: Manual Setup

1. Copy the environment file and configure your API keys:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY and HF_AUTH_TOKEN
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Access the services:
   - Frontend: http://localhost:5174
   - Gateway API: http://localhost:8000
   - Gateway Docs: http://localhost:8000/docs
   - MinIO Console: http://localhost:9001

### Mock Mode (No API Keys Required)

For development without OpenAI API costs, the transcription service can use a sample transcript:

```bash
# Set mock mode in docker-compose.yml or .env:
USE_SAMPLE_TRANSCRIPT=true
```

This uses `resources/sample_transcript.txt` instead of calling the OpenAI API.

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

## Frontend Features

The React frontend provides a professional interface for criminal defense attorneys:

- **Courtroom Layout**: Visual representation of judge, counsel, and jury seating
- **Juror Management**: Click jurors to view/edit notes, tags, and transcript segments
- **Quick Assessment**: Mark jurors as favorable/unfavorable/flagged with one click
- **Challenge Tracker**: Track peremptory strikes and for-cause challenges
- **Live Transcription**: Real-time audio recording with live transcript display
- **Transcript Panel**: Searchable transcript with timestamp filtering and speaker mapping
- **Speaker Mapping**: Associate transcript speakers with specific jurors or counsel
- **Quick Notes**: Timestamped notes during proceedings with pause/resume
- **Export Reports**: Export juror notes, transcript, or full report as text files
- **Juror Tags**: Predefined and custom tags for categorizing jurors

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15
- **Cache/PubSub**: Redis 7
- **Object Storage**: MinIO (S3-compatible)
- **Transcription**: OpenAI Whisper API / GPT-4o Transcribe
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Styling**: Custom CSS with design system

## License

Open source - designed for Washington State public defense.

