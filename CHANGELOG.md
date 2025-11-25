# Changelog

All notable changes to this project will be documented in this file.

## [2.5.1] - 2025-11-25
### Fixed
- Fixed docker logs displaying hardcoded port 8001 instead of the user-configured APP_PORT value
  - Updated Dockerfile to use APP_PORT environment variable for uvicorn port
  - Updated docker-compose.yml to pass APP_PORT to container and use dynamic port mapping

### Changed
- Bumped project version to 2.5.1

## [2.5.0] - 2025-11-25
### Added
- **Location management in dashboard**:
  - New "Locations" view in the sidebar navigation for managing locations
  - LocationsPage component with full CRUD operations for locations
  - Ability to create new home locations with support for different types (residential, commercial, retail, etc.)
  - Ability to edit existing locations
  - Ability to delete locations
  - Search functionality for filtering locations by name, description, or address
  - Support for setting primary locations (homes), location types, parent locations, and addresses
  - Frontend API functions: `createLocation`, `updateLocation`, `deleteLocation`

### Changed
- Bumped project version to 2.5.0

## [2.4.0] - 2025-11-24
### Added
- **Multiple homes and multi-family homes support**:
  - Added `is_primary_location` boolean field to Location model to designate primary/main locations (homes)
  - Added `landlord_info` JSON field to Location model for storing landlord details on multi-family/apartment buildings
    - Supports: name, company, phone, email, address, notes
  - Added `tenant_info` JSON field to Location model for storing tenant details on units/apartments
    - Supports: name, phone, email, lease_start, lease_end, rent_amount, notes
- **User location access control**:
  - New `user_location_access` association table for many-to-many relationship between users and locations
  - Added `allowed_locations` relationship to User model for restricting access to specific locations
  - New API endpoints for managing user location access:
    - `PUT /api/users/{user_id}/locations` - Set which locations a user can access
    - `GET /api/users/{user_id}/locations` - Get list of accessible locations for a user
  - Users with empty allowed_locations list have access to all locations (default behavior)
- **Admin panel enhancements**:
  - Added "Location Access" column to user management table
  - Added "Edit Access" button to manage user location permissions
  - Location access editor with checkboxes for primary/main locations
- **LocationsTree UI improvements**:
  - Visual indicators for primary locations (HOME badge)
  - Visual indicators for locations with landlord info (LANDLORD badge)
  - Visual indicators for locations with tenant info (TENANT badge)
  - Location type badges showing property classification

### Changed
- Updated Location schemas in both SQLite and PostgreSQL models
- Updated frontend Location interface to include all new fields
- Updated User interface to include `allowed_location_ids`
- Bumped project version to 2.4.0

## [2.3.0] - 2025-11-24
### Added
- Encircle XLSX import feature for importing items and images from Encircle detailed export files
  - New `/api/import/encircle` endpoint for processing Encircle XLSX files
  - Support for image file upload with automatic matching to items
  - Two image matching modes: by item description (default) or by numeric prefix
  - Automatic location creation from XLSX data
  - Estimated value import from RCV column
  - Import log showing progress and summary
- "Import from Encircle" button in Items view
- New EncircleImport component with file upload UI and import options
- Added openpyxl dependency for XLSX parsing

### Changed
- Bumped project version to 2.3.0

## [2.1.0] - 2025-11-24
### Added
- Extended location model with comprehensive detail fields:
  - Friendly name for user-friendly location identification
  - Description field for detailed location information
  - Address field for physical location address
  - Owner information (JSON field) supporting owner name, spouse/wife information, contact details, and notes
  - Insurance information (JSON field) supporting company name, policy number, contact info, coverage amount, and notes
  - Estimated property value for tracking property worth
  - Estimated value with items for total property value including inventory
  - Location type designation supporting: residential, commercial, retail, industrial, apartment complex, condo, multi-family home, and other

### Changed
- Updated Location model in backend to support new detail fields
- Updated Location schemas to include all new fields in create/update operations
- Bumped project version to 2.1.0

## [1.1.1] - 2025-11-23
### Added
- User registration endpoint (POST /api/users) and frontend registration form. (Fixes #7)
- User settings page (accessible by clicking the username in the dashboard) allowing users to update their full name and password. (Part of #9)
- Admin page (admin-only) with a user list and basic management actions. (Part of #9)

### Changed
- Backend: fixed user creation helper to use consistent password_hash field.
- Frontend: added API helpers and components to support registration, user settings, and admin page.
- Bumped project version to 1.1.1.

### Notes
- Admin features are visible only to users with the `admin` role.
