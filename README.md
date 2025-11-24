# NesVentory - Home Inventory Management System

**Version: 2.0.0**

NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## What's New in Version 2.0

🎉 **Unified Container with SQLite** - Maximum simplicity:
- ✅ Single Docker container (no separate frontend/backend/database)
- ✅ Embedded SQLite database (no PostgreSQL setup needed)
- ✅ Single port configuration (8001)
- ✅ Built-in frontend serving
- ✅ Seamless single-command startup
- ✅ 60% smaller image size (~800MB vs ~2GB)
- ✅ Only 2 required environment variables
- ✅ File-based database for easy backup

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
- **Frontend**: React + TypeScript + Vite (built and served by backend)
- **Database**: SQLite (embedded, file-based)
- **Containerization**: Docker (single unified container)

## 🚀 Getting Started

**For complete installation instructions, see [INSTALL.txt](INSTALL.txt)**

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

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues and support, please visit:
https://github.com/tokendad/NesVentory/issues
