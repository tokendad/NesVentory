#!/bin/bash
# Docker entrypoint script for NesVentory
# Ensures proper directory permissions before starting the application

set -e

# Get PUID and PGID from environment (defaults provided in Dockerfile)
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Ensure data directory exists and has correct ownership
# This is critical for bind mounts where Docker creates directories as root
if [ -d "/app/data" ]; then
    # Fix ownership of the data directory if we have permission
    chown -R "${PUID}:${PGID}" /app/data 2>/dev/null || true
fi

# Ensure uploads directory exists and has correct ownership
if [ -d "/app/uploads" ]; then
    chown -R "${PUID}:${PGID}" /app/uploads 2>/dev/null || true
fi

# Switch to the nesventory user and run the application
exec gosu nesventory uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT:-8001}"
