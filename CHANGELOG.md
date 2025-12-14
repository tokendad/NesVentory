# Changelog

All notable changes to this project will be documented in this file.






## [5.2.0] - 2025-12-14
### Added
## [5.1.0] - 2025-12-11
### Added
## [5.0.0] - 2025-12-02
### Major UI Redesign
This is a major release with a complete redesign of the user interface.

#### Added
- **New Unified Inventory Page** - Merged Dashboard, Items, and Locations into a single comprehensive view
  - Stats section showing Total Items, Locations, and System Status
  - Interactive Locations browser with dynamic location selection
  - Settings icon on location bubbles for quick editing
  - Items list filtered by selected location
  - Configurable item display count (10, 25, 50, 100, All)
  - Customizable column selection for items table
  - Items now clickable to view details (preview removed)

- **Redesigned Sidebar Navigation**
  - 📦 Inventory - New unified inventory page (replaces Dashboard, Items, Locations)
  - 👤 User Settings - Dedicated user settings page
  - 📅 Maintenance Calendar - Monthly calendar view (settings coming in future release)
  - ⚙️ System Settings - Consolidated Theme, Locale & Currency, and Service Status
  - 🔐 Admin - Admin section (shown only for admin users)
  - Logout button moved to bottom of sidebar
  - Removed locations tree from sidebar

- **Enhanced Header**
  - NesVentory logo and name prominently displayed
  - Global search functionality for items
  - Cleaner, more streamlined design

- **Footer**
  - Version display on all pages
  - Link to GitHub repository

- **New Components**
  - Calendar component for maintenance scheduling
  - SystemSettings component with tabbed interface
  - InventoryPage component for unified inventory view

#### Changed
- Updated navigation structure with emoji icons for better visual clarity
- Moved Theme and Locale settings to System Settings page
- Removed theme/locale icons from header
- Enhanced mobile responsiveness across all new views
- Updated version to 5.0.0

#### Removed
- Separate Dashboard, Items, and Locations pages (merged into Inventory)
- Separate Status page (moved to System Settings)
- Locations tree from sidebar
- Theme and Locale buttons from header


## [4.8.1] - 2025-12-04
### Added
- New video upload feature

### Changed
- Downgraded Python version from 3.14 to 3.11
- Upgraded React from 19.2.0 to 19.2.1
- Upgraded FastAPI from 0.123.3 to 0.123.7
## [4.8.0] - 2025-12-02
### Added
- Upgraded dependencies,  added docker compose
## [4.7.2] - 2025-12-02
### Fixed
- Fixed hanging docker build
## [4.7.1] - 2025-12-02
### Fixed
- Woops wrong version
## [.1.0] - 2025-12-02
### Added
- Added AWS,  fixed docker stall
## [4.5.0] - 2025-12-01
### Fixed
- **Docker Container Stability** - Fixed container freeze after database initialization
  - Changed Python base image from `python:3.14-slim` (alpha) to `python:3.12-slim` (stable)
  - Fixed enum class inheritance in models.py to use Python's `enum.Enum` instead of SQLAlchemy's `Enum`
  - Corrected `UserRole`, `LocationType`, and `RecurrenceType` enum definitions

### Changed
- **GitHub Actions Labeler** - Fixed labeler.yml configuration
  - Moved labeler configuration to correct location at `.github/labeler.yml`
  - Removed duplicate workflow file
- Bumped project version to 4.5.0

## [4.4.0] - 2025-11-29
### Added
- **Tabbed Edit Item Interface** - Reorganized item form with tabs for better UX on web browsers
  - **Basic Info Tab**: Name, brand, serial, model, retailer, purchase price, purchase date, primary photo, location
  - **Warranty Tab**: Warranty provider, policy number, duration, expiration, notes, and warranty photos
  - **Media Tab**: All photos including data tag, receipts, warranty documents, and additional photos
  - Tabs only shown for non-living items; living items retain scroll layout
  
