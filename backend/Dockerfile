# syntax=docker/dockerfile:1
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
RUN pip install --no-cache-dir --user email-validator

# Final Runtime Image
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/root/.local/bin:$PATH

# Copy installed Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application source code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Launch uvicorn server with background tasks
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
