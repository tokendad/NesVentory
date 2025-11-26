#!/bin/bash
# Docker entrypoint script for NesVentory
# Ensures proper directory permissions before starting the application

set -e

# Get PUID and PGID from environment (defaults provided in Dockerfile)
# These values are used to create the 'nesventory' user in the Dockerfile
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Ensure data directory exists and has correct ownership
# This is critical for bind mounts where Docker creates directories as root
if [ -d "/app/data" ]; then
    # Fix ownership of the data directory using PUID/PGID
    # These match the nesventory user created in Dockerfile
    chown -R "${PUID}:${PGID}" /app/data 2>/dev/null || true
fi

# Ensure uploads directory exists and has correct ownership
if [ -d "/app/uploads" ]; then
    chown -R "${PUID}:${PGID}" /app/uploads 2>/dev/null || true
fi

# Default command if none provided
if [ $# -eq 0 ]; then
    set -- uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT:-8001}"
fi

# Switch to the nesventory user (created with PUID/PGID) and run the command
exec gosu nesventory "$@"