- **Enhanced Warranty Management** - Full CRUD support for item warranties
  - Add multiple manufacturer and extended warranties per item
  - Track warranty provider/company name
  - Track policy/contract numbers
  - Set warranty duration in months
  - Set warranty expiration date
  - Add notes for contact info and additional details
  - Upload warranty document photos in dedicated section
  
- **AI Scan Button Consistency** - AI scan options on all supported fields
  - AI Scan button on UPC/Barcode field for product lookup
  - AI Scan button on Data Tag photo upload for field extraction
  - Consistent emoji-based button styling across AI features

### Changed
- Widened modal dialog for tabbed interface (900px max-width)
- Reorganized photo uploads across tabs for better workflow
- Updated help text to reflect AI scan functionality
- Bumped project version to 4.4.0

## [4.3.0] - 2025-11-28
### Added
- **Gemini API Quota Handling** - Gracefully handle rate limits on free tier
  - Detect quota exceeded errors and continue imports without AI assistance
  - Show user-friendly warning when rate limits are reached
  - Items imported without AI can be enriched later using the new enrichment feature
  
- **AI Request Throttling** - Avoid hitting rate limits on free tier
  - Configurable delay between AI requests (default: 4 seconds)
  - New `GEMINI_REQUEST_DELAY` environment variable to customize throttle delay
  - Processing time warning for large inventories on free tier
  
- **Enrich from Data Tags Feature** - New helper to fill in missing item details
  - New `/api/ai/enrich-from-data-tags` endpoint
  - Scans items with data tag photos and extracts brand, model, serial, and estimated value
  - Useful for completing items that were imported without AI due to quota limits
  - Added "Enrich from Data Tags" button in User Settings under AI section
  
- **Improved Import Flow** - Better feedback when quota is exceeded during imports
  - Continue importing items using XLSX data when AI quota is reached
  - Show quota warning in import results with tip to use enrichment feature later
  - Log entries highlight quota-related issues with warning icon

### Changed
- Updated AI valuation to handle quota errors gracefully and report partial progress
- Enhanced encircle import to continue without AI when quota is exceeded
- Added processing time warnings for operations on large inventories
- Bumped project version to 4.3.0

## [4.2.0] - 2025-11-28
### Added
- **QR Code Label Printing for Locations** - Print QR code labels to affix to boxes, bins, and containers
  - New "📱 QR" button on each location card for easy access to print QR labels
  - QR codes link to the location page, displaying items when scanned
  - Support for multiple label sizes: 2"x1", 2"x2", 4"x2", 4"x3", 4"x6"
  - Designed for thermal label printers (Dymo, Brother, Zebra, etc.)
  - Optional item list printed on the label showing container contents
  - Seasonal holiday icons for decoration (Christmas, Halloween, Easter, etc.)
  
- **Container Location Type** - New `is_container` field for locations
  - Mark locations as containers (boxes, bins, cases) for storing multiple items
  - Visual "BOX" badge on container locations in the UI
  - Form checkbox to designate a location as a container
  - Container flag appears on QR labels when enabled

### Changed
- Updated Location model and API schemas to support `is_container` field
- Added `qrcode` npm package for QR code generation
- Bumped project version to 4.2.0

### Planned
- Android app support for scanning QR codes and viewing container contents

## [4.1.0] - 2025-11-28
### Added
- **Short Username Login Support** - Allow users to login with just their username instead of full email
  - Users can now login with just "admin" instead of "admin@nesventory.local"
  - Backend matches usernames by finding emails that start with "username@"
  - Full email login still works for backward compatibility
  - Updated login form to accept both username and email formats

### Changed
- Updated login form label from "Email" to "Username or Email"
- Added placeholder text showing example formats
- Bumped project version to 4.1.0

## [4.0.0] - 2025-11-26
### Added - Major Public Release
This version marks the public release of NesVentory with comprehensive features and security improvements.

