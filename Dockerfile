# Dockerfile for NesVentory v2.0
# Unified container with frontend, backend, and embedded PostgreSQL database

# NOTE: Build the frontend before building this image:
#   npm install && npm run build

FROM python:3.11-slim

# Environment variables
ARG PUID=1000
ARG PGID=1000
ENV PUID=${PUID} \
    PGID=${PGID} \
    UMASK=002 \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install PostgreSQL (default version), supervisor, and build dependencies from Debian repos
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    supervisor \
    tzdata \
    gcc \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create nesventory user
RUN groupadd -o -g ${PGID} nesventory 2>/dev/null || true && \
    useradd -o -u ${PUID} -g ${PGID} -s /bin/bash -m nesventory 2>/dev/null || true

# Install Python backend dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend application
COPY --chown=nesventory:nesventory backend/app /app/app
COPY --chown=nesventory:nesventory backend/models.py backend/schemas.py backend/db.py /app/
COPY --chown=nesventory:nesventory VERSION /app/VERSION

# Copy pre-built frontend
COPY --chown=nesventory:nesventory dist /app/static

# Create necessary directories
RUN mkdir -p /app/uploads/photos && chown -R nesventory:nesventory /app/uploads

# Copy supervisor and entrypoint
COPY --chown=root:root supervisor.conf /etc/supervisor/conf.d/nesventory.conf
COPY --chown=root:root docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 8001

# Start via custom entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]
