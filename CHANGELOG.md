# Changelog

All notable changes to this project will be documented in this file.

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
