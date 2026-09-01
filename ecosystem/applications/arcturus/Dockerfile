# Arcturus Simulation Engine — Production Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and project files
COPY pyproject.toml .
RUN pip install --no-cache-dir fastapi uvicorn pydantic pydantic-settings httpx google-generativeai websockets python-dotenv

COPY . /app/

ENV PYTHONPATH=/app
ENV ARCTURUS_DEBUG=false

EXPOSE 8000

CMD ["uvicorn", "ecosystem.applications.arcturus.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
