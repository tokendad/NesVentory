# NesVentory v4.5.0 - Stability and Bug Fixes

## Overview

Version 4.5.0 is a stability release that addresses Docker container freeze issues and fixes GitHub Actions labeler configuration.

## Bug Fixes

### Docker Container Stability
- **Fixed container freeze after database initialization**
  - Changed Python base image from `python:3.14-slim` (alpha/unreleased) to `python:3.12-slim` (stable)
  - Python 3.14 is scheduled for release in October 2025 and was causing stability issues
  
- **Fixed enum class definitions**
  - Corrected `UserRole`, `LocationType`, and `RecurrenceType` to inherit from Python's `enum.Enum`
  - Previous code incorrectly used SQLAlchemy's `Enum` type which caused iteration and value lookup issues

### GitHub Actions Labeler
- Fixed labeler configuration file location
- Removed duplicate workflow file
- Proper label-to-path mappings for frontend, backend, documentation, infrastructure, ci/cd, and dependencies

## Technical Details

### Python Base Image Change
```dockerfile
# Before (unstable)
FROM python:3.14-slim

# After (stable)
FROM python:3.12-slim
```

### Enum Fix
```python
# Before (broken): inherits SQLAlchemy column type
from sqlalchemy import Enum
class UserRole(str, Enum):  # Not a real Python enum
    ADMIN = "admin"

# After (fixed): proper Python enum
import enum
class UserRole(str, enum.Enum):  # Proper enum with iteration, value lookup
    ADMIN = "admin"
```

## Upgrade Notes

For users upgrading from v4.4.x:
1. Pull the latest Docker image
2. Restart your container
3. No database migration required
4. Existing data will be preserved

## Previous Features (v4.4.0)

- Tabbed Edit Item Interface
- Enhanced Warranty Management  
- AI Scan Integration

---

See complete PRs: https://github.com/tokendad/NesVentory/pulls?state=closed&sort=updated&direction=desc