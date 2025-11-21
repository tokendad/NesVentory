# Nesventory Starter Stack

**Version: 1.1.0-alpha**

This is a starter stack for a home inventory app:

- FastAPI backend (`/backend`)
- React + TypeScript + Vite frontend (`/src`)
- Postgres database
- Docker Compose orchestration
- **Pre-populated test data** (users, locations, items, maintenance tasks)

## Quick start

1. Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

2. **IMPORTANT:** Edit `.env` and set secure values for:
   - `SECRET_KEY` - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - `JWT_SECRET_KEY` - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - `DB_PASSWORD` - Use a strong, unique password

3. Build and start the backend and database:

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

## Security Best Practices

### Environment Variables
- **Never commit `.env` to version control** - it contains sensitive credentials
- Always use strong, unique secrets for `SECRET_KEY`, `JWT_SECRET_KEY`, and `DB_PASSWORD`
- Generate secure random secrets using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- For production, use environment-specific values and rotate secrets regularly

### Production Deployment
- Change all default passwords and secret keys
- Use HTTPS for all communication
- Set appropriate `CORS_ORIGINS` for your frontend domain(s)
- Consider disabling the automatic database seeding (see `backend/app/main.py`)
- Use a dedicated database user with minimal required privileges
- Keep dependencies up to date and monitor for security vulnerabilities

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
