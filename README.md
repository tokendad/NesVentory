# NesVentory - Home Inventory Management System



NesVentory is a modern home inventory management application that helps you track and organize your household items, their locations, warranties, and maintenance schedules.

## 🚀 What's New in Version 5.0.0

This is a major release featuring a complete redesign of the user interface for improved usability and efficiency.

### ✨ Key Features in v5.0

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

## 🚀 What's New in Version 4.4.0

This release introduces a tabbed Edit Item interface for better organization and adds warranty management capabilities.

### ✨ Key Features in v4.4

📋 **Tabbed Edit Item Interface**
- New tabbed layout replaces scrolling form for non-living items
- **Basic Info Tab**: Name, brand, serial, model, retailer, purchase price, purchase date, primary photo, location
- **Warranty Tab**: Add and manage manufacturer and extended warranties with provider, policy number, duration, expiration date, and notes
- **Media Tab**: All photos including data tag with AI scan, receipts, warranty documents, and additional photos
- AI Scan buttons included where backend support exists (data tag scanning, barcode lookup)

🛡️ **Enhanced Warranty Management**
- Add multiple manufacturer and extended warranties per item
- Track warranty provider, policy number, duration, and expiration
- Upload and manage warranty document photos
- Notes field for contact info and additional details

🤖 **AI Scan Integration**
- AI Scan button on barcode/UPC field for automatic product lookup
- AI Scan button on data tag photo upload for automatic field extraction
- Consistent AI scanning experience across all supported fields

## 🚀 What's New in Version 4.3.0

This is a major release preparing NesVentory for public release with comprehensive features, improved security, and a polished user experience.

### ✨ Key Features in v4.0

🎨 **Logo & Branding Support**
- Application logo displayed in header and login screen
- Customizable branding for deployments

📷 **AI Photo Detection** (Google Gemini Powered)
- Take a photo of any room and AI will detect items automatically
- Advanced object recognition for furniture, electronics, appliances, and more
- Get estimated values and descriptions for detected items
- Bulk add detected items to your inventory
- Mobile device camera support

🤖 **AI Data Tag Parsing**
- Extract item information from data tag photos using AI
- Automatically parse manufacturer, model, serial number, and more
- Quick inventory creation from product labels

💰 **AI Value Estimation**
- Set estimated values using AI with source tracking
- Track when values were estimated and by whom

🎨 **Theme & Color Support**
- Customizable theme settings in user preferences
- Dark/light mode support

📍 **Hierarchical Location Browser**
- Interactive clickable location navigation
- Visual location tree with expand/collapse functionality

👥 **Enhanced User Management**
- Google OAuth SSO for login and registration
- Admin user creation and approval workflow
- Role-based access control (Admin, Editor, Viewer)
- Location-based access restrictions

📦 **Bulk Operations**
- Multi-select items for bulk actions
- Bulk delete, tag update, and location assignment
- Left-aligned action bars for better UX

📥 **Encircle Import**
- Import items and photos from Encircle XLSX exports
- Parent/sub-location hierarchy support
- Automatic location creation from import files

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

We use a **dev → main → stable** workflow:

| Branch | Purpose |
|--------|---------|
| `dev` | Active development |
| `main` | Integration and testing |
| `stable` | Production releases (Docker Hub) |

### Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to standardize commit messages. All commits in pull requests are automatically checked.

Please use one of the following prefixes for your commit messages:

- `feat:` - A new feature (e.g., `feat: add user profile page`)
- `fix:` - A bug fix (e.g., `fix: resolve login timeout issue`)
- `docs:` - Documentation changes (e.g., `docs: update installation guide`)
- `chore:` - Maintenance tasks (e.g., `chore: update dependencies`)
- `BREAKING CHANGE:` - A breaking API change (can also be indicated with `!` after the type, e.g., `feat!: remove legacy API`)

Other valid prefixes include: `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `revert:`

### Release Process

When PRs are merged:
- **To `main`**: Version is automatically bumped based on PR labels
- **To `stable`**: GitHub Release is created and Docker image is pushed to Docker Hub

## 📞 Support

For issues and support, please visit:
https://github.com/tokendad/NesVentory/issues
