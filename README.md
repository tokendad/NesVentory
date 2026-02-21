# NesVentory - Home Inventory Management System



NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## 📸 Screenshots

### Web Interface

| Main Dashboard | Admin Settings |
|---|---|
| ![Main Dashboard](screenshots/Main%20Dashboard.png) | ![Admin Settings](screenshots/Admin%20Settings.png) |

| Media Management | User Settings |
|---|---|
| ![Media Management](screenshots/Media%20Management..png) | ![User Settings](screenshots/User%20Settings.png) |

### Mobile Browser

![Main Dashboard - Mobile](screenshots/Main%20Dashboard-%20Mobile.jpg)

### Mobile App

| Dashboard | Inventory | Locations | Server Settings |
|---|---|---|---|
| ![Dashboard](screenshots/Main%20Dashboard-%20Mobile%20App.jpg) | ![Inventory](screenshots/Inventory%20-%20Mobil%20App.jpg) | ![Locations](screenshots/Locations%20-%20Mobile%20App.jpg) | ![Server Settings](screenshots/Server%20Settings%20-%20Mobile%20App.jpg) |

*(via [NesVentory Mobile App](https://github.com/tokendad/NesventoryApp))*

## 🚀 What's New in Version 6.11.2

### 🖨️ **Enhanced NIIMBOT Printer Support** (v6.9.0 - v6.11.2)
- **9 Printer Models Supported** - D101, D110, D110_M, D11_H, B1, B18, B21, B21_Pro, M2_H
- **Connection Pooling** - 87-90% faster sequential prints with printer reuse
- **Async I/O Threading** - Non-blocking Bluetooth operations for better performance
- **Pre-flight Status Checking** - Prevents silent print failures with paper/battery validation
- **Configurable Label Lengths** - User-adjustable label sizes for different stock
- **Classic Bluetooth Support** - RFCOMM transport for older printers like B1
- **Improved Error Handling** - Standardized error messages across all printer endpoints

### 🖨️ **System Printer Support** (v6.8.0)
- **CUPS Integration** - Print QR labels to any printer configured via CUPS (not just NIIMBOT)
- **Item Label Printing** - New "Print Label" button on Item Details page for individual item QR codes
- **Print Preferences** - Connection type and settings remembered between sessions

### 🏷️ **Dynamic Location Categories** (v6.7.0)
- **Custom Categories** - Create and manage custom categories for locations (e.g., Room, Garage, Box)
- **Admin Management** - Dedicated interface for managing location categories
- **Enhanced Organization** - Better sorting and filtering capabilities for your locations


## Features

- 📦 **Inventory Management** - Track all your household items with detailed information
- ✨ **Custom Fields** - Add custom fields (text, URL, date, number) for links, notes, or other information
- 📸 **Media Management Dashboard** - Centralized view of all photos and videos across your inventory
- 📷 **AI Photo Detection** - Scan rooms with AI to detect and add items automatically
- 🤖 **AI Data Tag Parsing** - Extract product info from data tag photos
- 🧠 **AI Item Enrichment** - Automatically enhance item details with confidence-based review
- 🔍 **Barcode Lookup** - UPC database integration with barcodelookup.com
- 🧩 **Custom LLM Plugins** - Integrate specialized AI models for enhanced scanning accuracy
- ⚙️ **AI Provider Configuration** - Multi-provider AI settings in Admin Panel
- 📍 **Location Hierarchy** - Organize items by rooms and sub-locations
- 🏷️ **Location Categories** - Categorize locations (e.g., Room, Garage, Container) for better sorting and filtering
- 📱 **QR Code Labels** - Print QR labels for locations, containers, and individual items
- 🖨️ **NIIMBOT Printer Support** - Direct printing to 9 NIIMBOT thermal label printer models (D101, D110, D110_M, D11_H, B1, B18, B21, B21_Pro, M2_H)
- 🖥️ **System Printer (CUPS)** - Print labels to any printer configured on your system via CUPS
- 📦 **Container Support** - Mark locations as boxes/bins for seasonal storage
- 🏠 **Insurance Documentation** - Comprehensive insurance tracking for primary locations with print and CSV export
- 🏘️ **Multi-Property Support** - Manage multiple homes and multi-family properties
- 👥 **Landlord/Tenant Management** - Track landlord and tenant info for rental properties
- 📥 **CSV Import** - Import items from CSV files with automatic image URL download
- 📥 **Encircle Import** - Import items and photos from Encircle XLSX exports
- 🖼️ **Photo Management** - Edit photo metadata, reassign photos to items, and delete photos
- 📍 **Location Media** - Upload and manage media directly on locations
- 🔐 **Multi-user Support** - Role-based access control (Admin, Editor, Viewer)
- 🔑 **Google OAuth SSO** - Sign in with Google for easy authentication
- 🔐 **OIDC Authentication** - OpenID Connect support for Authelia, Keycloak, and other providers
- 🔒 **Location Access Control** - Restrict user access to specific properties
- 🛠️ **Maintenance Tracking** - Schedule and track recurring maintenance tasks
- 🌐 **International Formats** - Enhanced support for 25+ locales and 20+ currencies
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

4. Access at: http://localhost:8181

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
- **[docs/Guides/CSV_IMPORT.md](docs/Guides/CSV_IMPORT.md)** - Guide for importing inventory from CSV files with image URLs
- **[docs/Guides/PLUGINS.md](docs/Guides/PLUGINS.md)** - Guide for creating and configuring custom LLM plugins
- **[docs/Guides/INSURANCE_TAB_GUIDE.md](docs/Guides/INSURANCE_TAB_GUIDE.md)** - Guide for using the insurance documentation features
- **[docs/nimmbott/NIIMBOT_PRINTER_GUIDE.md](docs/nimmbott/NIIMBOT_PRINTER_GUIDE.md)** - Setup and usage guide for NIIMBOT thermal label printers
- **[docs/Guides/WINDOWS_LPD_PRINTING_GUIDE.md](docs/Guides/WINDOWS_LPD_PRINTING_GUIDE.md)** - Guide for printing from Docker to Windows printers via LPD

## 🌐 Related Projects

NesVentory has companion projects for extended functionality:

- **[NesVentory Mobile App](https://github.com/tokendad/NesventoryApp)** - Native mobile app for iOS and Android
- **[NesVentory Home Assistant Add-on](https://github.com/tokendad/Nesventory-HA-Addon)** - Home Assistant integration for smart home automation
- **[NesVentory LLM Plugin](https://github.com/tokendad/Plugin-Nesventory-LLM)** - Custom AI/LLM plugin for enhanced item detection

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

## Acknowledgements

Special thanks to the following projects for their contributions to the printing capabilities:
- [NiimPrintX](https://github.com/labbots/NiimPrintX)
- [niimprint](https://github.com/AndBondStyle/niimprint)
- [niimblue](https://github.com/MultiMote/niimblue)

## 📞 Support

For issues and support, please visit:
https://github.com/tokendad/NesVentory/issues
