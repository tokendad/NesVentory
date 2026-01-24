# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NesVentory is a home inventory management application with a FastAPI backend serving a React frontend from a unified Docker container. The app tracks household items, locations, warranties, maintenance schedules, and supports AI-powered features for item detection and enrichment.

## Development Commands

### Frontend (React + Vite)
```bash
npm install              # Install frontend dependencies
npm run dev              # Start dev server on port 5173
npm run build            # Build frontend to /dist
```

### Backend (FastAPI + Python)
```bash
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --reload  # Start backend with hot reload
```

### Docker
```bash
docker compose up -d     # Start unified container
docker compose build     # Rebuild container
```

The app runs on port 8181 by default (configurable via APP_PORT env var).

## Architecture

### Backend Structure (`backend/app/`)
- **main.py**: FastAPI app setup, router registration, database initialization, migrations
- **models.py**: SQLAlchemy models (User, Item, Location, Photo, MaintenanceTask, Tag, Plugin, etc.)
- **schemas.py**: Pydantic schemas for API request/response validation
- **crud.py**: Database CRUD operations
- **routers/**: API endpoint modules organized by domain:
  - `items.py`, `locations.py`, `photos.py`, `documents.py`, `videos.py`
  - `auth.py`, `users.py`, `oidc.py` (authentication)
  - `ai.py`, `plugins.py` (AI features)
  - `printer.py` (NIIMBOT label printing)
  - `maintenance.py`, `encircle.py`, `csv_import.py`
- **niimbot/**: NIIMBOT thermal printer protocol implementation
- **services**: `plugin_service.py`, `ai_provider_service.py`, `upc_service.py`, `printer_service.py`, `settings_service.py`

### Frontend Structure (`src/`)
- **App.tsx**: Main app with routing and auth context
- **lib/api.ts**: All API client functions with TypeScript interfaces
- **components/**: React components:
  - `InventoryPage.tsx`, `ItemDetails.tsx`, `ItemForm.tsx`, `ItemsTable.tsx`
  - `LocationsTree.tsx`, `LocationDetailsModal.tsx`
  - `AdminPage.tsx`, `UserSettings.tsx`
  - `AIDetection.tsx`, `EnrichmentModal.tsx`
  - `Calendar.tsx`, `MaintenanceTab.tsx`
  - `QRLabelPrint.tsx`, `MediaManagement.tsx`, `InsuranceTab.tsx`

### Database
- SQLite by default (file-based at `/app/data/nesventory.db`)
- PostgreSQL compatible (models use cross-database UUID type)
- Auto-migrations in `main.py:run_migrations()` for schema evolution
- Auto-seeding with test data in `seed_data.py`

### Authentication
- JWT-based auth with Bearer tokens
- Local password auth, Google OAuth, and OIDC (Authelia, Keycloak)
- Role-based access: Admin, Editor, Viewer
- Location-based access control (users can be restricted to specific properties)

## Key Patterns

### API Endpoints
All backend routes are prefixed with `/api/` except:
- `/token` - Root-level OAuth2 token endpoint for mobile compatibility
- `/{path}` - Catch-all serving React SPA

### Frontend API Calls
Use functions from `src/lib/api.ts` which handle:
- Token attachment via `authHeaders()`
- Response parsing and error handling
- 401 unauthorized event dispatch for auth flow

### Database Migrations
New columns are added via `run_migrations()` in `main.py` using ALTER TABLE with whitelisted table/column names for security.

### Media Storage
Files stored at `/app/data/media/` with subdirectories:
- `photos/`, `documents/`, `videos/`, `location_photos/`

## NIIMBOT Printer Integration

D11-H printer (V5 protocol) working via both Server and USB Direct modes.

### Server Printer (Network)
Printer connected to Docker host, backend handles printing:
- `backend/app/niimbot/printer.py` - V5 protocol uses `_send` (fire-and-forget), not `_transceive`
- `backend/app/printer_service.py` - Label: 136x472, QR: 124x124, Font: 32px
- `backend/app/routers/printer.py` - QR with `ERROR_CORRECT_H`, `border=0`
- Frontend should NOT pass label dimensions (backend uses model defaults)

### USB Direct (Desktop/Laptop)
Printer connected to local machine, browser handles printing via Web Serial:
- `src/lib/niimbot.ts` - Frontend NIIMBOT protocol implementation
- `src/components/QRLabelPrint.tsx` - Direct print with +90° CW rotation
- Label size 12x40mm: 472x136 (landscape) → 136x472 after rotation
- QR: 124x124, Font: bold 32px Arial, matching server layout

## Directories to Ignore

These directories are reference materials, not part of the project:
- `niimblue/`, `niimbluelib/`, `niimblue-node/` - External NIIMBOT protocol references

## Environment Variables

Key configuration (see docker-compose.yml):
- `SECRET_KEY`, `JWT_SECRET_KEY` - Auth secrets
- `GEMINI_API_KEY`, `GEMINI_MODEL` - AI features
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `DISABLE_SIGNUPS` - Prevent new user registration
- `APP_PORT` - Server port (default 8181)

## Commit Convention

Use conventional commits: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
```bash
git commit -m "feat(component): add new feature"
```
