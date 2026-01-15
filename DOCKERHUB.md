# NesVentory

![NesVentory Logo](https://raw.githubusercontent.com/tokendad/NesVentory/main/Logo.png)

**A modern home inventory management application to track and organize your household items, locations, warranties, and maintenance schedules.**

[![GitHub](https://img.shields.io/badge/GitHub-tokendad%2FNesVentory-blue?logo=github)](https://github.com/tokendad/NesVentory)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/tokendad/NesVentory/blob/main/LICENSE)

## Quick Reference

- **Maintained by:** [tokendad](https://github.com/tokendad)
- **Source:** [GitHub Repository](https://github.com/tokendad/NesVentory)
- **Documentation:** [README](https://github.com/tokendad/NesVentory/blob/main/README.md) | [Docker Variables](https://github.com/tokendad/NesVentory/blob/main/docs/DOCKER_COMPOSE_VARIABLES.md)

## Supported Tags

- `latest` - Latest stable release (6.5.1)
- `6.x.x` - Version 6 series tags
- `5.x.x` - Version 5 series tags (legacy)

## What is NesVentory?

NesVentory is a self-hosted home inventory management system built with:

- **Backend:** FastAPI (Python 3.14)
- **Frontend:** React + TypeScript + Vite
- **Database:** SQLite (embedded, file-based)

### Key Features

- **Inventory Management** - Track all household items with detailed information
- **AI Photo Detection** - Scan rooms with Google Gemini AI to detect and add items automatically
- **AI Data Tag Parsing** - Extract product info from data tag photos
- **Location Hierarchy** - Organize items by properties, rooms, and sub-locations
- **QR Code Labels** - Print QR labels for locations and containers (NIIMBOT D11-H supported)
- **Multi-Property Support** - Manage multiple homes and rental properties
- **Multi-user Support** - Role-based access control (Admin, Editor, Viewer)
- **Google OAuth & OIDC SSO** - Sign in with Google, Authelia, Keycloak, and more
- **Maintenance Tracking** - Schedule and track recurring maintenance tasks
- **Warranty Management** - Track manufacturer and extended warranties
- **International Formats** - Support for 25+ locales and 20+ currencies

## Quick Start

### Using Docker Run

> **Security Note:** Replace the example `SECRET_KEY` and `JWT_SECRET_KEY` values below with cryptographically secure random strings. Generate them using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

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
  neuman1812/nesventory:latest
```

### Using Docker Compose

Create a `docker-compose.yml` file:

> **Security Note:** Replace the example `SECRET_KEY` and `JWT_SECRET_KEY` values below with cryptographically secure random strings. Generate them using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

```yaml
services:
  nesventory:
    image: neuman1812/nesventory:latest
    container_name: nesventory
    restart: unless-stopped
    environment:
      PUID: 1000
      PGID: 1000
      TZ: America/New_York
      SECRET_KEY: <generate-secure-key>
      JWT_SECRET_KEY: <generate-secure-key>
      APP_PORT: 8001
    volumes:
      - /path/to/nesventory_data:/app/data
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "8001:8001"
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

**Important:** Change these credentials for production use!

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

### Container Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `8001` | Application port |
| `PUID` | `1000` | User ID for file ownership |
| `PGID` | `1000` | Group ID for file ownership |
| `UMASK` | `002` | File permission mask |
| `TZ` | `Etc/UTC` | Timezone (e.g., `America/New_York`) |
| `DB_PATH` | `/app/data/nesventory.db` | SQLite database path |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token expiration (24 hours) |
| `DISABLE_SIGNUPS` | `false` | Prevent new user registration |

### AI Features (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | *(none)* | Google Gemini API key for AI photo detection |
| `GEMINI_MODEL` | `gemini-2.0-flash-exp` | Gemini model to use |
| `GEMINI_REQUEST_DELAY` | `4.0` | Delay between AI requests (seconds) |

### Google OAuth (Optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

### OIDC Authentication (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_CLIENT_ID` | *(none)* | OIDC Client ID |
| `OIDC_CLIENT_SECRET` | *(none)* | OIDC Client Secret |
| `OIDC_DISCOVERY_URL` | *(none)* | OIDC Discovery URL |
| `OIDC_PROVIDER_NAME` | `OIDC` | Display name for provider |
| `OIDC_BUTTON_TEXT` | `Sign in with OIDC` | Login button text |

## Docker Capabilities

For hardware features like Bluetooth printing, add Linux capabilities:

```yaml
services:
  nesventory:
    image: neuman1812/nesventory:latest
    cap_add:
      - NET_ADMIN    # Required for Bluetooth printer support
```

| Capability | Use Case |
|------------|----------|
| `NET_ADMIN` | Bluetooth printer communication (NIIMBOT D11-H) |

For full hardware access during development:

```yaml
services:
  nesventory:
    privileged: true
    volumes:
      - /dev:/dev
      - /var/run/dbus:/var/run/dbus
```

## Volumes

| Path | Description |
|------|-------------|
| `/app/data` | **Required.** SQLite database and uploaded media files |

The `/app/data` volume contains:
- `nesventory.db` - SQLite database
- `media/photos/` - Uploaded item photos
- `media/documents/` - Uploaded documents
- `media/videos/` - Uploaded videos
- `logs/` - Application logs

## Ports

| Port | Description |
|------|-------------|
| `8001` | Web UI and API (configurable via `APP_PORT`) |

## Health Check

```bash
curl http://localhost:8001/api/health
# Response: {"status":"healthy"}

curl http://localhost:8001/api/version
# Response: {"name":"NesVentory","version":"6.5.1"}
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

## Documentation

- [Docker Compose Variables Reference](https://github.com/tokendad/NesVentory/blob/main/docs/DOCKER_COMPOSE_VARIABLES.md)
- [NIIMBOT Printer Guide](https://github.com/tokendad/NesVentory/blob/main/docs/NIIMBOT_PRINTER_GUIDE.md)
- [CSV Import Guide](https://github.com/tokendad/NesVentory/blob/main/docs/CSV_IMPORT.md)
- [Plugin Development](https://github.com/tokendad/NesVentory/blob/main/docs/PLUGINS.md)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/tokendad/NesVentory/blob/main/LICENSE) file for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/tokendad/NesVentory/issues)
- **Documentation:** [GitHub Repository](https://github.com/tokendad/NesVentory)
