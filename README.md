# Nesventory Starter Stack

This is a starter stack for a home inventory app:

- FastAPI backend (`/backend`)
- React + Vite frontend (`/frontend`)
- Postgres database
- Docker Compose orchestration

## Quick start

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Build and start:

```bash
docker compose up --build
```

3. Open:

- Backend health: http://localhost:8001/api/health
- Frontend UI: http://localhost:5173
