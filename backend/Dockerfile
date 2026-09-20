# ──────────────────────────────────────────────
# StudyGPT Backend — Dockerfile
# Python 3.12-slim for fast, lean image
# ──────────────────────────────────────────────

FROM python:3.12-slim

# Metadata
LABEL maintainer="StudyGPT Team"
LABEL description="StudyGPT FastAPI Backend"

# Set working directory
WORKDIR /app

# System deps (for PyPDF and other libraries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (leverages Docker cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

# Create data directory for JSON persistence
RUN mkdir -p /app/data

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Launch FastAPI with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
