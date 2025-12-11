# NesVentory

![NesVentory Logo](https://raw.githubusercontent.com/tokendad/NesVentory/main/Logo.png)

**A modern home inventory management application to track and organize your household items, locations, warranties, and maintenance schedules.**

[![GitHub](https://img.shields.io/badge/GitHub-tokendad%2FNesVentory-blue?logo=github)](https://github.com/tokendad/NesVentory)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/tokendad/NesVentory/blob/main/LICENSE)

## Quick Reference

- **Maintained by:** [tokendad](https://github.com/tokendad)
- **Source:** [GitHub Repository](https://github.com/tokendad/NesVentory)
- **Documentation:** [README](https://github.com/tokendad/NesVentory/blob/main/README.md) | [Installation Guide](https://github.com/tokendad/NesVentory/blob/main/INSTALL.txt)

## Supported Tags

- `latest` - Latest stable release
- `4.4.0`, `4.4` - Current version
- `4.x.x` - Specific version tags

## Recent Changes

**December 2025 - Simplified Docker Configuration:**
- The `APP_PORT` environment variable is now optional in docker-compose.yml examples
- Application defaults to port 8001 inside the container (no configuration needed)
- To run on a different host port, simply change the left side of the ports mapping (e.g., `"8080:8001"`)
- Advanced users can still override the internal container port by setting `APP_PORT` if needed
- This change reduces configuration complexity for typical Docker Compose users

## What is NesVentory?

NesVentory is a self-hosted home inventory management system built with:

- **Backend:** FastAPI (Python 3.11)
- **Frontend:** React + TypeScript + Vite
- **Database:** SQLite (embedded, file-based)

### Key Features

- 📦 **Inventory Management** - Track all household items with detailed information
- 📷 **AI Photo Detection** - Scan rooms with Google Gemini AI to detect and add items automatically
- 🤖 **AI Data Tag Parsing** - Extract product info from data tag photos
- 📍 **Location Hierarchy** - Organize items by properties, rooms, and sub-locations
- 📱 **QR Code Labels** - Print QR labels for locations and containers
- 🏘️ **Multi-Property Support** - Manage multiple homes and rental properties
- 👥 **Multi-user Support** - Role-based access control (Admin, Editor, Viewer)
- 🔑 **Google OAuth SSO** - Sign in with Google for easy authentication
- 🛠️ **Maintenance Tracking** - Schedule and track recurring maintenance tasks
- 🛡️ **Warranty Management** - Track manufacturer and extended warranties
- 🌐 **International Formats** - Support for 25+ locales and 20+ currencies

## Quick Start

### Using Docker Run

> ⚠️ **Security Note:** Replace the example `SECRET_KEY` and `JWT_SECRET_KEY` values below with cryptographically secure random strings. Generate them using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

```bash
# Create a directory for persistent data
mkdir -p /path/to/nesventory_data

# Run NesVentory
docker run -d \
  --name nesventory \
  -p 8001:8001 \
  -e SECRET_KEY=<generate-secure-key> \
  -e JWT_SECRET_KEY=<generate-secure-key> \
  -e TZ=America/New_York \
  -v /path/to/nesventory_data:/app/data \
  tokendad/nesventory:latest
```

### Using Docker Compose

Create a `docker-compose.yml` file:

> ⚠️ **Security Note:** Replace the example `SECRET_KEY` and `JWT_SECRET_KEY` values below with cryptographically secure random strings. Generate them using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

```yaml
services:
  nesventory:
    image: tokendad/nesventory:latest
    restart: unless-stopped
    environment:
      PUID: 1000
      PGID: 1000
      TZ: America/New_York
      SECRET_KEY: <generate-secure-key>
      JWT_SECRET_KEY: <generate-secure-key>
      # APP_PORT is optional - application defaults to port 8001
      # To change the host port, edit the ports mapping below instead
    volumes:
      - /path/to/nesventory_data:/app/data
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "8001:8001"  # Change host port (left side) to run on a different port
```

Then run:

```bash
docker compose up -d
```

Access the application at: **http://localhost:8001**

## Default Credentials

The application comes with pre-seeded test users:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@nesventory.local | admin123 |
| **Editor** | editor@nesventory.local | editor123 |
| **Viewer** | viewer@nesventory.local | viewer123 |

⚠️ **Important:** Change these credentials for production use!

## Environment Variables

### Required Security Settings

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Application secret key (generate a secure random string) |
| `JWT_SECRET_KEY` | JWT token signing key (generate a secure random string) |

Generate secure keys with:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Optional Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `8001` | Application port (optional). Change host port in docker-compose.yml ports mapping instead. |
| `PUID` | `1000` | User ID for file ownership |
| `PGID` | `1000` | Group ID for file ownership |
| `UMASK` | `002` | File permission mask |
| `TZ` | `Etc/UTC` | Timezone (e.g., `America/New_York`) |
| `DB_PATH` | `/app/data/nesventory.db` | SQLite database path |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT token expiration |

### AI Features (Optional)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI photo detection |
| `GEMINI_MODEL` | Gemini model (default: `gemini-2.0-flash`) |

### Google OAuth (Optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

## Volumes

| Path | Description |
|------|-------------|
| `/app/data` | **Required.** SQLite database and uploaded media files |

The `/app/data` volume contains:
- `nesventory.db` - SQLite database
- `media/photos/` - Uploaded item photos and documents

## Ports

| Port | Description |
|------|-------------|
| `8001` | Web UI and API (default port 8001). Change host port in docker-compose.yml ports mapping. |

## Health Check

```bash
curl http://localhost:8001/api/health
# Response: {"status":"healthy"}

curl http://localhost:8001/api/version
# Response: {"name":"NesVentory","version":"4.4.0"}
```

## User/Group Identifiers

To avoid permission issues with bind mounts, you can specify the user and group IDs:

```bash
# Find your user ID
id -u

# Find your group ID
id -g
```

Set `PUID` and `PGID` environment variables to match your host user.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/tokendad/NesVentory/blob/main/LICENSE) file for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/tokendad/NesVentory/issues)
- **Documentation:** [GitHub Repository](https://github.com/tokendad/NesVentory)
