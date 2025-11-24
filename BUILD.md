# NesVentory v2.0 Build Guide

## Overview

Version 2.0 introduces a unified container architecture that combines the frontend, backend, and database into a single Docker container. This simplifies deployment and reduces resource usage.

## Prerequisites

- Docker (version 20.10 or higher)
- Node.js 20+ and npm (for building the frontend)
- Git

## Quick Start

### 1. Build the Frontend

```bash
npm install
npm run build
```

This creates a `dist/` directory with the compiled frontend.

### 2. Build the Docker Image

```bash
docker build -t nesventory:2.0 .
```

### 3. Run the Container

```bash
docker run -d \
  --name nesventory \
  -p 8001:8001 \
  -e DB_PASSWORD=your-secure-password \
  -e SECRET_KEY=your-secret-key \
  -e JWT_SECRET_KEY=your-jwt-secret \
  -v nesventory-data:/var/lib/postgresql/data \
  nesventory:2.0
```

### 4. Access the Application

Open your browser to: http://localhost:8001

## Using Docker Compose

Create or use the provided `.env` file:

```bash
cp .env.example .env
# Edit .env and set secure passwords
```

Then:

```bash
# Build frontend first
npm install && npm run build

# Start with docker-compose
docker compose up -d
```

## Architecture Details

The v2.0 unified container contains:

- **PostgreSQL Database**: Embedded in the same container, listens on localhost
- **FastAPI Backend**: Python 3.11 application
- **Frontend**: Pre-built React application served as static files by FastAPI
- **Supervisor**: Process manager running both PostgreSQL and uvicorn

### Ports

- **8001**: Single port for both frontend UI and API endpoints

### Data Persistence

- Database data: `/var/lib/postgresql/data` (mount as volume)
- Uploads: `/app/uploads` (optional volume mount)

## Differences from v1.x

| Feature | v1.x | v2.0 |
|---------|------|------|
| Containers | 3 separate (db, backend, frontend) | 1 unified container |
| Ports | 5432 (db), 8001 (backend), 5173 (frontend) | 8001 (all-in-one) |
| Frontend serving | Separate Vite dev server | Built and served by FastAPI |
| Database | Separate postgres:16 container | Embedded PostgreSQL |
| Networking | Docker network between containers | Localhost within container |
| Build process | Backend-only in Docker | Frontend must be pre-built |

## Troubleshooting

### Frontend not showing

Make sure you ran `npm run build` before `docker build`.

### Database initialization fails

Check that you've set the `DB_PASSWORD` environment variable.

### Cannot connect to database

The database is on localhost inside the container. External connections are not needed.

## Development vs Production

**Development**: For development, continue using the v1.x approach with separate containers so you can use hot-reload for both frontend and backend.

**Production**: Use v2.0 for production deployments where you want a simple, unified container.

## Migration from v1.x

1. Export your data from v1.x database
2. Build v2.0 image as described above
3. Start v2.0 container
4. Import your data into the new container's database

## Support

For issues and questions:
- GitHub Issues: https://github.com/tokendad/NesVentory/issues
- Full documentation: See INSTALL.txt and README.md
