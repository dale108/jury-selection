FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-common.txt /app/
COPY gateway/requirements.txt /app/gateway/
RUN pip install --no-cache-dir -r requirements-common.txt -r gateway/requirements.txt

# Copy shared code
COPY shared /app/shared

# Copy gateway code
COPY gateway/app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