- **AI Features** (Google Gemini Powered)
  - AI Photo Detection - Scan rooms to detect and inventory items automatically
  - AI Data Tag Parsing - Extract product information from data tag photos
  - AI Value Estimation - Get estimated values with source tracking

- **User Experience Enhancements**
  - Logo and branding support - Customizable application branding
  - Theme and color support - User preference settings for themes
  - Hierarchical location browser - Interactive clickable navigation
  - Bulk item actions - Multi-select with left-aligned action bars

- **Authentication & Security**
  - Google OAuth SSO - Sign in with Google for easy authentication
  - Admin user creation and approval workflow
  - Enhanced location-based access control

- **Data Import**
  - Enhanced Encircle XLSX import with locations and sublocations support

### Changed
- Bumped project version to 4.0.0 for public release
- Updated documentation for public release

### Security
- Reviewed codebase for private information and hardcoded paths
- Updated dependencies and checked for known vulnerabilities

## [3.2.0] - 2025-11-26
### Added
- **AI Data Tag Parsing** - New feature to extract item information from data tags using AI
  - New `/api/ai/parse-data-tag` endpoint for AI-powered data tag image analysis
  - Extracts manufacturer, brand, model number, serial number, and production date from data tag photos
  - "🤖 AI Scan" button in ItemForm next to data tag photo upload (only shown when AI is configured)
  - Camera capture support on mobile devices for easy data tag scanning
  - Scan results display with option to apply extracted data to form fields
  - Automatically adds scanned image as the data tag photo
  - Extracts additional product information like voltage, wattage, certifications, and country of origin

### Changed
- Bumped project version to 3.2.0

## [3.1.0] - 2025-11-26
### Added
- **Enhanced Encircle XLSX Import** with Locations and SubLocations support
  - Parent location extraction from merged cell E1-G3 in the file header (e.g., "Maine Cottage")
  - Sub-location (room) parsing from rows in the XLSX file (e.g., "Bedroom - Master", "Bedroom")
  - Hierarchical location structure: Parent location → Sub-locations/Rooms → Items
  - New `/api/import/encircle/preview` endpoint to preview parent location from file before import
  - Option to select an existing parent location instead of creating new
  - Additional item fields imported:
    - Brand, Model, Serial number
    - Quantity, Retailer
    - Purchase date, Purchase price
    - Estimated value (from RCV column)
    - Warranty duration, Extended warranty policy, Warranty phone
  - Warranty information stored in item warranties JSON field
- **Improved Encircle Import UI**
  - File preview shows detected parent location name before import
  - Dropdown to select existing parent location or create new from file
  - Enhanced import statistics showing parent locations and rooms created
  - Updated step-by-step import wizard

### Changed
- Bumped project version to 3.1.0

## [3.0.0] - 2025-11-25
### Added
- **AI Photo Detection** - Major new feature for automatic item detection from photos
  - New `/api/ai/detect-items` endpoint for AI-powered image analysis
  - Uses Google Gemini API for advanced object recognition
  - Detects household items, furniture, electronics, and other inventory-worthy objects
  - Returns item names, descriptions, brands, and estimated values
  - New `/api/ai/status` endpoint to check if AI feature is configured
  - New `AIDetection` component in frontend with photo upload/capture
  - "📷 AI Scan" button in Items view for quick room scanning
  - Ability to select detected items and add them to inventory in bulk
  - Optional location assignment for detected items
  - Support for camera capture on mobile devices (`capture="environment"`)
- **Configuration for AI detection**:
  - `GEMINI_API_KEY` environment variable for Google Gemini API authentication
  - `GEMINI_MODEL` environment variable to select Gemini model (default: gemini-2.0-flash)
- Added `google-generativeai` Python package for Gemini integration

### Changed
- Bumped project version to 3.0.0 (major version bump for significant new feature)

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
