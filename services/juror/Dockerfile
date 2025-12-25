FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-common.txt /app/
COPY services/juror/requirements.txt /app/services/juror/
RUN pip install --no-cache-dir -r requirements-common.txt -r services/juror/requirements.txt

# Copy shared code
COPY shared /app/shared

# Copy service code
COPY services/juror/app /app/app

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]

