# NesVentory - Home Inventory Management System

**Version: 1.1.0-alpha**

NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## Features

- 📦 **Inventory Management** - Track all your household items with detailed information
- 📍 **Location Hierarchy** - Organize items by rooms and sub-locations
- 🔐 **Multi-user Support** - Role-based access control (Admin, Editor, Viewer)
- 🛠️ **Maintenance Tracking** - Schedule and track recurring maintenance tasks
- 📱 **Modern UI** - Responsive React frontend with TypeScript
- 🚀 **FastAPI Backend** - High-performance Python backend
- 🐘 **PostgreSQL Database** - Reliable data storage
- 🐳 **Docker Ready** - Easy deployment with Docker Compose
- 🎯 **Pre-seeded Test Data** - Start testing immediately with sample data

## Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

**For detailed installation instructions, see [INSTALL.txt](INSTALL.txt)**

### Minimum Requirements
- Docker & Docker Compose
- Node.js 18+ and npm
- Git

### Quick Setup

1. **Clone and configure**
   ```bash
   git clone https://github.com/tokendad/NesVentory.git
   cd NesVentory
   cp .env.example .env
   ```

2. **Edit `.env` and set secure values** (REQUIRED)
   ```bash
   SECRET_KEY=<generate-with-python>
   JWT_SECRET_KEY=<generate-with-python>
   DB_PASSWORD=<strong-password>
   ```
   Generate secure keys: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

3. **Start backend services**
   ```bash
   docker compose up --build
   ```

4. **Start frontend** (in a new terminal)
   ```bash
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/docs

### 🔑 Default Login Credentials

The application comes with pre-seeded test users:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@nesventory.local | admin123 | Full access |
| **Editor** | editor@nesventory.local | editor123 | Create/modify items |
| **Viewer** | viewer@nesventory.local | viewer123 | Read-only |

⚠️ **Important**: Change these credentials for production use!

## 📚 Documentation

- **[INSTALL.txt](INSTALL.txt)** - Comprehensive installation guide with Docker Compose and CLI commands
- **[SEEDING.md](SEEDING.md)** - Details about pre-seeded test data and how to customize it

## 🔌 API Endpoints

- `/api/health` - Health check endpoint
- `/api/version` - Get application version and name
- `/api/auth/*` - Authentication endpoints
- `/api/items/*` - Inventory item management
- `/api/locations/*` - Location management
- `/docs` - Interactive API documentation (Swagger UI)

## 📦 Test Data

The application automatically seeds the database with test data on first startup:

- **3 test users** with different permission levels (admin, editor, viewer)
- **9 locations** in a hierarchical structure (Living Room, Kitchen, Garage, etc.)
- **8 sample items** (electronics, appliances, tools, furniture)
- **4 maintenance tasks** with recurring schedules

For complete details, see [SEEDING.md](SEEDING.md).

## 🔒 Security Best Practices

### Environment Variables
- **Never commit `.env` to version control** - it contains sensitive credentials
- Always use strong, unique secrets for `SECRET_KEY`, `JWT_SECRET_KEY`, and `DB_PASSWORD`
- Generate secure random secrets: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- For production, use environment-specific values and rotate secrets regularly

### Production Deployment
- ⚠️ Change all default passwords and secret keys
- Use HTTPS for all communication
- Set appropriate `CORS_ORIGINS` for your frontend domain(s)
- Consider disabling automatic database seeding (see `backend/app/main.py`)
- Use a dedicated database user with minimal required privileges
- Keep dependencies up to date and monitor for security vulnerabilities

## 🐳 Docker Commands Quick Reference

### Docker Compose (Recommended)
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild and restart
docker compose up --build

# Stop and remove all data
docker compose down -v
```

### Docker CLI Alternative
See [INSTALL.txt](INSTALL.txt) for detailed Docker CLI commands.

## 🔧 Troubleshooting

### Database Schema Errors

If you encounter errors like `foreign key constraint cannot be implemented` or type mismatch errors (e.g., `uuid and integer`), the database volume contains an old schema incompatible with the current code.

**Solution**: Reset the database by removing the Docker volume:

```bash
# Stop the containers
docker compose down

# Remove the database volume
docker volume rm nesventory_nesventory_db_data

# Restart with a fresh database
docker compose up --build
```

**Note**: This will delete all data in the database. The application will automatically recreate tables with the correct schema and re-seed test data on startup.

### Other Issues

For additional troubleshooting steps, see [INSTALL.txt](INSTALL.txt).

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues and support, please visit:
https://github.com/tokendad/NesVentory/issues
