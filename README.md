# Nesventory Starter Stack

**Version: 1.0.0-alpha**

This is a starter stack for a home inventory app:

- FastAPI backend (`/backend`)
- React + TypeScript + Vite frontend (`/src`)
- Postgres database
- Docker Compose orchestration
- **Pre-populated test data** (users, locations, items, maintenance tasks)

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

## Test Data

The application automatically seeds the database with test data on first startup, including:
- 3 test users (admin, editor, viewer)
- 9 locations (hierarchical structure)
- 8 sample items (electronics, appliances, tools, etc.)
- 4 maintenance tasks

See [SEEDING.md](SEEDING.md) for complete documentation on the test data and how to use it.

### Test Credentials

- **Admin**: admin@nesventory.local / admin123
- **Editor**: editor@nesventory.local / editor123
- **Viewer**: viewer@nesventory.local / viewer123
