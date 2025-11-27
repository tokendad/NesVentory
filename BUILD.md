# NesVentory v2.0 Build Guide

## Overview

Version 2.0 introduces a **unified container architecture** with **embedded SQLite database**. This dramatically simplifies deployment by combining the frontend, backend, and database into a single, lightweight Docker container.

## Key Benefits of v2.0

✅ **Single Container**: Everything in one package  
✅ **No Database Setup**: SQLite embedded, no PostgreSQL needed  
✅ **Faster Builds**: ~60% smaller image, much faster build times  
✅ **Simple Configuration**: Only 2 required environment variables  
✅ **File-Based Database**: Easy backup (just copy one file)  
✅ **Cross-Platform**: Works identically everywhere  
✅ **Zero Dependencies**: No supervisor, no separate processes

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher, if using docker-compose)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tokendad/NesVentory.git
cd NesVentory
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set secure secret keys
```

### 3. Build and Run with Docker Compose

```bash
docker compose up -d
```

The frontend will be built automatically as part of the Docker build process.

### 4. Access the Application

Open your browser to: http://localhost:8001

## Manual Docker Build (Alternative)

If you prefer to use Docker CLI instead of Docker Compose:

### 1. Build the Docker Image

```bash
docker build -t nesventory:2.0 .
```

The frontend will be built automatically during the Docker build process using a multi-stage build.

### 2. Run the Container

```bash
docker run -d \
  --name nesventory \
  -p 8001:8001 \
  -e SECRET_KEY=your-secret-key \
  -e JWT_SECRET_KEY=your-jwt-secret \
  -v nesventory-data:/app/data \
  nesventory:2.0
```

**Note**: Only 2 environment variables required! No database password needed.

### 3. Access the Application

Open your browser to: http://localhost:8001

## Using Docker Compose (Recommended)

Create or use the provided `.env` file:

```bash
cp .env.example .env
# Edit .env and set secure passwords
```

Then simply run:

```bash
docker compose up -d
```

**Note**: The frontend is now built automatically as part of the Docker build process. You no longer need to manually run `npm install` and `npm run build`.

## Architecture Details

The v2.0 unified container contains:

- **SQLite Database**: Embedded file-based database at `/app/data/nesventory.db`
- **FastAPI Backend**: Python 3.11 application
- **Frontend**: Pre-built React application served as static files by FastAPI
- **Single Process**: Just uvicorn, no process manager needed

### Ports

- **8001**: Single port for both frontend UI and API endpoints

### Data Persistence

- Database file: `/app/data/nesventory.db`
- Media uploads: `/app/data/media/` (photos subdirectory)
- Mount `/app/data` as a volume to persist both database and media files

## Differences from v1.x

| Feature | v1.x | v2.0 |
|---------|------|------|
| Containers | 3 separate (db, backend, frontend) | 1 unified container |
| Database | Separate PostgreSQL container | Embedded SQLite file |
| Ports | 5432 (db), 8001 (backend), 5173 (frontend) | 8001 (all-in-one) |
| Frontend serving | Separate Vite dev server | Built and served by FastAPI |
| Processes | 3 processes across containers | 1 process (uvicorn) |
| Networking | Docker network between containers | Not needed |
| Build time | ~5-10 minutes | ~2 minutes |
| Image size | ~2 GB combined | ~800 MB |
| Required env vars | 5+ (DB creds, secrets) | 2 (just secrets) |
| Build process | Backend-only in Docker | Frontend built automatically in Docker (multi-stage build) |

## Troubleshooting

### Frontend build errors during Docker build

If you encounter errors during the frontend build stage, this may be due to network or certificate issues. The Dockerfile includes `npm config set strict-ssl false` to handle common certificate issues in CI/CD environments.

### Frontend not showing

The frontend is now built automatically as part of the Docker build process. If you don't see the frontend, check the Docker build logs for any errors during the Node.js build stage.

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
