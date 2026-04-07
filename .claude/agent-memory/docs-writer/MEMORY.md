# Docs-Writer Agent Memory

## Project Structure
- **Backend:** FastAPI at `backend/app/` with routers in `backend/app/routers/`
- **Frontend:** React + TypeScript at `src/components/`
- **Docs:** `docs/` with subdirs: Guides, NIIMBOT, Phase Documents, Mobile Conversion, releases
- **Existing guides:** CSV_IMPORT.md, INSURANCE_TAB_GUIDE.md, PLUGINS.md, API_ENDPOINTS.md (large)

## Key Codebase Facts
- `AdminPage.tsx` is 4,114 lines with tabs: users, logs, server, ai-settings, plugins, status, custom-fields
- `UserSettings.tsx` tabs: profile, api, stats, appearance, locale, printer
- User roles: admin, editor, viewer (enum in `backend/app/models.py:60`)
- Maintenance recurrence types: none, daily, weekly, bi_weekly, monthly, bi_monthly, yearly, custom_days
- InsuranceInfo stored as JSON in Location model's `insurance_info` field
- Insurance tab only visible for primary locations (is_primary_location flag)
- GDrive uses Google OAuth code exchange, scope: `drive.file`
- Web auth: HttpOnly cookies + JWT (jose HS256); backend also accepts `Authorization: Bearer` header
- API client: `src/lib/api.ts` ~2,694 lines, 150+ functions, pure `fetch()`
- No state mgmt lib — pure `useState` in App.tsx with prop drilling
- Theme: 3 modes (system/dark/light), 6 palettes (blue/green/red/purple/orange/teal), 18 CSS vars
- 401 handling: `window.dispatchEvent(new Event("auth:unauthorized"))` → App.tsx listener
- Auth status endpoints (no auth): `/api/auth/google/status`, `/api/auth/oidc/status`, `/api/auth/registration/status`
- localStorage keys: NesVentory_currentUser, _user_email, _theme, _locale, _itemColumns, _CustomFieldsTemplate, _printPrefs, _printTipSeen

## Documentation Conventions
- Existing guides use `#` title, `##` sections, `###` subsections
- Code blocks specify language (```typescript, ```bash, etc.)
- Tables used for comparisons, field specs, and option listings
- Troubleshooting sections in guides are detailed with curl commands
- Version history included in feature guides (e.g., Insurance Tab Guide)

## Mobile Conversion Docs
- Located in `docs/Mobile Conversion/`
- Phase numbering: 01-XX, 02-XX, 03-XX, 04-Advanced-Features, 05-XX
- Phase 4 covers: CSV import, Encircle import, maintenance/calendar, media mgmt, admin panel, user settings, insurance, GDrive backup, push notifications
- Phase 5: NIIMBOT Printer Integration (05-Printer-Integration.md, 1,194 lines)
- Cross-references use relative links: `./03-Item-Detail-Media.md`
- `02-Core-Inventory.md` (2,323 lines): Items/Locations/Tags screens, bulk ops, search/filter, offline
- Key mobile patterns: useReducer form context, FlatList w/ getItemLayout, expo-image-picker, bottom-sheet pickers
- ItemForm decomposition: 30+ useState → useReducer context + 7 section components + shared context
- Constants: RETAILERS (102 entries), BRANDS (100 entries) in `src/lib/constants.ts`
- Photo types: DEFAULT, DATA_TAG, RECEIPT, WARRANTY, OPTIONAL, PROFILE
- Bulk ops API: bulk-delete, bulk-update-tags (replace/add/remove modes), bulk-update-location

## NIIMBOT Printer Details (for future reference)
- Service UUID: `e7810a71-73ae-499d-8c15-faa9aef0c3f2` / Char UUID: `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f`
- Packet format: 0x5555 header, type(1B), len(1B), data(N), XOR checksum(1B), 0xAAAA footer
- Protocol variants: V5 (D11-H, D101, D110, B21, etc.), B1 classic, legacy
- Print directions: `left` (D-series → +90° rotation) and `top` (B-series → no rotation)
- B-series printers use INVERTED heartbeat status values (closingstate, paperstate)
- Backend transports: BleakTransport, SerialTransport (115200 baud), RfcommTransport
- Web connection types: bluetooth, usb, server, system (CUPS)
- PRINTER_MODELS dict in `printer_service.py` (lines 122-132): width/height px, DPI, direction
- DENSITY_LIMITS per model in `printer_service.py` (lines 149-159)
- MAX_LABEL_MM per model in `printer_service.py` (lines 136-146)
