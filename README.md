# NesVentory - Home Inventory Management System



NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## 🚀 What's New in Version 6.8.0

### 🖨️ **Enhanced Label Printing** (v6.8.0)
- **System Printer Support** - Print QR labels to any printer configured via CUPS (not just NIIMBOT)
- **Item Label Printing** - New "Print Label" button on Item Details page for individual item QR codes
- **Improved Discoverability** - First-time user guidance and more visible print options (Issue #464)
- **Print Preferences** - Your connection type and settings are now remembered between sessions

### 🏷️ **Dynamic Location Categories** (v6.7.0)
- **Custom Categories** - Create and manage custom categories for locations (e.g., Room, Garage, Box)
- **Admin Management** - Dedicated interface for managing location categories
- **Enhanced Organization** - Better sorting and filtering capabilities for your locations

## Previous Version Highlights

### 🔧 **Standardization** (v6.7.3)
- **Unified Port Configuration** - Standardized default port to 8181 across all documentation and configs

### 🖨️ **NIIMBOT Printer Improvements** (v6.5.1)
- **Fixed D11-H printer support** - Improved reliability and compatibility
- **Bluetooth/USB print options** - Added flexible printing options for thermal printers
- **Better host compatibility** - Relaxed document host check for various environments

### ✨ **Custom Fields** (v6.5.0)
- **Dynamic custom fields** - Add custom fields for links, notes, or other information to items
- **Multiple field types** - Support for text, URL, date, and number field types
- **Brand and retailer autocomplete** - Enhanced item entry with top 100 brands and retailers
- **Updated international formats** - Improved currency symbol positioning and date formatting

### 🖨️ **NIIMBOT Printer Support** (v6.4.1)
- **Direct label printing** - Print QR code labels directly to NIIMBOT thermal printers
- **Multiple printer models** - Support for B1, B18, B21, D11, D110 models
- **USB and Bluetooth** - Connect via USB (recommended) or Bluetooth
- **Configurable settings** - Adjust print density, test connection, and configure in User Settings
- See [NIIMBOT Printer Guide](docs/nimmbott/NIIMBOT_PRINTER_GUIDE.md) for setup instructions

### 🔐 **OIDC Authentication** (v6.4.0)
- **OpenID Connect support** - Integrate with OIDC providers like Authelia and Keycloak
- **Flexible authentication** - Use alongside Google OAuth and local accounts
- **Customizable branding** - Configure provider name and button text
- **Enterprise-ready** - Perfect for self-hosted authentication solutions

### 🏠 **Insurance Documentation** (v6.3.0)
- **Insurance tab for primary locations** - Manage comprehensive insurance documentation for your home
- **Policy holder management** - Track primary and additional policy holders with contact information
- **Automatic value calculation** - Total and estimated values including all items in location
- **Print functionality** - Basic and comprehensive insurance reports with photos
- **CSV export** - RFC 4180 compliant export of all items for insurance claims
- See [Insurance Tab Guide](docs/Guides/INSURANCE_TAB_GUIDE.md) for detailed instructions

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
- 🖨️ **NIIMBOT Printer Support** - Direct printing to NIIMBOT thermal label printers (B1, B18, B21, D11, D110)
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
