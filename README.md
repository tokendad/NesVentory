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
- Backend version: http://localhost:8001/api/version
- Frontend UI: http://localhost:5173

## API Endpoints

- `/api/health` - Health check endpoint
- `/api/version` - Get application version and name
- `/api/auth/*` - Authentication endpoints
- `/api/items/*` - Inventory item management
- `/api/locations/*` - Location management

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

## Troubleshooting

### Database Schema Errors

If you encounter errors like `foreign key constraint cannot be implemented` or type mismatch errors (e.g., `uuid and integer`), this means the database volume contains an old schema that is incompatible with the current code.

**Solution**: Reset the database by removing the Docker volume:

```bash
# Stop the containers
docker compose down

# Remove the database volume
docker volume rm nesventory_nesventory_db_data

# Restart with a fresh database
docker compose up --build
```

**Note**: This will delete all data in the database. The application will automatically recreate the tables with the correct schema and re-seed with test data on startup.
