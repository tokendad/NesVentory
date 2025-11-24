# Multi-stage Dockerfile for NesVentory v2.0
# Merges frontend, backend, and database into a single container

# ============================================================================
# Stage 1: Build Frontend
# ============================================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY index.html ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src

# Build frontend for production
RUN npm run build

# ============================================================================
# Stage 2: Build Backend Dependencies
# ============================================================================
FROM python:3.11-slim AS backend-builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python packages
RUN pip install --user -r requirements.txt

# ============================================================================
# Stage 3: Final Runtime Image
# ============================================================================
FROM python:3.11-slim

# Environment variables for user/group configuration
ARG PUID=1000
ARG PGID=1000
ENV PUID=${PUID} \
    PGID=${PGID} \
    UMASK=002 \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POSTGRES_VERSION=16

WORKDIR /app

# Install runtime dependencies including PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    postgresql-${POSTGRES_VERSION} \
    postgresql-client-${POSTGRES_VERSION} \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Create user and group with specified IDs
RUN groupadd -o -g ${PGID} nesventory 2>/dev/null || true && \
    useradd -o -u ${PUID} -g ${PGID} -s /bin/bash -m nesventory 2>/dev/null || true

# Copy Python packages to nesventory user's local directory
COPY --from=backend-builder /root/.local /home/nesventory/.local
RUN chown -R nesventory:nesventory /home/nesventory/.local
ENV PATH=/home/nesventory/.local/bin:$PATH

# Copy backend application files
COPY --chown=nesventory:nesventory backend/app /app/app
COPY --chown=nesventory:nesventory backend/models.py /app/
COPY --chown=nesventory:nesventory backend/schemas.py /app/
COPY --chown=nesventory:nesventory backend/db.py /app/

# Copy VERSION file for version detection
COPY --chown=nesventory:nesventory VERSION /app/VERSION

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder --chown=nesventory:nesventory /frontend/dist /app/static

# Create necessary directories
RUN mkdir -p /app/uploads/photos && \
    mkdir -p /var/lib/postgresql/data && \
    mkdir -p /var/run/postgresql && \
    mkdir -p /var/log/supervisor && \
    chown -R nesventory:nesventory /app/uploads && \
    chown -R postgres:postgres /var/lib/postgresql && \
    chown -R postgres:postgres /var/run/postgresql && \
    chmod 755 /var/run/postgresql

# Copy supervisor configuration
COPY --chown=root:root supervisor.conf /etc/supervisor/conf.d/nesventory.conf

# Copy startup script
COPY --chown=nesventory:nesventory docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose port for the unified application
EXPOSE 8001

# Use supervisor to run both PostgreSQL and the application
CMD ["/app/docker-entrypoint.sh"]
