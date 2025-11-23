# Changelog

All notable changes to this project will be documented in this file.

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
