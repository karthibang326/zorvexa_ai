# ai-ops-engine Dockerfile
FROM python:3.11-slim

# System dependencies for FAISS, Kafka, etc.
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libopenblas-dev \
    libomp-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
