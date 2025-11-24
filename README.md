# NesVentory - Home Inventory Management System

**Version: 2.3.0**

NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## What's New in Version 2.3.0

🎉 **Encircle Import Feature**:
- ✅ Import items from Encircle detailed XLSX export files
- ✅ Automatic image matching by description or number prefix
- ✅ Bulk image upload support
- ✅ Automatic location creation from import data
- ✅ RCV (Replacement Cost Value) import support

## Features

- 📦 **Inventory Management** - Track all your household items with detailed information
- 📍 **Location Hierarchy** - Organize items by rooms and sub-locations
- 📥 **Encircle Import** - Import items and photos from Encircle XLSX exports
- 🔐 **Multi-user Support** - Role-based access control (Admin, Editor, Viewer)
- 🛠️ **Maintenance Tracking** - Schedule and track recurring maintenance tasks
- 🌐 **International Formats** - Support for 25+ locales and 20+ currencies
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
- **[INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)** - Guide to international format support for dates and currencies

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues and support, please visit:
https://github.com/tokendad/NesVentory/issues
