# NesVentory API Contract

This document describes the REST API contract between the NesVentory server and its consumers — primarily the **[NesVentory Android App](https://github.com/tokendad/NesventoryApp)**.

The server auto-generates a live OpenAPI spec at **`/api/openapi.json`** (also browsable at `/api/docs`). This document captures the **change history** and **breaking-change policy** that the spec alone doesn't convey.

---

## Base URL

All API endpoints are prefixed with `/api/`. The app should let users configure the server's base URL (e.g., `https://nesventory.example.com`).

## Authentication

All protected endpoints require either:
- **Cookie**: `access_token` (HttpOnly, set by `/api/auth/login`)
- **Header**: `X-API-Key: <key>` (generated in user settings)

The API key approach is recommended for the mobile app.

---

## Core Resources

### Items — `GET /api/items/`

Each item object includes these fields. Fields marked ⚠️ were added after the initial release — handle their absence gracefully (treat as `null`/empty).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `name` | string | |
| `description` | string \| null | |
| `brand` | string \| null | |
| `model_number` | string \| null | |
| `serial_number` | string \| null | |
| `purchase_date` | date string \| null | ISO 8601 `YYYY-MM-DD` |
| `purchase_price` | decimal string \| null | |
| `estimated_value` | decimal string \| null | |
| `retailer` | string \| null | |
| `upc` | string \| null | |
| `location_id` | UUID string \| null | |
| `is_living` | boolean | `true` for people/pets/plants |
| `birthdate` | date string \| null | living items only |
| `relationship_type` | string \| null | living items only |
| `contact_info` | object \| null | living items only |
| `additional_info` | array \| null | custom key/value fields |
| `warranties` | array \| null | ⚠️ see Warranty Object below |
| `tags` | array of Tag | |
| `photos` | array of Photo | |
| `created_at` | datetime string | ISO 8601 |
| `updated_at` | datetime string | ISO 8601 |

#### Warranty Object

Each entry in `warranties` has:

| Field | Type | Notes |
|---|---|---|
| `type` | `"manufacturer"` \| `"extended"` \| `"accidental_damage"` \| `"other"` | |
| `provider` | string \| null | e.g. `"Samsung"`, `"SquareTrade"` |
| `policy_number` | string \| null | |
| `duration_months` | integer \| null | |
| `expiration_date` | date string \| null | `YYYY-MM-DD` |
| `notes` | string \| null | |

---

### Locations — `GET /api/locations/`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `name` | string | |
| `parent_id` | UUID string \| null | |
| `full_path` | string \| null | e.g. `"House / Living Room"` |
| `is_primary_location` | boolean | |
| `is_container` | boolean | `true` for boxes, bins, drawers |
| `location_category` | string \| null | |
| `friendly_name` | string \| null | |
| `description` | string \| null | |
| `address` | string \| null | |
| `owner_info` | object \| null | |
| `insurance_info` | object \| null | |
| `paint_info` | array \| null | ⚠️ see Paint Entry below |
| `estimated_property_value` | decimal string \| null | |
| `location_photos` | array of LocationPhoto | |
| `created_at` | datetime string | ISO 8601 |
| `updated_at` | datetime string | ISO 8601 |

#### Paint Entry Object

Each entry in `paint_info` has:

| Field | Type | Notes |
|---|---|---|
| `id` | string | client-generated UUID |
| `room` | string \| null | e.g. `"Bedroom"` |
| `vendor` | string \| null | e.g. `"Sherwin-Williams"` |
| `brand` | string \| null | |
| `color_name` | string \| null | |
| `color_code` | string \| null | e.g. `"SW 7015"` |
| `hex_color` | string \| null | e.g. `"#A3B1A8"` |
| `finish` | string \| null | e.g. `"Eggshell"` |
| `notes` | string \| null | |
| `photo_id` | string \| null | references a location photo |

---

### Photos — `GET /api/photos/{item_id}`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `item_id` | UUID string | |
| `path` | string | relative URL, prefix with server base URL |
| `is_primary` | boolean | |
| `photo_type` | string \| null | see Photo Types below |
| `uploaded_at` | datetime string | |

**Photo types:** `default`, `data_tag`, `receipt`, `warranty`, `optional`, `profile`

---

## Key Endpoints

```
GET    /api/items/                   List all items (paginated)
POST   /api/items/                   Create item
GET    /api/items/{id}               Get single item
PUT    /api/items/{id}               Full update
PATCH  /api/items/{id}               Partial update
DELETE /api/items/{id}               Delete item

GET    /api/locations/               List all locations
POST   /api/locations/               Create location
GET    /api/locations/{id}           Get single location
PUT    /api/locations/{id}           Update location
DELETE /api/locations/{id}           Delete location

POST   /api/auth/login               Login (returns HttpOnly cookie)
POST   /api/auth/logout              Logout
GET    /api/users/me                 Current user info

GET    /api/photos/{item_id}         Photos for an item
POST   /api/photos/{item_id}         Upload photo
DELETE /api/photos/{photo_id}        Delete photo

GET    /api/maintenance/{item_id}    Maintenance tasks for item
POST   /api/maintenance/             Create maintenance task
PUT    /api/maintenance/{id}         Update task
DELETE /api/maintenance/{id}         Delete task

GET    /api/tags/                    All tags
POST   /api/items/{id}/tags          Add tag to item

POST   /api/ai/detect-items          Room scan (AI item detection)
POST   /api/ai/enrich-from-data-tags Parse data tag photo
POST   /api/ai/barcode-lookup        UPC barcode lookup

GET    /api/printer/system/printers  List CUPS printers
POST   /api/printer/print            Print label (NIIMBOT or CUPS)
```

See `/api/openapi.json` for the full list with request/response schemas.

---

## Breaking Change Policy

**A breaking change is any modification that would cause an existing mobile app version to fail or silently misbehave**, including:

- Removing a field from a response
- Renaming a field
- Changing a field's type
- Removing or renaming an endpoint
- Changing authentication behaviour

**Non-breaking changes** (additive) include:

- New optional fields in a response object
- New endpoints
- New optional query parameters

### When breaking changes happen

1. A **`## API Changes`** section is added to the relevant version entry in `CHANGELOG.md`
2. A new row is added to the [Change Log](#change-log) table below
3. An issue is opened in [NesventoryApp](https://github.com/tokendad/NesventoryApp/issues) linking to the changelog entry

---

## Change Log

| Version | Date | Type | Description |
|---|---|---|---|
| 6.14.0 | 2026-04-06 | additive | `warranties` array field added to `Item` response. Each entry has `type`, `provider`, `policy_number`, `duration_months`, `expiration_date`, `notes`. |
| 6.14.0 | 2026-04-06 | additive | `paint_info` array field added to `Location` response. Each entry has `id`, `room`, `vendor`, `brand`, `color_name`, `color_code`, `hex_color`, `finish`, `notes`, `photo_id`. |
| 6.x | prior | additive | `gdrive_*` fields added to User object (`gdrive_refresh_token` server-side only; `gdrive_last_backup` exposed in `/gdrive/status`). |
| 6.8.0 | 2026-01-29 | additive | CUPS system printer endpoints added under `/api/printer/system/*`. |
| 6.7.0 | prior | additive | `location_category` field added to Location. |

> Older history not recorded. Document starts from v6.14.0.
