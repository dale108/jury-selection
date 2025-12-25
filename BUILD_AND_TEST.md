# Building and Testing Voir-Dire Backend

Complete guide to build, run, and test the voir-dire microservices backend.

## Prerequisites

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Python 3.11+** (for local testing/development)
3. **OpenAI API Key** (for transcription service)
4. **Hugging Face Token** (optional, for pyannote diarization - not needed if using GPT-4o)

## Quick Start

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# Required: OPENAI_API_KEY
# Optional: HF_AUTH_TOKEN (only if using pyannote instead of GPT-4o)
```

### 2. Build and Start Services

```bash
# Build all Docker images
make build
# OR
docker compose build

# Start all services
make up
# OR
docker compose up -d

# Check service status
docker compose ps
```

### 3. Verify Services Are Running

```bash
# Check health endpoints
curl http://localhost:8000/health          # Gateway
curl http://localhost:8004/health         # Session Service
curl http://localhost:8003/health         # Juror Service
curl http://localhost:8001/health         # Audio Service
curl http://localhost:8002/health         # Transcription Service

# Or use the test script
python scripts/test_api.py
```

### 4. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| **API Gateway** | http://localhost:8000 | Main entry point |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **MinIO Console** | http://localhost:9001 | Audio storage (login: minioadmin/minioadmin) |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache/pub-sub |

## Testing

### Unit Tests (No Docker Required)

```bash
# Install test dependencies
make install-dev
# OR
pip install -r requirements-common.txt -r requirements-test.txt

# Run all unit tests
make test-unit
# OR
pytest tests/ -v

# Run with coverage
make test-cov
# OR
pytest tests/ -v --cov=services --cov=gateway --cov=shared --cov-report=html
```

### Integration Tests (Requires Services Running)

```bash
# Make sure services are running
docker compose up -d

# Run API integration tests
make test-api
# OR
python scripts/test_api.py
```

### Manual API Testing

#### 1. Create a Session

```bash
curl -X POST http://localhost:8000/api/sessions/ \
  -H "Content-Type: application/json" \
  -d '{
    "case_number": "2024-TEST-001",
    "case_name": "State v. Test Defendant",
    "court": "King County Superior Court",
    "metadata": {"judge": "Test Judge", "courtroom": "E-501"}
  }'
```

Save the `id` from the response.

#### 2. Create a Juror

```bash
# Replace SESSION_ID with the ID from step 1
curl -X POST http://localhost:8000/api/jurors/ \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "SESSION_ID",
    "seat_number": 1,
    "first_name": "Jane",
    "last_name": "Doe",
    "occupation": "Software Engineer",
    "neighborhood": "Capitol Hill"
  }'
```

#### 3. View API Documentation

Open http://localhost:8000/docs in your browser for interactive API testing.

## Development Workflow

### Running Services Locally (Without Docker)

For faster development iteration:

```bash
# Terminal 1: Start infrastructure
docker compose up postgres redis minio -d

# Terminal 2: Run session service
make dev-session

# Terminal 3: Run juror service
make dev-juror

# Terminal 4: Run audio service
make dev-audio

# Terminal 5: Run transcription service
make dev-transcription

# Terminal 6: Run gateway
make dev-gateway
```

### Database Migrations

```bash
# Run migrations
make migrate
# OR
docker compose exec session alembic upgrade head

# Create new migration (if needed)
docker compose exec session alembic revision --autogenerate -m "description"
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs session
docker compose logs transcription

# Restart a service
docker compose restart session
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000

# Or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U voirdire -d voirdire -c "SELECT 1;"
```

### MinIO Not Accessible

```bash
# Check MinIO logs
docker compose logs minio

# Access via console: http://localhost:9001
# Login: minioadmin / minioadmin
```

### Transcription Service Errors

```bash
# Check if OpenAI API key is set
docker compose exec transcription env | grep OPENAI

# Check transcription logs
docker compose logs transcription
```

## Clean Up

```bash
# Stop all services
make down
# OR
docker compose down

# Remove everything including volumes (deletes data!)
make clean
# OR
docker compose down -v --remove-orphans
```

## Production Deployment

For production, you'll want to:

1. **Use environment-specific configs** - Don't use `.env` in production
2. **Set up proper secrets management** - Use AWS Secrets Manager, HashiCorp Vault, etc.
3. **Use managed services** - Replace MinIO with S3, use managed PostgreSQL/Redis
4. **Add monitoring** - Prometheus, Grafana, or similar
5. **Set up CI/CD** - GitHub Actions, GitLab CI, etc.
6. **Use Kubernetes** - For orchestration instead of Docker Compose

## Next Steps

- [ ] Set up frontend to connect to the API
- [ ] Add authentication/authorization
- [ ] Set up monitoring and logging
- [ ] Configure production database backups
- [ ] Add rate limiting
- [ ] Set up SSL/TLS certificates

