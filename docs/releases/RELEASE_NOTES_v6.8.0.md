# NesVentory v6.8.0

Release tag: https://github.com/tokendad/NesVentory/releases/tag/v6.8.0

## Summary
Enhanced label printing with system printer (CUPS) support, improved discoverability, and item-level QR labels. Addresses Issue #464.

## Features

### System Printer (CUPS) Integration
- **Print to any system printer** - Connect NesVentory to printers configured on your host via CUPS
- **New connection type** - Added "System Printer (CUPS)" option alongside NIIMBOT, Bluetooth, and USB
- **Auto-discovery** - Automatically detects available printers from CUPS
- **Docker support** - Mount CUPS socket to enable printing from containers

### Item Label Printing
- **Print labels for individual items** - New "🖨️ Print Label" button on Item Details page
- **Direct access** - No need to navigate to location first
- **QR codes link to item** - Scan to view item details instantly

### Improved Discoverability (Issue #464)
- **First-time user guidance** - Helpful tip shown to new users about print functionality
- **Visible print buttons** - Print options now prominently displayed in the UI
- **Print preferences remembered** - Connection type and settings saved between sessions

### Documentation
- **Windows LPD Printing Guide** - Step-by-step instructions for printing from Docker to Windows printers

## Technical Changes

### Backend
- New `system_printer_service.py` for CUPS integration
- New API endpoints:
  - `GET /api/printer/system/available` - Check if CUPS is available
  - `GET /api/printer/system/printers` - List available printers
  - `POST /api/printer/system/print-location` - Print location label
  - `POST /api/printer/system/print-item` - Print item label
- Added `pycups>=2.0.1` dependency
- Added `libcups2-dev` to Dockerfile

### Frontend
- Updated `QRLabelPrint.tsx` with system printer support and item printing
- Added print button to `ItemDetails.tsx`
- Added guidance tip to `LocationsPage.tsx`
- New API functions in `api.ts` for system printer operations
- Print preferences persisted to localStorage

### Docker
- CUPS socket mount option in docker-compose.yml
- Document URL validation configuration options

## Bug Fixes
- None

## Dependencies Updated
- react: 19.2.3 → 19.2.4 (DoS mitigations)
- react-dom: 19.2.3 → 19.2.4
- python-multipart: 0.0.21 → 0.0.22 (security fix)
- sqlalchemy: 2.0.45 → 2.0.46
- google-auth-oauthlib: 1.2.3 → 1.2.4
