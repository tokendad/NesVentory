# Dockerfile for NesVentory v2.0
# Unified container with frontend, backend, and SQLite database

# Stage 1: Build the frontend
FROM node:25-slim AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies needed for build)
# Note: strict-ssl is disabled for compatibility with CI/CD environments
# that may have self-signed certificates. In production environments,
# consider removing this line and ensuring proper SSL certificates.
RUN npm config set strict-ssl false && npm install

# Copy frontend source code
COPY src ./src
COPY index.html tsconfig.json vite.config.ts ./

# Build the frontend
RUN npm run build

# Stage 2: Build the backend runtime
FROM python:3.11-slim

# Environment variables
ARG PUID=1000
ARG PGID=1000
ENV PUID=${PUID} \
    PGID=${PGID} \
    UMASK=002 \
    TZ=Etc/UTC \
    APP_PORT=8001 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install only essential runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create nesventory user
RUN groupadd -o -g ${PGID} nesventory 2>/dev/null || true && \
    useradd -o -u ${PUID} -g ${PGID} -s /bin/bash -m nesventory 2>/dev/null || true

# Install Python backend dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r /tmp/requirements.txt

# Copy backend application
COPY --chown=nesventory:nesventory backend/app /app/app
COPY --chown=nesventory:nesventory backend/models.py backend/schemas.py backend/db.py /app/
COPY --chown=nesventory:nesventory VERSION /app/VERSION

# Copy pre-built frontend from the builder stage
COPY --from=frontend-builder --chown=nesventory:nesventory /frontend/dist /app/static

# Create necessary directories
RUN mkdir -p /app/uploads/photos /app/data && \
    chown -R nesventory:nesventory /app/uploads /app/data

# Switch to nesventory user
USER nesventory

# Expose default port (actual port is determined by APP_PORT environment variable at runtime)
EXPOSE 8001

# Start the application using shell form to expand environment variable
# APP_PORT is validated by docker-compose to be a valid port number
CMD uvicorn app.main:app --host 0.0.0.0 --port ${APP_PORT:-8001}
