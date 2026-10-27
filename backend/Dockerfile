FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
# - build-essential / libpq-dev / curl: build toolchain & PostgreSQL client headers
# - libreoffice: Office document conversion (docx/pptx/xlsx -> pdf)
# - poppler-utils: PDF utilities (pdftotext, pdftoppm) used by parsers
# - tesseract-ocr + tesseract-ocr-chi-sim: OCR engine with Simplified Chinese language pack
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libpq-dev \
        libreoffice \
        poppler-utils \
        tesseract-ocr \
        tesseract-ocr-chi-sim \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (separate layer to leverage Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Default command: run the API server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
