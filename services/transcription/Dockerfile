FROM python:3.11-slim

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements-common.txt /app/
COPY services/transcription/requirements.txt /app/services/transcription/
RUN pip install --no-cache-dir -r requirements-common.txt -r services/transcription/requirements.txt

# Copy shared code
COPY shared /app/shared

# Copy resources (for sample transcript)
COPY resources /app/resources

# Copy service code
COPY services/transcription/app /app/app

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]

