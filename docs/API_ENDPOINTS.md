# NesVentory API Documentation

This document provides comprehensive documentation for all API endpoints in the NesVentory application.

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Items](#items)
- [Locations](#locations)
- [Photos](#photos)
- [Documents](#documents)
- [Videos](#videos)
- [Tags](#tags)
- [Maintenance Tasks](#maintenance-tasks)
- [AI/ML Features](#aiml-features)
- [Google Drive Integration](#google-drive-integration)
- [Encircle Export](#encircle-export)
- [CSV Import](#csv-import)
- [Media Management](#media-management)
- [Plugins](#plugins)
- [Logs](#logs)
- [System Status](#system-status)

## Base URL

All API endpoints are prefixed with `/api` unless otherwise specified.

Example: `http://localhost:8000/api/items`

## Authentication

NesVentory uses JWT (JSON Web Token) based authentication. Most endpoints require authentication via Bearer token.

### Login (Password-based)

#### POST /api/token

OAuth2-compatible token login endpoint.

**Request:**
```json
{
  "username": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "must_change_password": false
}
```

**Note:** There's also a root-level `POST /token` endpoint (without `/api` prefix) for backward compatibility with mobile apps.

### Login (Google OAuth)

#### POST /api/auth/google

Authenticate or register a user with Google OAuth.

**Request:**
```json
{
  "credential": "google_jwt_token"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "is_new_user": false
}
```

### Check Google OAuth Status

#### GET /api/auth/google/status

Check if Google OAuth is enabled.

**Response:**
```json
{
  "enabled": true,
  "client_id": "your-google-client-id"
}
```

### Check Registration Status

#### GET /api/auth/registration/status

Check if new user registration is enabled.

**Response:**
```json
{
  "enabled": true
}
```

## Users

All user endpoints require authentication. Admin-only endpoints are marked.

### Register New User

#### POST /api/users

Register a new user (if registration is enabled).

**Request:**
```json
{
  "email": "newuser@example.com",
  "full_name": "John Doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "full_name": "John Doe",
  "role": "viewer",
  "is_approved": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Create User (Admin)

#### POST /api/users/admin

**Admin only.** Create a new user with custom role and approval status.

**Request:**
```json
{
  "email": "admin@example.com",
  "full_name": "Admin User",
  "password": "temppassword",
  "role": "admin",
  "is_approved": true,
  "require_password_change": false
}
```

### List All Users

#### GET /api/users

**Admin only.** List all users in the system.

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "viewer",
    "is_approved": true,
    "allowed_location_ids": [],
    "api_key": "64-char-hex-string",
    "ai_schedule_enabled": false,
    "ai_schedule_interval_days": 7
  }
]
```

### Get Current User Profile

#### GET /api/users/me

Get profile for the currently authenticated user.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "viewer",
  "is_approved": true,
  "allowed_location_ids": [],
  "api_key": null,
  "ai_schedule_enabled": false,
  "ai_schedule_interval_days": 7,
  "upc_databases": [],
  "ai_providers": []
}
```

### Update User

#### PATCH /api/users/{user_id}

Update a user's profile. Admins can update any user; non-admins can only update themselves.

**Request:**
```json
{
  "full_name": "Jane Doe",
  "password": "newpassword123",
  "role": "editor"
}
```

### Delete User

#### DELETE /api/users/{user_id}

**Admin only.** Delete a user. Admins cannot delete themselves.

### Update User Location Access

#### PUT /api/users/{user_id}/locations

**Admin only.** Set which locations a user can access.

**Request:**
```json
{
  "location_ids": ["uuid1", "uuid2"]
}
```

### Get User Location Access

#### GET /api/users/{user_id}/locations

Get a user's accessible locations. Empty list means access to all locations.

### Generate API Key

#### POST /api/users/me/api-key

Generate or regenerate the API key for the current user.

### Revoke API Key

#### DELETE /api/users/me/api-key

Revoke the API key for the current user.

### Set Password on Login

#### POST /api/users/me/set-password

Set password for users created with `require_password_change` flag.

**Request:**
```json
{
  "new_password": "mynewpassword123"
}
```

### Get AI Schedule Settings

#### GET /api/users/me/ai-schedule

Get AI valuation schedule settings for the current user.

**Response:**
```json
{
  "ai_schedule_enabled": false,
  "ai_schedule_interval_days": 7
}
```

### Update AI Schedule Settings

#### PUT /api/users/me/ai-schedule

Update AI valuation schedule settings.

**Request:**
```json
{
  "ai_schedule_enabled": true,
  "ai_schedule_interval_days": 14
}
```

### Get UPC Database Configuration

#### GET /api/users/me/upc-databases

Get UPC database configuration for the current user.

**Response:**
```json
{
  "upc_databases": [
    {
      "id": "upcitemdb",
      "enabled": true,
      "api_key": null
    }
  ]
}
```

### Update UPC Database Configuration

#### PUT /api/users/me/upc-databases

Update UPC database configuration.

**Request:**
```json
{
  "upc_databases": [
    {
      "id": "upcitemdb",
      "enabled": true,
      "api_key": "your-api-key"
    }
  ]
}
```

### Get AI Provider Configuration

#### GET /api/users/me/ai-providers

Get AI provider configuration for the current user.

**Response:**
```json
{
  "ai_providers": [
    {
      "id": "gemini",
      "enabled": true,
      "priority": 1,
      "api_key": null
    }
  ]
}
```

### Update AI Provider Configuration

#### PUT /api/users/me/ai-providers

Update AI provider configuration.

**Request:**
```json
{
  "ai_providers": [
    {
      "id": "gemini",
      "enabled": true,
      "priority": 1,
      "api_key": "your-gemini-api-key"
    }
  ]
}
```

## Items

Endpoints for managing inventory items.

### List All Items

#### GET /api/items

Get all items in the inventory.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Laptop",
    "description": "Dell XPS 15",
    "brand": "Dell",
    "model_number": "XPS-15-9510",
    "serial_number": "SN123456",
    "purchase_price": 1500.00,
    "purchase_date": "2023-01-15",
    "estimated_value": 1200.00,
    "location_id": "uuid",
    "photos": [],
    "documents": [],
    "tags": [],
    "created_at": "2023-01-15T10:00:00Z"
  }
]
```

### Create Item

#### POST /api/items

Create a new item.

**Request:**
```json
{
  "name": "Laptop",
  "description": "Dell XPS 15",
  "brand": "Dell",
  "model_number": "XPS-15-9510",
  "serial_number": "SN123456",
  "purchase_price": 1500.00,
  "purchase_date": "2023-01-15",
  "location_id": "uuid",
  "tag_ids": ["uuid1", "uuid2"]
}
```

### Get Item

#### GET /api/items/{item_id}

Get a specific item by ID.

### Update Item

#### PUT /api/items/{item_id}

Update an existing item.

**Request:**
```json
{
  "name": "Gaming Laptop",
  "description": "Updated description",
  "estimated_value": 1100.00,
  "tag_ids": ["uuid1"]
}
```

### Delete Item

#### DELETE /api/items/{item_id}

Delete an item.

### Bulk Delete Items

#### POST /api/items/bulk-delete

Delete multiple items at once.

**Request:**
```json
{
  "item_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "deleted_count": 3,
  "message": "Successfully deleted 3 item(s)"
}
```

### Bulk Update Tags

#### POST /api/items/bulk-update-tags

Update tags on multiple items at once.

**Request:**
```json
{
  "item_ids": ["uuid1", "uuid2"],
  "tag_ids": ["uuid3", "uuid4"],
  "mode": "add"
}
```

**Modes:**
- `add`: Add tags to existing tags
- `replace`: Replace all tags
- `remove`: Remove specified tags

**Response:**
```json
{
  "updated_count": 2,
  "message": "Successfully updated tags on 2 item(s)"
}
```

### Bulk Update Location

#### POST /api/items/bulk-update-location

Update location on multiple items at once.

**Request:**
```json
{
  "item_ids": ["uuid1", "uuid2"],
  "location_id": "uuid3"
}
```

**Response:**
```json
{
  "updated_count": 2,
  "message": "Successfully updated location on 2 item(s)"
}
```

### Enrich Item with AI

#### POST /api/items/{item_id}/enrich

Enrich an item's data using configured AI providers.

**Response:**
```json
{
  "item_id": "uuid",
  "enriched_data": [
    {
      "description": "Enhanced description of the item",
      "brand": "Dell",
      "model_number": "XPS-15-9510",
      "estimated_value": 1200.00,
      "estimated_value_ai_date": "01/15/24",
      "confidence": 0.85,
      "source": "Google Gemini AI"
    }
  ],
  "message": "Found 1 enrichment suggestion(s)"
}
```

## Locations

Endpoints for managing locations (rooms, areas).

### List All Locations

#### GET /api/locations

Get all locations.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Living Room",
    "description": "Main living area",
    "parent_id": null,
    "items": [],
    "photos": [],
    "videos": []
  }
]
```

### Create Location

#### POST /api/locations

Create a new location.

**Request:**
```json
{
  "name": "Living Room",
  "description": "Main living area",
  "parent_id": null
}
```

### Get Location

#### GET /api/locations/{location_id}

Get a specific location by ID.

### Update Location

#### PUT /api/locations/{location_id}

Update an existing location.

**Request:**
```json
{
  "name": "Master Bedroom",
  "description": "Updated description"
}
```

### Delete Location

#### DELETE /api/locations/{location_id}

Delete a location. Items and child locations are moved to the parent location.

## Photos

Endpoints for managing item photos.

### Upload Photo

#### POST /api/items/{item_id}/photos

Upload a photo for an item.

**Request:** (multipart/form-data)
- `file`: Image file (JPEG, PNG, GIF, WebP)
- `is_primary`: Boolean (default: false)
- `is_data_tag`: Boolean (default: false)
- `photo_type`: Optional string

**Response:**
```json
{
  "id": "uuid",
  "item_id": "uuid",
  "path": "/uploads/photos/uuid_timestamp.jpg",
  "mime_type": "image/jpeg",
  "is_primary": false,
  "is_data_tag": false,
  "photo_type": null,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get Photo

#### GET /api/items/{item_id}/photos/{photo_id}

Get details of a specific photo.

### Update Photo

#### PATCH /api/items/{item_id}/photos/{photo_id}

Update photo metadata.

**Request:**
```json
{
  "is_primary": true,
  "is_data_tag": false,
  "photo_type": "front",
  "item_id": "new-uuid"
}
```

### Delete Photo

#### DELETE /api/items/{item_id}/photos/{photo_id}

Delete a photo.

## Location Photos

Endpoints for managing location photos.

### Upload Location Photo

#### POST /api/locations/{location_id}/photos

Upload a photo for a location.

**Request:** (multipart/form-data)
- `file`: Image file
- `photo_type`: Optional string

### Delete Location Photo

#### DELETE /api/locations/{location_id}/photos/{photo_id}

Delete a location photo.

## Documents

Endpoints for managing item documents (PDFs, text files).

### Upload Document

#### POST /api/items/{item_id}/documents

Upload a document for an item.

**Request:** (multipart/form-data)
- `file`: PDF or TXT file
- `document_type`: Optional string (e.g., "manual", "receipt")

**Response:**
```json
{
  "id": "uuid",
  "item_id": "uuid",
  "filename": "manual.pdf",
  "path": "/uploads/documents/uuid_timestamp_manual.pdf",
  "mime_type": "application/pdf",
  "document_type": "manual",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Upload Document from URL

#### POST /api/items/{item_id}/documents/from-url

Upload a document from a URL.

**Request:** (form-data)
- `url`: URL to download document from
- `document_type`: Optional string

**Note:** URLs must be from allowed hosts (configured in ALLOWED_HOSTS).

### Delete Document

#### DELETE /api/items/{item_id}/documents/{document_id}

Delete a document.

## Videos

Endpoints for managing location videos.

### Upload Video

#### POST /api/locations/{location_id}/videos

Upload a video for a location.

**Request:** (multipart/form-data)
- `file`: Video file (MP4, MPEG, MOV, AVI, WebM)
- `video_type`: Optional string

**Response:**
```json
{
  "id": "uuid",
  "location_id": "uuid",
  "filename": "room_tour.mp4",
  "path": "/uploads/videos/uuid_timestamp_room_tour.mp4",
  "mime_type": "video/mp4",
  "video_type": null,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Delete Video

#### DELETE /api/locations/{location_id}/videos/{video_id}

Delete a video.

## Tags

Endpoints for managing tags.

### List All Tags

#### GET /api/tags

Get all tags (predefined and custom).

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Electronics",
    "is_predefined": true
  }
]
```

### Create Tag

#### POST /api/tags

Create a new custom tag.

**Request:**
```json
{
  "name": "Vintage",
  "is_predefined": false
}
```

### Get Tag

#### GET /api/tags/{tag_id}

Get a specific tag by ID.

### Delete Tag

#### DELETE /api/tags/{tag_id}

Delete a custom tag. Predefined tags cannot be deleted.

## Maintenance Tasks

Endpoints for managing maintenance tasks.

### Create Maintenance Task

#### POST /api/maintenance

Create a new maintenance task for an item.

**Request:**
```json
{
  "item_id": "uuid",
  "title": "Replace HVAC Filter",
  "description": "Change air filter",
  "due_date": "2024-03-01",
  "frequency": "quarterly",
  "color": "#FF5733"
}
```

### Get All Maintenance Tasks

#### GET /api/maintenance

Get all maintenance tasks (for calendar view).

### Get Maintenance Tasks for Item

#### GET /api/maintenance/item/{item_id}

Get all maintenance tasks for a specific item.

### Get Maintenance Task

#### GET /api/maintenance/{task_id}

Get a specific maintenance task.

### Update Maintenance Task

#### PUT /api/maintenance/{task_id}

Update a maintenance task.

**Request:**
```json
{
  "title": "Replace HVAC Filter",
  "completed": true,
  "completed_date": "2024-02-15"
}
```

### Delete Maintenance Task

#### DELETE /api/maintenance/{task_id}

Delete a maintenance task.

## AI/ML Features

Endpoints for AI-powered features like object detection, barcode lookup, and data tag parsing.

### Get AI Status

#### GET /api/ai/status

Get the status of AI services.

**Response:**
```json
{
  "gemini_configured": true,
  "openai_configured": false,
  "plugins_configured": 1
}
```

### Detect Items in Image

#### POST /api/ai/detect-items

Detect items in an image using AI.

**Request:** (multipart/form-data)
- `file`: Image file
- `use_plugins`: Boolean (default: false)

**Response:**
```json
{
  "items": [
    {
      "name": "Laptop",
      "confidence": 0.95,
      "bounding_box": [100, 200, 300, 400]
    }
  ],
  "source": "Google Gemini AI"
}
```

### Parse Data Tag

#### POST /api/ai/parse-data-tag

Extract information from a data tag/label photo.

**Request:** (multipart/form-data)
- `file`: Image file
- `use_plugins`: Boolean (default: false)

**Response:**
```json
{
  "brand": "Dell",
  "model_number": "XPS-15-9510",
  "serial_number": "SN123456",
  "confidence": 0.90,
  "source": "Google Gemini AI"
}
```

### Barcode Lookup

#### POST /api/ai/barcode-lookup

Look up product information by barcode/UPC.

**Request:**
```json
{
  "barcode": "012345678901"
}
```

**Response:**
```json
{
  "success": true,
  "barcode": "012345678901",
  "product": {
    "name": "Product Name",
    "brand": "Brand Name",
    "description": "Product description",
    "category": "Electronics"
  },
  "source": "UPC Item DB"
}
```

### Multi Barcode Lookup

#### POST /api/ai/barcode-lookup-multi

Look up multiple barcodes at once.

**Request:**
```json
{
  "barcodes": ["012345678901", "098765432109"]
}
```

**Response:**
```json
{
  "results": [
    {
      "barcode": "012345678901",
      "success": true,
      "product": { ... }
    },
    {
      "barcode": "098765432109",
      "success": false,
      "error": "Product not found"
    }
  ]
}
```

### Scan Barcode from Image

#### POST /api/ai/scan-barcode

Scan and decode barcode from an image.

**Request:** (multipart/form-data)
- `file`: Image file

**Response:**
```json
{
  "success": true,
  "barcode": "012345678901",
  "format": "EAN-13",
  "product": { ... }
}
```

### Get Available UPC Databases

#### GET /api/ai/upc-databases

Get list of available UPC/barcode databases.

**Response:**
```json
{
  "databases": [
    {
      "id": "upcitemdb",
      "name": "UPC Item DB",
      "requires_api_key": false
    }
  ]
}
```

### Get Available AI Providers

#### GET /api/ai/ai-providers

Get list of available AI providers.

**Response:**
```json
{
  "providers": [
    {
      "id": "gemini",
      "name": "Google Gemini",
      "requires_api_key": true
    }
  ]
}
```

### Run AI Valuation

#### POST /api/ai/run-valuation

Run AI valuation on all items or specific items.

**Request:**
```json
{
  "item_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "total_items": 2,
  "processed": 2,
  "failed": 0,
  "results": [ ... ]
}
```

### Enrich from Data Tags

#### POST /api/ai/enrich-from-data-tags

Enrich items using their data tag photos.

**Request:**
```json
{
  "item_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "total_items": 2,
  "processed": 2,
  "enriched": 1,
  "results": [ ... ]
}
```

## Google Drive Integration

Endpoints for Google Drive backup integration.

### Get Google Drive Status

#### GET /api/gdrive/status

Get Google Drive connection status.

**Response:**
```json
{
  "connected": true,
  "last_backup": "2024-01-15T10:00:00Z",
  "user_email": "user@example.com"
}
```

### Connect Google Drive

#### POST /api/gdrive/connect

Connect Google Drive account.

**Request:**
```json
{
  "authorization_code": "google_auth_code"
}
```

### Disconnect Google Drive

#### DELETE /api/gdrive/disconnect

Disconnect Google Drive account.

### Create Backup

#### POST /api/gdrive/backup

Create a new backup to Google Drive.

**Response:**
```json
{
  "success": true,
  "backup_id": "file_id_on_drive",
  "message": "Backup created successfully"
}
```

### List Backups

#### GET /api/gdrive/backups

List all backups on Google Drive.

**Response:**
```json
{
  "backups": [
    {
      "id": "file_id",
      "name": "nesventory_backup_20240115.db",
      "created_time": "2024-01-15T10:00:00Z",
      "size": "2048000"
    }
  ]
}
```

### Delete Backup

#### DELETE /api/gdrive/backups/{backup_id}

Delete a specific backup from Google Drive.

## Encircle Export

Endpoints for exporting data to Encircle format.

### Preview Encircle Export

#### POST /api/import/encircle/preview

Preview data in Encircle format without exporting.

**Request:**
```json
{
  "location_ids": ["uuid1", "uuid2"],
  "include_photos": true
}
```

**Response:**
```json
{
  "total_items": 50,
  "total_locations": 2,
  "preview": [ ... ]
}
```

### Export to Encircle

#### POST /api/import/encircle

Export data to Encircle format.

**Request:**
```json
{
  "location_ids": ["uuid1", "uuid2"],
  "include_photos": true,
  "export_format": "csv"
}
```

**Response:** CSV file download

## CSV Import

Endpoints for importing data from CSV files.

### Import from CSV

#### POST /api/import/csv

Import items from a CSV file.

**Request:** (multipart/form-data)
- `file`: CSV file
- `location_id`: UUID (optional, default location for items)

**Response:**
```json
{
  "success": true,
  "imported_count": 100,
  "failed_count": 5,
  "errors": [ ... ]
}
```

## Media Management

Endpoints for managing media files across items and locations.

### Get Media Statistics

#### GET /api/media/stats

Get statistics about media files in the system.

**Response:**
```json
{
  "total_photos": 150,
  "total_documents": 25,
  "total_videos": 10,
  "total_size_bytes": 1073741824,
  "total_size_readable": "1.00 GB"
}
```

### List Media Files

#### GET /api/media/list

List media files with filtering options.

**Query Parameters:**
- `media_type`: Filter by type (photo, document, video)
- `item_id`: Filter by item
- `location_id`: Filter by location
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 50)

**Response:**
```json
{
  "items": [ ... ],
  "total": 150,
  "page": 1,
  "per_page": 50
}
```

### Bulk Delete Media

#### DELETE /api/media/bulk-delete

Delete multiple media files at once.

**Request:**
```json
{
  "photo_ids": ["uuid1", "uuid2"],
  "document_ids": ["uuid3"],
  "video_ids": ["uuid4"]
}
```

### Update Media

#### PATCH /api/media/{media_id}

Update media metadata.

**Request:**
```json
{
  "photo_type": "front",
  "is_primary": true
}
```

## Plugins

Endpoints for managing custom LLM plugins (admin only).

### List Plugins

#### GET /api/plugins

**Admin only.** List all configured plugins.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Custom LLM Plugin",
    "base_url": "https://api.example.com",
    "api_key": "encrypted_key",
    "enabled": true,
    "priority": 1,
    "supports_image_processing": true
  }
]
```

### Get Plugin

#### GET /api/plugins/{plugin_id}

**Admin only.** Get a specific plugin.

### Create Plugin

#### POST /api/plugins

**Admin only.** Create a new plugin.

**Request:**
```json
{
  "name": "Custom LLM Plugin",
  "base_url": "https://api.example.com",
  "api_key": "your_api_key",
  "enabled": true,
  "priority": 1,
  "supports_image_processing": true
}
```

### Update Plugin

#### PUT /api/plugins/{plugin_id}

**Admin only.** Update an existing plugin.

### Delete Plugin

#### DELETE /api/plugins/{plugin_id}

**Admin only.** Delete a plugin.

### Test Plugin Connection

#### POST /api/plugins/{plugin_id}/test

**Admin only.** Test connection to a plugin.

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "latency_ms": 150
}
```

## Logs

Endpoints for managing application logs (admin only).

### Get Log Settings

#### GET /api/logs/settings

**Admin only.** Get current log settings.

**Response:**
```json
{
  "log_level": "INFO",
  "max_file_size_mb": 10,
  "backup_count": 5
}
```

### Update Log Settings

#### PUT /api/logs/settings

**Admin only.** Update log settings.

**Request:**
```json
{
  "log_level": "DEBUG",
  "max_file_size_mb": 20,
  "backup_count": 10
}
```

### Delete Log Files

#### DELETE /api/logs/files

**Admin only.** Delete log files.

**Query Parameters:**
- `keep_current`: Boolean (keep current log file)

### Rotate Logs

#### POST /api/logs/rotate

**Admin only.** Force log rotation.

### List Log Files

#### GET /api/logs/files

**Admin only.** List all log files.

**Response:**
```json
[
  {
    "name": "nesventory.log",
    "size": "1024000",
    "modified": "2024-01-15T10:00:00Z"
  }
]
```

### Get Log Content

#### GET /api/logs/content/{file_name}

**Admin only.** Get content of a specific log file.

**Query Parameters:**
- `lines`: Number of lines to return (default: 100)
- `offset`: Starting line (default: 0)

### Get Issue Report Data

#### GET /api/logs/issue-report

**Admin only.** Get data for creating an issue report.

**Response:**
```json
{
  "version": "1.0.0",
  "log_entries": [ ... ],
  "system_info": { ... }
}
```

## System Status

Endpoints for checking system status and configuration.

### Get System Status

#### GET /api/status

Get comprehensive system status including health, version, and database information.

**Response:**
```json
{
  "application": {
    "name": "NesVentory",
    "version": "1.0.0",
    "status": "ok"
  },
  "database": {
    "status": "healthy",
    "version": "16.1",
    "size": "50.5 MB",
    "location": "/app/data/nesventory.db"
  }
}
```

### Get Health Status

#### GET /api/health

Simple health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### Get Version

#### GET /api/version

Get application version information.

**Response:**
```json
{
  "version": "1.0.0",
  "name": "NesVentory"
}
```

### Get Configuration Status

#### GET /api/config-status

**Authenticated users only.** Get current system configuration status.

**Response:**
```json
{
  "google_oauth_configured": true,
  "google_client_id": "client_id",
  "google_client_secret_masked": "••••••••abcd",
  "gemini_configured": true,
  "gemini_api_key_masked": "••••••••xyz",
  "gemini_model": "gemini-1.5-pro",
  "available_gemini_models": ["gemini-1.5-pro", "gemini-1.5-flash"],
  "gemini_from_env": false,
  "google_from_env": false
}
```

### Update API Keys

#### PUT /api/config-status/api-keys

**Admin only.** Update API keys for Gemini and Google OAuth.

**Request:**
```json
{
  "gemini_api_key": "new_api_key",
  "gemini_model": "gemini-1.5-pro",
  "google_client_id": "new_client_id",
  "google_client_secret": "new_client_secret"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API keys updated successfully",
  "gemini_configured": true,
  "google_oauth_configured": true
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `204 No Content`: Request succeeded with no response body
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Authentication Headers

For authenticated endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Rate Limiting

Currently, there is no rate limiting implemented. Consider implementing rate limiting for production use.

## Pagination

Some list endpoints support pagination with the following query parameters:

- `page`: Page number (starting from 1)
- `per_page`: Number of items per page (max: 100)

Response includes pagination metadata:

```json
{
  "items": [ ... ],
  "total": 500,
  "page": 1,
  "per_page": 50,
  "total_pages": 10
}
```

## File Upload Limits

- Photos: JPEG, PNG, GIF, WebP
- Documents: PDF, TXT
- Videos: MP4, MPEG, MOV, AVI, WebM

Maximum file sizes are configured at the application level.

## CORS

CORS is configured via the `CORS_ORIGINS` environment variable. Update this to allow requests from your frontend domain.

## API Versioning

The current API does not include version numbers in the URL. Breaking changes will be communicated through release notes.

## Support

For issues or questions about the API, please refer to the project repository or contact the maintainers.
