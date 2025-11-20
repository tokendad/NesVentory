# Nesventory Starter Stack

This is a starter stack for a home inventory app:

- FastAPI backend (`/backend`)
- React + TypeScript + Vite frontend (`/src`)
- Postgres database
- Docker Compose orchestration

## Quick start

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Build and start the backend and database:

```bash
docker compose up --build
```

3. In a separate terminal, start the frontend development server:

```bash
npm install
npm run dev
```

4. Open:

- Backend health: http://localhost:8001/api/health
- Frontend UI: http://localhost:5173
