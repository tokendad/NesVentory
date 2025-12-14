# Release v6.0.0

## NesVentory v6.0.0 - Major Release

Version 6.0.0 marks a major milestone by merging the 5.0-upgrade branch into main and establishing this as the primary release branch.

---

## 🎯 Overview

This release consolidates all features from the 5.0 series and updates the project structure to use main as the primary production branch. It includes significant new capabilities for plugin support, maintenance tracking, and enhanced user experience.

---

## ✨ What's New in 6.0.0

### 🔌 LLM Plugin System
- External LLM plugin support for AI-powered item detection
- Priority-based plugin system with automatic fallback to Gemini AI  
- Plugin health checks and version detection
- Enhanced error handling with detailed troubleshooting guidance
- Configurable plugin endpoints and API keys
- See [PLUGINS.md](https://github.com/tokendad/NesVentory/blob/main/PLUGINS.md) for complete documentation

### 🛠️ Maintenance Management
- Comprehensive maintenance tracking system
- Recurring maintenance schedules with various recurrence patterns
- Maintenance calendar view with monthly navigation
- Maintenance history and detailed notes
- Maintenance tab in the user interface
- Track maintenance tasks for all inventory items

### 🎥 Video Support
- Video upload and management for items
- Video storage and retrieval system
- Video router with dedicated endpoints
- Store multiple videos per item

### 📦 Unified Inventory Page
- All-in-one view combining stats, locations, and items
- Interactive location browser with dynamic filtering
- Quick location settings access via gear icon
- Customizable item display (10, 25, 50, 100, or All items)
- Configurable table columns for personalized views
- Streamlined item interaction and selection

### ⚙️ System Settings Hub
- Consolidated theme, locale, and service status in one place
- Tabbed interface for better organization
- All system configuration accessible from a single location
- Improved user experience for system management

### 📱 Enhanced Navigation
- Redesigned sidebar with emoji icons
- Clear section separation (Inventory, User Settings, Maintenance, System Settings, Admin)
- Improved mobile responsiveness
- Footer with version display and GitHub link

---

## 🏗️ Infrastructure Updates

### Branch Strategy Simplification
- Simplified from dev → main → stable to main-focused workflow
- Main branch is now the primary production branch
- Removed 5.0-specific workflow files
- Updated all documentation to reflect new branching model

### Docker Publishing
- Main branch publishes as "latest" tag on Docker Hub
- Version tagging includes: latest, 6.0.0, 6.0, 6
- Removed legacy 5.0-specific publishing workflows
- Consolidated publishing under `docker-publish.yml` and `release-workflow.yml`
- Multi-platform support (amd64, arm64)

### Documentation Updates
- Updated README.md to version 6.0.0
- Updated CHANGELOG.md with complete version history
- Updated INSTALL.txt with version 6.0.0
- Updated DOCKERHUB.md with new tags and instructions
- Updated CONTRIBUTING.md with simplified workflow
- Added comprehensive PLUGINS.md documentation

---

## 🔄 Breaking Changes

**None.** Version 6.0.0 is fully backward compatible with 5.x databases and configurations.

---

## 📋 Upgrade Notes

### From 4.x to 6.0.0

If upgrading from version 4.x, you will gain all features from the 5.0 series:
- Review the new unified Inventory page layout
- Check the new System Settings for configuration options  
- Review [PLUGINS.md](https://github.com/tokendad/NesVentory/blob/main/PLUGINS.md) if you want to use external LLM services
- Maintenance tracking is now available in the sidebar

### Database Migration

No database migration is required. SQLite databases from 4.x and 5.x are fully compatible with 6.0.0.

### Docker Images

Pull the latest image:
```bash
docker pull neuman1812/nesventory:latest
# or specific version
docker pull neuman1812/nesventory:6.0.0
```

Update your docker-compose.yml to use the new version, or simply restart your container to pull the latest.

---

## 🐛 Known Issues

None identified at this time.

---

## 📦 Installation

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  nesventory:
    image: neuman1812/nesventory:6.0.0
    container_name: nesventory
    ports:
      - "8001:8001"
    environment:
      - SECRET_KEY=your-secret-key-here
      - JWT_SECRET_KEY=your-jwt-secret-here
      - PUID=1000
      - PGID=1000
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

See [INSTALL.txt](https://github.com/tokendad/NesVentory/blob/main/INSTALL.txt) for complete installation instructions.

---

## 🔗 Resources

- **Full Changelog**: [CHANGELOG.md](https://github.com/tokendad/NesVentory/blob/main/CHANGELOG.md)
- **Release Notes**: [RELEASE_NOTES.md](https://github.com/tokendad/NesVentory/blob/main/RELEASE_NOTES.md)
- **Installation Guide**: [INSTALL.txt](https://github.com/tokendad/NesVentory/blob/main/INSTALL.txt)
- **Plugin Documentation**: [PLUGINS.md](https://github.com/tokendad/NesVentory/blob/main/PLUGINS.md)
- **Docker Hub**: https://hub.docker.com/r/neuman1812/nesventory
- **GitHub Repository**: https://github.com/tokendad/NesVentory

---

## 👥 Contributors

Thank you to all contributors who made this release possible!

Special thanks to the community for testing, feedback, and bug reports.

---

## 📝 Notes

- This release consolidates the 5.0 upgrade branch into main
- All future development will be based on the main branch
- Version 6.0.0 represents a stable, production-ready release
- Docker images are available for both amd64 and arm64 architectures

---

**Released**: December 14, 2025  
**Tag**: v6.0.0  
**Repository**: https://github.com/tokendad/NesVentory
