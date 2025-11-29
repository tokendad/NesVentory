# NesVentory v4.4.0 - Tabbed Edit Item Interface

## Overview

Version 4.4.0 introduces a redesigned Edit Item interface with a tabbed layout for better organization of item information, warranty management, and media uploads on web browsers.

## Major Features

### Tabbed Edit Item Interface
- **Basic Info Tab** - Core item details
  - Name, description, brand, model number, serial number
  - UPC/Barcode with AI Scan lookup button
  - Purchase date, retailer, purchase price, estimated value
  - Primary photo upload
  - Location selection (hierarchical)
  
- **Warranty Tab** - Complete warranty management
  - Add manufacturer warranties
  - Add extended warranties
  - Track provider/company, policy number
  - Set duration (months) and expiration date
  - Notes field for phone numbers and contact info
  - Upload warranty document photos
  
- **Media Tab** - All photo management
  - Primary/default photo
  - Data tag photo with AI Scan button
  - Receipt photos
  - Warranty document photos
  - Additional/optional photos

### AI Scan Integration
- AI Scan button on UPC/Barcode field for automatic product lookup
- AI Scan button on Data Tag photo for automatic field extraction
- Consistent styling with robot emoji (🤖) across all AI features

### Enhanced Warranty Management
- Support for multiple warranties per item
- Separate manufacturer and extended warranty types
- Full fields: provider, policy number, duration, expiration, notes
- Dedicated warranty photo section

## UI/UX Improvements

- Wider modal dialog (900px) for better form layout
- Tab navigation with visual active state
- Responsive design maintains usability on smaller screens
- Living items retain traditional scroll layout (tabs only for non-living items)

## Recent Features from v4.3.0

- Gemini API quota handling with graceful fallback
- AI request throttling for free tier users
- Enrich from Data Tags feature for batch AI processing
- Improved import flow with quota exceeded warnings

## Technical Details

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite (embedded, file-based)
- **Container**: Single unified Docker container
- **AI**: Google Gemini API integration

## Breaking Changes

None - This release is backward compatible with v4.x data.

## Migration Notes

For users upgrading from v4.3.x:
1. Update your Docker image to v4.4.0
2. No database migration required
3. Existing data and warranties will be preserved

## Documentation

- Updated README.md with v4.4.0 features
- Updated CHANGELOG.md with detailed changes
- Updated RELEASE_NOTES.md

---

See complete PRs: https://github.com/tokendad/NesVentory/pulls?state=closed&sort=updated&direction=desc