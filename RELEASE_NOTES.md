# NesVentory v4.0.0 - Public Release

## Overview

Version 4.0.0 marks the public release of NesVentory, a comprehensive home inventory management system. This release includes all major features developed since v1.0 and is ready for public use.

## Major Features

### AI-Powered Inventory Management
- **AI Photo Detection** - Scan any room with your camera and let AI detect items automatically using Google Gemini
- **AI Data Tag Parsing** - Take a photo of a product's data tag/label to extract manufacturer, model, serial number, and more
- **AI Value Estimation** - Get AI-powered estimated values for your items with source tracking

### Logo & Branding Support
- Display custom logo in header and login screen
- Configurable branding for deployments

### Theme & Color Support
- User preference settings for themes
- Customizable color schemes

### Hierarchical Location Browser
- Interactive clickable navigation
- Visual tree structure with expand/collapse

### User Management
- Google OAuth SSO for easy authentication
- Admin user creation and approval workflow
- Role-based access control (Admin, Editor, Viewer)
- Location-based access restrictions

### Bulk Operations
- Multi-select items for bulk actions
- Bulk delete, tag update, and location assignment
- Left-aligned action bars for better UX

### Data Import
- Enhanced Encircle XLSX import
- Parent/sub-location hierarchy support
- Automatic location creation from import files

## Core Features

- 📦 Inventory Management - Track all household items with detailed information
- 📍 Location Hierarchy - Organize items by rooms and sub-locations
- 🏘️ Multi-Property Support - Manage multiple homes and multi-family properties
- 👥 Landlord/Tenant Management - Track landlord and tenant info for rental properties
- 🛠️ Maintenance Tracking - Schedule and track recurring maintenance tasks
- 🌐 International Formats - Support for 25+ locales and 20+ currencies
- 🐳 Docker Ready - Easy deployment with single unified container
- 🎯 Pre-seeded Test Data - Start testing immediately with sample data

## Bug Fixes
- Fixed code scanning alert for clear text storage of sensitive info
- Fixed build breaking login functionality
- Fixed API key visibility in User Settings
- Fixed AI data tag scan update error

## Technical Details

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite (embedded, file-based)
- **Container**: Single unified Docker container
- **AI**: Google Gemini API integration

## Breaking Changes

None - This release is backward compatible with v3.x data.

## Migration Notes

For users upgrading from v3.x:
1. Update your Docker image to v4.0.0
2. No database migration required
3. Existing data will be preserved

## Security Notes

- Reviewed codebase for private information and hardcoded paths
- Checked dependencies for known vulnerabilities
- Enhanced secret handling and API key management

## Documentation

- Updated README.md with comprehensive feature list
- Updated INSTALL.txt with current installation instructions
- Updated CHANGELOG.md with version history

---

See complete PRs: https://github.com/tokendad/NesVentory/pulls?state=closed&sort=updated&direction=desc