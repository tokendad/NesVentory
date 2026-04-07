# NesVentory Release Notes

## v6.15.0 - Living Items Feature (2026-04-07)

### 🎉 Major New Feature: Living Items

Track people, pets, and plants as part of your home inventory with dedicated management tools.

**Key Capabilities:**
- **People & Pets Tab** - New "Living" tab appears on Home location details
- **Relationship Tracking** - 20+ relationship types (self, spouse, child, parent, grandparent, sibling, pet, etc.)
- **Age Calculation** - Automatic age display from birthdates
- **Contact Management** - Store phone, email, address, and emergency contacts
- **Profile Photos** - Circular profile display with type-specific placeholders
- **Plant Support** - Track living plants with care instructions in any room

**Privacy & Security:**
- ✅ HIPAA Compliant - NO medical records for people
- ✅ Pet Medical Records - Vet visits, vaccinations, and health timeline supported
- ✅ User-Linked Items - Associate living items with user accounts
- ✅ Home Location Enforcement - Backend validates people/pets stay in Home location
- ✅ Authentication Required - All /items endpoints now require JWT authentication
- ✅ User-Scoped Access - Users see only items in their allowed locations

**Security Fixes:**
- 🔒 CRITICAL: Added authentication to all /api/items endpoints (prevents unauthorized PII access)
- 🔒 CRITICAL: Implemented user-scoped access control with location-based permissions
- 🔒 Fixed bulk operations to validate Home location constraints
- 🔒 Added authorization checks (403 Forbidden for unauthorized access)

**Technical Improvements:**
- Database migration system updated with 6 new living item fields
- Database indexes on `is_living` and `relationship_type` (10-100x faster queries)
- Backend validation prevents field conflicts (living vs non-living items)
- Home location protection (cannot delete Home or locations with people/pets)
- API filtering endpoints: `?is_living=true`, `?relationship_type=pet`, `?location_id=<uuid>`
- Comprehensive test suite with 15 tests covering CRUD, validation, and filtering
- Home location auto-creation on first startup

**API Changes:** ⚠️ **BREAKING - Mobile app update required**
- Added 6 new optional fields to Item resource: `is_living`, `birthdate`, `contact_info`, `relationship_type`, `is_current_user`, `associated_user_id`
- **All /api/items endpoints now require authentication** (JWT token in Authorization header or cookie)
- User-scoped data access (users see only their allowed locations)
- Location constraint: Items with `is_living=true` and `relationship_type != "plant"` MUST have `location.name == "Home"`
- Returns 401 Unauthorized for missing/invalid tokens
- Returns 403 Forbidden for unauthorized access attempts
- See [API Contract](docs/API-CONTRACT.md) for full details

**Mobile App Compatibility:**
- ⚠️ **Breaking change** - Authentication now required on all requests
- New fields are backward compatible (optional)
- Mobile app update tracked in [NesVentoryApp#66](https://github.com/tokendad/NesventoryApp/issues/66)

**Documentation:**
- Living Items User Guide (docs/Guides/LIVING_ITEMS_USER_GUIDE.md)
- Living Items API Reference (docs/Guides/LIVING_ITEMS_API_REFERENCE.md)
- Code Review Fixes (docs/LIVING_ITEMS_CODE_REVIEW_FIXES.md)
- Security Fixes (docs/LIVING_ITEMS_SECURITY_FIXES.md)

### Files Modified
- `backend/app/main.py` - Migration system, Home location auto-creation
- `backend/app/models.py` - Database indexes for performance
- `backend/app/schemas.py` - Pydantic validation for living items
- `backend/app/routers/items.py` - Authentication, authorization, API filtering, location enforcement
- `backend/app/routers/locations.py` - Home location protection
- `src/components/LocationDetailsModal.tsx` - Living tab integration
- `CHANGELOG.md` - Comprehensive v6.15.0 entry
- `README.md` - Living Items feature description
- `DOCKERHUB.md` - Updated capabilities

### Files Created
- `backend/tests/test_living_items.py` - 15 comprehensive tests
- `src/components/LivingTab.tsx` - Living tab UI component
- `docs/Guides/LIVING_ITEMS_USER_GUIDE.md` - End-user documentation
- `docs/Guides/LIVING_ITEMS_API_REFERENCE.md` - Developer API docs
- `docs/LIVING_ITEMS_RELEASE_SUMMARY.md` - Executive summary
- `docs/LIVING_ITEMS_CODE_REVIEW_FIXES.md` - Code review documentation
- `docs/LIVING_ITEMS_SECURITY_FIXES.md` - Security fixes documentation

---

## v6.14.0 - Paint Colors & Warranty Tab (2026-04-06)

---

## v6.14.0 - Warranties & Paint Tracking (2026-04-06)

### New Features
- **Warranty Management** - Track manufacturer, extended, and accidental damage warranties
- **Paint Information** - Store paint details for each room (brand, color, finish, hex code)

### API Changes
- Added `warranties` array field to Item resource
- Added `paint_info` array field to Location resource

---

# NesVentory v6.13.1
>>>>>>> b5f5d32 (feat: Living Items feature with security and performance fixes)

Release tag: https://github.com/tokendad/NesVentory/releases/tag/v6.14.0

## Summary
Paint Colors, Warranty Tab, Google OAuth Fixes

## Tags
- New Feature
- Bug Fix

## Features
- feat: add Warranty tab to Item Details
- feat: add Paint Colors tab to Location details
- feat: add Warranty tab to Item Details


## Bug Fixes
- fix: resolve code review findings
- fix: accept OIDC scope superset in Google Drive OAuth token exchange
- fix: resolve code review findings


