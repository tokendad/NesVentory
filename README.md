# NesVentory - Home Inventory Management System



NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## 🚀 What's New in Version 6.0.0

This is a major release consolidating the 5.0 upgrade into the main branch with enhanced plugin support, maintenance tracking, and video support.

### ✨ Key Features in v6.0

🔌 **LLM Plugin System**
- Support for external LLM plugins for AI-powered item detection
- Plugin priority system with automatic fallback to Gemini AI
- Configurable plugin endpoints and API keys
- Health check and version detection for plugins
- Enhanced error handling with detailed troubleshooting guidance

🛠️ **Maintenance Management**
- Comprehensive maintenance tracking system
- Recurring maintenance schedules
- Maintenance history and notes
- Calendar view for maintenance tasks

🎥 **Video Support**
- Upload and manage video files for items
- Video storage and retrieval system

### ✨ Features from v5.0

🎯 **Unified Inventory Page**
- All-in-one view combining stats, locations, and items
- Interactive location browser with dynamic filtering
- Quick location settings access via gear icon
- Customizable item display (10-100+ items)
- Configurable table columns
- Streamlined item interaction

📱 **Redesigned Navigation**
- 📦 Inventory - Your complete inventory at a glance
- 👤 User Settings - Manage your profile
- 📅 Maintenance Calendar - Track maintenance schedules
- ⚙️ System Settings - Theme, Locale, and Service Status
- 🔐 Admin - Administrative functions (admin only)

🔍 **Enhanced Header**
- Global search across all items
- Logo and branding prominently displayed
- Cleaner, more intuitive layout

📊 **System Settings Hub**
- Tabbed interface for Theme, Locale & Currency, and Service Status
- All system configuration in one place
- Better organization and discoverability

## Features

- 📦 **Inventory Management** - Track all your household items with detailed information
- 📷 **AI Photo Detection** - Scan rooms with AI to detect and add items automatically
- 🤖 **AI Data Tag Parsing** - Extract product info from data tag photos
- 🧩 **Custom LLM Plugins** - Integrate specialized AI models for enhanced scanning accuracy
- 📍 **Location Hierarchy** - Organize items by rooms and sub-locations
- 📱 **QR Code Labels** - Print QR labels for locations and containers
- 📦 **Container Support** - Mark locations as boxes/bins for seasonal storage
- 🏘️ **Multi-Property Support** - Manage multiple homes and multi-family properties
- 👥 **Landlord/Tenant Management** - Track landlord and tenant info for rental properties
- 📥 **Encircle Import** - Import items and photos from Encircle XLSX exports
- 🔐 **Multi-user Support** - Role-based access control (Admin, Editor, Viewer)
- 🔑 **Google OAuth SSO** - Sign in with Google for easy authentication
- 🔒 **Location Access Control** - Restrict user access to specific properties
- 🛠️ **Maintenance Tracking** - Schedule and track recurring maintenance tasks
- 🌐 **International Formats** - Support for 25+ locales and 20+ currencies
- 📱 **Modern UI** - Responsive React frontend with TypeScript
- 🚀 **FastAPI Backend** - High-performance Python backend
- 🗄️ **SQLite Database** - Simple, embedded, file-based storage
- 🐳 **Docker Ready** - Easy deployment with single unified container
- 🎯 **Pre-seeded Test Data** - Start testing immediately with sample data

## Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React + TypeScript + Vite (built and served by backend)
- **Database**: SQLite (embedded, file-based)
- **Containerization**: Docker (single unified container)

## 📸 Screenshots

### Login Screen
![Login Screen](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Items List
![Items List](screenshots/items.png)

### Item Details
![Item Details](screenshots/item-details.png)

## 🚀 Getting Started

**For complete installation instructions, see [INSTALL.txt](INSTALL.txt)**

### Quick Start with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/tokendad/NesVentory.git
   cd NesVentory
   ```

2. Edit `docker-compose.yml` to set secure keys and configure volumes

3. Start the application:
   ```bash
   docker compose up -d
   ```

4. Access at: http://localhost:8001

### 🔑 Default Login Credentials

The application comes with pre-seeded test users:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@nesventory.local | admin123 | Full access |
| **Editor** | editor@nesventory.local | editor123 | Create/modify items |
| **Viewer** | viewer@nesventory.local | viewer123 | Read-only |

⚠️ **Important**: Change these credentials for production use!

## 📚 Documentation

- **[docker-compose.yml](docker-compose.yml)** - Example Docker Compose configuration file
- **[INSTALL.txt](INSTALL.txt)** - Comprehensive installation guide with Docker Compose and CLI commands
- **[SEEDING.md](SEEDING.md)** - Details about pre-seeded test data and how to customize it
- **[INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)** - Guide to international format support for dates and currencies
- **[PLUGINS.md](PLUGINS.md)** - Guide for creating and configuring custom LLM plugins

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Branching Strategy

We use **main** as the primary branch:

| Branch | Purpose |
|--------|---------|
| `main` | Primary production branch |
| `feature/*` | Development branches for new features |

## 📞 Support

For issues and support, please visit:
https://github.com/tokendad/NesVentory/issues
