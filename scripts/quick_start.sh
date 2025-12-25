#!/bin/bash
# Quick start script for voir-dire backend

set -e

echo "🚀 Voir-Dire Backend Quick Start"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your OPENAI_API_KEY"
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "🔨 Building Docker images..."
docker compose build

echo ""
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "🔍 Checking service health..."

# Check each service
services=(
    "http://localhost:8000/health:Gateway"
    "http://localhost:8004/health:Session"
    "http://localhost:8003/health:Juror"
    "http://localhost:8001/health:Audio"
    "http://localhost:8002/health:Transcription"
)

for service in "${services[@]}"; do
    url="${service%%:*}"
    name="${service##*:}"
    
    if curl -s -f "$url" > /dev/null; then
        echo "  ✅ $name service is healthy"
    else
        echo "  ❌ $name service is not responding"
    fi
done

echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "  - API Docs: http://localhost:8000/docs"
echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "  - Run tests: make test-api"
echo "  - View logs: docker compose logs -f"
echo ""

