# Multi-stage Dockerfile for Binance Real-Time GUI
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ .

# Build frontend
RUN npm run build

# Stage 2: Python application
FROM python:3.11-slim AS production

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create static directory and copy frontend build
RUN mkdir -p static
COPY --from=frontend-build /frontend/dist/ ./static/

# Expose port
EXPOSE 8753

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8753/api/health')" || exit 1

# Run the application
CMD ["python", "main.py"]
