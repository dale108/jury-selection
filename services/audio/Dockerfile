FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-common.txt /app/
COPY services/audio/requirements.txt /app/services/audio/
RUN pip install --no-cache-dir -r requirements-common.txt -r services/audio/requirements.txt

# Copy shared code
COPY shared /app/shared

# Copy service code
COPY services/audio/app /app/app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

