FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-common.txt /app/
COPY services/session/requirements.txt /app/services/session/
RUN pip install --no-cache-dir -r requirements-common.txt -r services/session/requirements.txt

# Copy shared code
COPY shared /app/shared

# Copy service code
COPY services/session/app /app/app

EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]

