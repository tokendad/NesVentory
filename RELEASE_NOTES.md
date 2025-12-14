# NesVentory v6.0.0 - Major Release

## Overview

Version 6.0.0 marks a major milestone by merging the 5.0-upgrade branch into main and establishing this as the primary release branch.

## What's New in 6.0.0

### Merged Features from 5.0-upgrade Branch

**🔌 LLM Plugin System**
- External LLM plugin support for AI-powered item detection
- Priority-based plugin system with automatic fallback to Gemini AI
- Plugin health checks and version detection
- Enhanced error handling with detailed troubleshooting

**🛠️ Maintenance Management**
- Comprehensive maintenance tracking system
- Recurring maintenance schedules
- Maintenance calendar view
- Maintenance history and notes

**🎥 Video Support**
- Video upload and management for items
- Video storage system

**📦 Unified Inventory Page**
- All-in-one view combining stats, locations, and items
- Interactive location browser with dynamic filtering
- Quick location settings access
- Customizable item display and columns

**⚙️ System Settings Hub**
- Consolidated theme, locale, and service status
- Tabbed interface for better organization

### Infrastructure Updates

- Updated all workflows to publish main branch as "latest" Docker tag
- Removed 5.0-specific workflow files
- Updated documentation to reflect version 6.0.0
- Consolidated branching strategy to focus on main branch

## Upgrade Notes

If upgrading from version 4.x:
- Review the new unified Inventory page layout
- Check the new System Settings for configuration options
- Review plugin documentation if using external LLM services

---

See complete PRs: https://github.com/tokendad/NesVentory/pulls?state=closed&sort=updated&direction=desc
