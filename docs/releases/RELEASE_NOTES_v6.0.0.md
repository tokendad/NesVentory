# NesVentory v6.0.0

Release tag: https://github.com/tokendad/NesVentory/releases/tag/v6.0.0

## Summary

Version 6.0.0 marks a major milestone by merging the 5.0-upgrade branch into main and establishing this as the primary release branch. This release consolidates all features from the 5.x series and updates the project structure to use main as the primary production branch.

## Major Changes

### Merged 5.0-upgrade Branch
- Consolidated all enhancements from the 5.0 upgrade branch
- Unified codebase under version 6.0.0
- Resolved conflicts in favor of 5.0-upgrade features

### New Features from 5.0 Series

**🔌 LLM Plugin System**
- External LLM plugin support for AI-powered item detection
- Priority-based plugin system with automatic fallback to Gemini AI
- Plugin health checks and version detection
- Enhanced error handling with detailed troubleshooting guidance
- See PLUGINS.md for full documentation

**🛠️ Maintenance Management**
- Comprehensive maintenance tracking system
- Recurring maintenance schedules with various recurrence patterns
- Maintenance calendar view
- Maintenance history and notes
- Maintenance tab in user interface

**🎥 Video Support**
- Video upload and management for items
- Video storage and retrieval system
- Video router and endpoints

**📦 Unified Inventory Page**
- All-in-one view combining stats, locations, and items
- Interactive location browser with dynamic filtering
- Quick location settings access via gear icon
- Customizable item display (10-100+ items)
- Configurable table columns
- Streamlined item interaction

**⚙️ System Settings Hub**
- Consolidated theme, locale, and service status
- Tabbed interface for better organization
- All system configuration in one place

### Infrastructure Updates

**Branch Strategy Simplification**
- Simplified from dev → main → stable to main-focused workflow
- Main branch is now the primary production branch
- Removed 5.0-specific workflow files
- Updated all documentation to reflect new branching model

**Docker Publishing**
- Main branch publishes as "latest" tag on Docker Hub
- Version tagging includes: latest, 6.0.0, 6.0, 6
- Removed legacy 5.0-specific publishing workflows
- Consolidated publishing under docker-publish.yml and publish-latest.yml

**Documentation Updates**
- Updated README.md to version 6.0.0
- Updated CHANGELOG.md with complete version history
- Updated INSTALL.txt with version 6.0.0
- Updated DOCKERHUB.md with new tags
- Updated CONTRIBUTING.md with simplified workflow
- Removed legacy instruction files (WORKFLOW_FIX_INSTRUCTIONS.md, PR_NOTES.md)

## Breaking Changes

None. Version 6.0.0 is fully backward compatible with 5.x databases and configurations.

## Upgrade Notes

### From 4.x to 6.0.0

If upgrading from version 4.x, you will gain all features from the 5.0 series:
- Review the new unified Inventory page layout
- Check the new System Settings for configuration options
- Review PLUGINS.md if you want to use external LLM services
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

## Known Issues

None identified at this time.

## Contributors

Thank you to all contributors who made this release possible!

---

For complete change history, see [CHANGELOG.md](https://github.com/tokendad/NesVentory/blob/main/CHANGELOG.md)
