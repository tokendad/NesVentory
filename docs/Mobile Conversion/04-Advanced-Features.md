# Phase 4: Advanced Features

> **Scope:** Data imports, maintenance scheduling, media management, admin panel, user settings, insurance, and mobile-specific push notifications.
>
> **Prerequisites:** Phase 2 (core inventory screens) and Phase 3 (item detail & media capture).
>
> **Estimated Total Effort:** 12–16 developer-days

---

## Table of Contents

- [4.1 CSV Import Screen](#41-csv-import-screen)
- [4.2 Encircle Import Screen](#42-encircle-import-screen)
- [4.3 Maintenance & Calendar](#43-maintenance--calendar)
- [4.4 Media Management Screen](#44-media-management-screen)
- [4.5 Admin Panel](#45-admin-panel)
- [4.6 User Settings Screen](#46-user-settings-screen)
- [4.7 Insurance Information](#47-insurance-information)
- [4.8 Google Drive Backup](#48-google-drive-backup)
- [4.9 Push Notifications](#49-push-notifications-mobile-specific)
- [Component Decomposition Strategy](#component-decomposition-strategy)
- [Shared Utilities](#shared-utilities)
- [Acceptance Criteria](#acceptance-criteria)
- [Risk & Mitigation](#risk--mitigation)

---

## 4.1 CSV Import Screen

**Web source:** `src/components/CSVImport.tsx` (320 lines)
**Backend endpoint:** `POST /api/csv` (multipart form data)
**Effort estimate:** 1–1.5 days

### Overview

Allow users to import inventory items from a CSV file stored on their device or cloud storage. The web version uses a standard `<input type="file">` element; the mobile version replaces this with `expo-document-picker`.

### Screen Layout

```
┌──────────────────────────────┐
│  ← CSV Import                │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │  📄 Select CSV File    │  │
│  │  Tap to browse files   │  │
│  └────────────────────────┘  │
│                              │
│  Selected: inventory.csv     │
│                              │
│  ☑ Auto-create locations     │
│                              │
│  Parent Location (optional)  │
│  ┌────────────────────────┐  │
│  │  ▼ Select location...  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │     Import Items       │  │
│  └────────────────────────┘  │
│                              │
│  ── Results ──────────────   │
│  ✅ 42 items created         │
│  📍 5 locations created      │
│  ⚠️  2 rows skipped          │
│  ❌ 1 error                  │
│                              │
└──────────────────────────────┘
```

### Implementation Details

#### File Selection

```typescript
import * as DocumentPicker from 'expo-document-picker';

const pickCSV = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
    copyToCacheDirectory: true,
  });

  if (!result.canceled && result.assets[0]) {
    setSelectedFile(result.assets[0]);
  }
};
```

#### Upload with FormData

```typescript
const uploadCSV = async () => {
  const formData = new FormData();
  formData.append('csv_file', {
    uri: selectedFile.uri,
    name: selectedFile.name,
    type: 'text/csv',
  } as any);

  if (createLocations) {
    formData.append('create_locations', 'true');
  }
  if (parentLocationId) {
    formData.append('parent_location_id', parentLocationId);
  }

  const response = await api.post('/api/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // CSVImportResult
};
```

#### State Machine

```
IDLE → FILE_SELECTED → UPLOADING → SUCCESS | ERROR
                  ↑                        │
                  └────────────────────────┘  (reset)
```

### Key Differences from Web

| Aspect | Web (`CSVImport.tsx`) | Mobile |
|--------|----------------------|--------|
| File picker | `<input type="file" accept=".csv">` | `expo-document-picker` with MIME filter |
| File reference | `File` object | `{ uri, name, mimeType }` asset |
| Location dropdown | `<select>` with indented hierarchy | Custom picker or `@react-native-picker/picker` with depth indicators |
| Progress feedback | Inline spinner | `ActivityIndicator` + progress text |
| Error display | Inline `<div>` | `Alert.alert()` or inline error card |

### API Request/Response

**Request:** `POST /api/csv`
- `csv_file` — the CSV file (multipart)
- `parent_location_id` — optional UUID string
- `create_locations` — boolean (default `true`)

**Response:** `CSVImportResult`
```typescript
interface CSVImportResult {
  items_created: number;
  locations_created: number;
  errors: string[];
  skipped_rows: number;
}
```

---

## 4.2 Encircle Import Screen

**Web source:** `src/components/EncircleImport.tsx` (516 lines)
**Backend endpoints:**
- `POST /api/encircle/preview` — preview what will be imported
- `POST /api/encircle` — execute the import

**Effort estimate:** 2–2.5 days

### Overview

Two-step import flow for Encircle XLSX exports. Users first preview the data (locations, items, image matches), then confirm the import. The web version supports both individual file selection and folder selection for images; mobile simplifies this to multi-file selection.

### Screen Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  File Select │ ──▶ │   Preview    │ ──▶ │   Results   │
│  (XLSX +     │     │  (locations, │     │  (summary,  │
│   images)    │     │   items,     │     │   errors)   │
│              │     │   mappings)  │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Step 1: File Selection

```typescript
// Pick XLSX file
const pickXLSX = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    copyToCacheDirectory: true,
  });
  if (!result.canceled) setXlsxFile(result.assets[0]);
};

// Pick multiple image files
const pickImages = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (!result.canceled) setImages(result.assets);
};
```

### Step 2: Preview

Send the XLSX file (and optionally images) to the preview endpoint:

**Request:** `POST /api/encircle/preview` (multipart)
- `file` — the XLSX file
- `images` — zero or more image files
- `match_by_name` — boolean (match images to items by filename)

**Response:**
```typescript
interface EncirclePreviewResult {
  parent_name: string;           // Detected top-level location
  locations: EncircleLocation[]; // Hierarchical locations to create
  items: EncircleItem[];         // Items to import
  image_matches: Record<string, string>; // item_name → image_filename
}
```

Display the preview as:
- **Location tree** — collapsible list of locations to be created
- **Item list** — scrollable FlatList with thumbnails (where matched)
- **Image match count** — "12 of 18 images matched to items"

### Step 3: Confirm & Import

**Request:** `POST /api/encircle` (multipart)
- Same form data as preview, plus:
- `parent_location_id` — optional, use an existing location as parent
- `use_existing_location` — boolean

Show an `ActivityIndicator` with status text during upload (this can be slow with many images).

### Step 2 Preview Screen Layout

```
┌──────────────────────────────┐
│  ← Encircle Import: Preview  │
├──────────────────────────────┤
│                              │
│  📍 Location: "123 Main St"  │
│                              │
│  ▼ Locations to Create (5)   │
│  ├── Living Room             │
│  ├── Kitchen                 │
│  ├── Master Bedroom          │
│  │   └── Walk-in Closet      │
│  └── Garage                  │
│                              │
│  📦 Items to Import (42)     │
│  ┌────────────────────────┐  │
│  │ 🖼 Samsung TV           │  │
│  │ 🖼 IKEA Sofa            │  │
│  │    Dining Table (no img)│  │
│  │ ...                     │  │
│  └────────────────────────┘  │
│                              │
│  🖼 12/18 images matched     │
│                              │
│  Use existing location?      │
│  ┌────────────────────────┐  │
│  │  ▼ Select location...  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │   Confirm Import       │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### Key Differences from Web

| Aspect | Web (`EncircleImport.tsx`) | Mobile |
|--------|---------------------------|--------|
| Image selection | Files + folder mode (`webkitdirectory`) | Multi-file picker only (no folder browsing) |
| Allowed image types | Filtered by MIME: `image/jpeg`, `image/png`, `image/gif`, `image/webp` | Same MIME filter in `DocumentPicker` |
| Preview display | HTML table with thumbnails | FlatList with `Image` components |
| Location hierarchy | Nested `<div>` with indent | Indented `Text` with tree lines or collapsible sections |

---

## 4.3 Maintenance & Calendar

**Web sources:**
- `src/components/Calendar.tsx` (469 lines) — calendar views
- `src/components/MaintenanceTab.tsx` (396 lines) — per-item task CRUD

**Backend endpoints:**
- `POST /maintenance` — create task
- `GET /maintenance` — list all tasks
- `GET /maintenance/item/{item_id}` — tasks for a specific item
- `GET /maintenance/{task_id}` — single task
- `PUT /maintenance/{task_id}` — update task
- `DELETE /maintenance/{task_id}` — delete task

**Effort estimate:** 2.5–3 days

### Data Model

```typescript
interface MaintenanceTask {
  id: string;               // UUID
  item_id: string;          // UUID — linked inventory item
  name: string;
  description?: string;
  next_due_date?: string;   // ISO date (YYYY-MM-DD)
  recurrence_type: RecurrenceType;
  recurrence_interval?: number; // used with 'custom_days'
  color?: string;           // hex code, e.g. "#3b82f6"
  last_completed?: string;  // ISO date
  created_at: string;
  updated_at: string;
}

type RecurrenceType =
  | 'none'        // One-time task
  | 'daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'bi_monthly'
  | 'yearly'
  | 'custom_days'; // Uses recurrence_interval field
```

### Calendar Screen

The web app provides four view modes: **daily**, **weekly**, **monthly**, and **yearly**. For mobile, prioritize **monthly** (most useful) with **daily** as a secondary view. Weekly and yearly views can be deferred.

#### Recommended Library

Use [`react-native-calendars`](https://github.com/wix/react-native-calendars) for the calendar grid. It supports:
- Dot markers on specific dates
- Custom day rendering (for color coding)
- Month navigation
- Performance optimized for React Native

#### Calendar Integration

```typescript
import { Calendar } from 'react-native-calendars';

// Build marked dates from tasks
const markedDates = useMemo(() => {
  const marks: Record<string, any> = {};
  tasks.forEach(task => {
    if (!task.next_due_date) return;
    const dateStr = task.next_due_date; // "YYYY-MM-DD"
    const isOverdue = new Date(dateStr) < new Date();
    const isDueSoon = /* within 3 days */;

    marks[dateStr] = {
      dots: [
        {
          color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#10b981',
          key: task.id,
        },
      ],
      ...(marks[dateStr] || {}),
    };
  });
  return marks;
}, [tasks]);

return (
  <Calendar
    markingType="multi-dot"
    markedDates={markedDates}
    onDayPress={(day) => setSelectedDate(day.dateString)}
  />
);
```

#### Color Coding Convention

| Status | Color | Hex | Meaning |
|--------|-------|-----|---------|
| Overdue | 🔴 Red | `#ef4444` | Past due date |
| Due Soon | 🟡 Yellow | `#f59e0b` | Within 3 days |
| Upcoming | 🟢 Green | `#10b981` | More than 3 days out |
| Completed | 🔵 Blue | `#3b82f6` | Task marked done |

### Task List View

Below the calendar (or as a separate tab), show tasks for the selected date:

```
┌──────────────────────────────┐
│  Calendar (monthly grid)     │
│  ◀  January 2025  ▶         │
│  ... calendar days ...       │
├──────────────────────────────┤
│  Tasks for Jan 15            │
│  ┌────────────────────────┐  │
│  │ 🔴 Oil Change — Car    │  │
│  │    Overdue by 3 days   │  │
│  │    [Mark Complete]     │  │
│  ├────────────────────────┤  │
│  │ 🟡 Filter Replace      │  │
│  │    Due tomorrow        │  │
│  │    [Mark Complete]     │  │
│  └────────────────────────┘  │
│                              │
│  [+ New Task]                │
└──────────────────────────────┘
```

### MaintenanceTab (Per-Item)

Embedded within the item detail screen. Shows only tasks for that specific item using `GET /maintenance/item/{item_id}`.

#### Task Create/Edit Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text input | ✅ | Task title |
| Description | Multiline text | ❌ | Details |
| Due Date | Date picker | ❌ | `@react-native-community/datetimepicker` |
| Recurrence | Picker/select | ✅ | Default `none` |
| Custom Interval | Number input | Conditional | Only when recurrence = `custom_days` |
| Color | Color swatch picker | ❌ | 7 preset colors from web |

**Preset Colors (from web):**
```typescript
const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];
```

### "Mark Complete" Logic

When a user completes a task:
1. `PUT /maintenance/{task_id}` with `last_completed: today`
2. If `recurrence_type !== 'none'`, compute and set the new `next_due_date`
3. Refresh task list
4. Optionally trigger a success haptic (`expo-haptics`)

---

## 4.4 Media Management Screen

**Web source:** `src/components/MediaManagement.tsx` (675 lines)
**Backend endpoints:**
- `GET /api/media/stats` — storage statistics
- `GET /api/media/list` — paginated media listing (supports `location`, `media_type`, `page`, `limit` query params)
- `DELETE /api/media/bulk-delete` — delete multiple media items
- `PATCH /api/media/{media_id}` — update media metadata (reassign to different item)

**Effort estimate:** 2–2.5 days

### Screen Layout

```
┌──────────────────────────────┐
│  ← Media Management          │
├──────────────────────────────┤
│  📊 Storage: 2.4 GB          │
│  📷 Photos: 312 │ 🎥 Videos: 8│
├──────────────────────────────┤
│  Filters:                    │
│  [All ▼] [Any location ▼]   │
│  Sort: [Date ▼]             │
├──────────────────────────────┤
│  ☐ Select All    [Delete]   │
│                              │
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 📷  │ │ 📷  │ │ 📷  │   │
│  │ ☐   │ │ ☐   │ │ ☐   │   │
│  └─────┘ └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 📷  │ │ 📷  │ │ 📷  │   │
│  │ ☐   │ │ ☐   │ │ ☐   │   │
│  └─────┘ └─────┘ └─────┘   │
│                              │
│  Loading more...             │
└──────────────────────────────┘
```

### Implementation Details

#### Grid View

Use a `FlatList` with `numColumns={3}` for the photo grid. Each cell is a thumbnail with an optional selection checkbox overlay.

```typescript
<FlatList
  data={media}
  numColumns={3}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <MediaGridItem
      media={item}
      selected={selectedIds.has(item.id)}
      onPress={() => handleMediaPress(item)}
      onLongPress={() => toggleSelection(item.id)}
      selectionMode={selectionMode}
    />
  )}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListHeaderComponent={<StatsBar stats={stats} />}
/>
```

#### Infinite Scroll Pagination

The web version uses page-based pagination with a "Load More" button and 50 items per page. On mobile, use `onEndReached` for automatic infinite scroll:

```typescript
const loadMore = async () => {
  if (!hasMore || loadingMore) return;
  setLoadingMore(true);
  const response = await listMedia(locationFilter, typeFilter, false, page + 1, 50);
  setMedia(prev => [...prev, ...response.items]);
  setPage(p => p + 1);
  setHasMore(response.items.length === 50);
  setLoadingMore(false);
};
```

#### Multi-Select Mode

- **Enter selection mode:** Long-press any media item
- **Toggle items:** Tap while in selection mode
- **Select all:** Header button
- **Exit selection mode:** Back button or "Cancel"
- **Bulk delete:** Confirmation dialog before calling `DELETE /api/media/bulk-delete`

#### Bulk Delete Request

```typescript
// DELETE /api/media/bulk-delete
// Body: { media_ids: string[] }
const bulkDelete = async (mediaIds: string[]) => {
  await api.delete('/api/media/bulk-delete', {
    data: { media_ids: Array.from(mediaIds) },
  });
};
```

#### Filters

| Filter | Options | Implementation |
|--------|---------|----------------|
| Media type | All, Photo, Video | Segmented control or dropdown |
| Location | All locations + specific ones | Searchable picker |
| Sort | Date (newest), Date (oldest), Size | Dropdown or action sheet |

#### Reassign Media

From the media detail view, allow changing the item a photo/video belongs to:

```typescript
// PATCH /api/media/{media_id}
// Body: { item_id: "new-uuid" }
const reassignMedia = async (mediaId: string, newItemId: string) => {
  await api.patch(`/api/media/${mediaId}`, { item_id: newItemId });
};
```

Use a searchable item picker to select the new item.

---

## 4.5 Admin Panel

**Web source:** `src/components/AdminPage.tsx` (4,114 lines — **must be decomposed**)
**Effort estimate:** 4–5 days (largest section)

### Why Decompose?

The web `AdminPage.tsx` is a single 4,114-line file containing 7 major tabs. This violates mobile best practices:
- React Native screens should remain focused and reasonably sized
- Navigation between admin sections should use the stack navigator
- Each sub-screen can lazy-load its own data
- Testing is dramatically easier with smaller components

### Admin Tab Types (from Web)

The web component defines these tabs:
```typescript
type MainTabType = 'users' | 'logs' | 'server' | 'ai-settings' | 'plugins' | 'status' | 'custom-fields';
```

### Mobile Navigation Structure

```
AdminScreen (Section list)
  ├── AdminUsersScreen
  │   ├── UserListScreen
  │   ├── UserCreateScreen
  │   └── UserEditScreen
  ├── AdminLogsScreen
  ├── AdminServerSettingsScreen
  ├── AdminAIScreen
  ├── AdminPluginsScreen
  │   ├── PluginListScreen
  │   └── PluginEditScreen
  ├── AdminStatusScreen
  └── AdminCustomFieldsScreen
```

The top-level `AdminScreen` is a settings-style list:

```
┌──────────────────────────────┐
│  ← Administration            │
├──────────────────────────────┤
│                              │
│  👥 User Management       ▶ │
│  📋 Logging               ▶ │
│  ⚙️  Server Settings       ▶ │
│  🤖 AI Configuration      ▶ │
│  🔌 Plugins               ▶ │
│  📊 System Status         ▶ │
│  📝 Custom Fields         ▶ │
│                              │
└──────────────────────────────┘
```

### 4.5.1 User Management Sub-screen

**Backend endpoints:**
- `GET /api/users` — list all users
- `POST /api/users` — register new user
- `POST /api/users/admin` — admin creates user (bypasses approval)
- `PATCH /api/users/{user_id}` — update user
- `DELETE /api/users/{user_id}` — delete user
- `PUT /api/users/{user_id}/locations` — set location access
- `GET /api/users/{user_id}/locations` — get location access

**Web sub-tabs:** `'all' | 'pending' | 'create'` — convert to screen navigation.

#### User List Screen

```
┌──────────────────────────────┐
│  ← User Management  [+ Add] │
├──────────────────────────────┤
│  Filter: [All ▼]            │
│                              │
│  ┌────────────────────────┐  │
│  │ 👤 John Doe            │  │
│  │    admin · Approved     │  │
│  ├────────────────────────┤  │
│  │ 👤 Jane Smith          │  │
│  │    editor · Approved    │  │
│  ├────────────────────────┤  │
│  │ 👤 Bob Wilson          │  │
│  │    viewer · Pending ⏳  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

#### User Edit Screen

| Field | Type | Notes |
|-------|------|-------|
| Username | Text (read-only) | Cannot change |
| Full Name | Text input | |
| Email | Text input | Optional |
| Role | Picker | `admin`, `editor`, `viewer` |
| Approved | Toggle | Admin approval for access |
| Password | Text input | Optional, for reset |
| Location Access | Multi-select | Which locations user can see |

#### Safety Guards

- **Cannot delete yourself** — button disabled or hidden for current user
- **Cannot demote last admin** — show error if trying to change the only admin's role
- **Delete confirmation** — `Alert.alert()` with destructive option

### 4.5.2 AI Configuration Sub-screen

**Backend endpoints:**
- `GET /api/ai/status` — AI provider status
- `GET /api/ai/ai-providers` — list available providers
- `GET /api/ai/gemini-models` — list Gemini models
- `POST /api/ai/test-connection` — test a provider connection
- `GET /api/ai/upc-databases` — list UPC database sources

**Screen sections:**

1. **Provider Cards** — for each AI provider (OpenAI, Google Gemini, Anthropic, Ollama):
   - API key input (SecureTextEntry, masked)
   - Model selection dropdown
   - Status indicator (connected/disconnected)
   - "Test Connection" button
2. **AI Schedule Settings** — when AI operations run
3. **UPC Database Configuration** — toggle which UPC lookup sources to use

### 4.5.3 Logging Sub-screen

**Backend endpoints:**
- `GET /api/logs/settings` — current log settings
- `PUT /api/logs/settings` — update log level, retention, etc.
- `GET /api/logs/files` — list log files
- `GET /api/logs/content/{file_name}` — read a specific log file
- `POST /api/logs/rotate` — force log rotation
- `POST /api/logs/cleanup` — clean old logs
- `DELETE /api/logs/files` — delete log files

**Screen layout:**
```
┌──────────────────────────────┐
│  ← Logging                   │
├──────────────────────────────┤
│  Log Level: [INFO ▼]         │
│  Max File Size: [10 MB]      │
│  Retention: [30 days]        │
│                              │
│  [Rotate Logs] [Cleanup]     │
├──────────────────────────────┤
│  Log Files:                  │
│  ┌────────────────────────┐  │
│  │ app.log (2.1 MB)    ▶ │  │
│  │ app.log.1 (5.0 MB)  ▶ │  │
│  │ app.log.2 (5.0 MB)  ▶ │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Log viewer:** Display log content in a monospace font inside a `ScrollView`. Consider a search/filter bar for finding specific entries.

### 4.5.4 Google Drive Sub-screen

See [Section 4.8](#48-google-drive-backup) for full details.

### 4.5.5 Plugins Sub-screen

**Backend endpoints:**
- `GET /api/plugins` — list all plugins
- `POST /api/plugins` — create plugin
- `GET /api/plugins/{plugin_id}` — get plugin details
- `PUT /api/plugins/{plugin_id}` — update plugin
- `DELETE /api/plugins/{plugin_id}` — delete plugin
- `POST /api/plugins/{plugin_id}/test` — test plugin connection

**Plugin form fields:**

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Required |
| Description | Multiline text | Optional |
| Endpoint URL | Text (URL keyboard) | Required, `https://` prefix |
| API Key | Secure text | Optional, stored masked |
| Enabled | Toggle | |
| Use for AI Scan | Toggle | Whether plugin handles scan ops |
| Supports Images | Toggle | Whether plugin processes images |
| Priority | Number input | Lower = higher priority (default 100) |

**Test Connection:** Call `POST /api/plugins/{id}/test` and display result (success/failure + response time).

### 4.5.6 System Status Sub-screen

**Backend endpoints:**
- `GET /api/status` — application status (version, uptime, DB stats)
- `GET /api/config-status` — configuration validation (API keys, services)

Display as an information card layout:

```
┌──────────────────────────────┐
│  ← System Status             │
├──────────────────────────────┤
│  App Version: 6.12.4         │
│  Uptime: 3d 12h 45m         │
│  Database: SQLite            │
│  Items: 1,247                │
│  Locations: 45               │
│  Media Files: 320            │
│  Storage Used: 2.4 GB        │
├──────────────────────────────┤
│  API Keys Status:            │
│  ✅ OpenAI: Configured       │
│  ✅ Gemini: Configured       │
│  ❌ Anthropic: Not set       │
│  ⚠️  Ollama: Unreachable     │
├──────────────────────────────┤
│  Services:                   │
│  ✅ Google Drive: Connected   │
│  ✅ Plugins: 2 active        │
└──────────────────────────────┘
```

### 4.5.7 Server Settings Sub-screen

**Backend endpoints:**
- `GET /api/settings` — current system settings
- `PUT /api/settings` — update system settings

Displays global configuration options. Maps to the web `server` tab of `AdminPage.tsx`.

---

## 4.6 User Settings Screen

**Web source:** `src/components/UserSettings.tsx` (1,608 lines)
**Effort estimate:** 2–2.5 days

### Web Tab Structure

The web component defines these tabs:
```typescript
type TabType = 'profile' | 'api' | 'stats' | 'appearance' | 'locale' | 'printer';
```

> **Note:** The `printer` tab manages NIIMBOT label printer configuration and is **not applicable** to mobile. Omit it from the mobile version entirely — NIIMBOT printing is USB/Bluetooth to a host machine, not a mobile workflow.

### Mobile Section Navigation

Convert tabs to a scrollable settings list or section-based layout:

```
┌──────────────────────────────┐
│  ← Settings                  │
├──────────────────────────────┤
│                              │
│  PROFILE                     │
│  ┌────────────────────────┐  │
│  │ Full Name: John Doe    │  │
│  │ Email: john@example... │  │
│  │ Change Password      ▶ │  │
│  └────────────────────────┘  │
│                              │
│  API ACCESS                  │
│  ┌────────────────────────┐  │
│  │ API Key: ••••••••abcd  │  │
│  │ [Copy] [Regenerate]    │  │
│  │ [Revoke]               │  │
│  └────────────────────────┘  │
│                              │
│  APPEARANCE                  │
│  ┌────────────────────────┐  │
│  │ Theme: [Dark ▼]        │  │
│  │ Color: [Blue ▼]        │  │
│  └────────────────────────┘  │
│                              │
│  LOCALE                      │
│  ┌────────────────────────┐  │
│  │ Language: [English ▼]  │  │
│  │ Currency: [USD ▼]      │  │
│  │ Date Format: [MM/DD ▼] │  │
│  └────────────────────────┘  │
│                              │
│  NOTIFICATIONS (mobile only) │
│  ┌────────────────────────┐  │
│  │ Maintenance Reminders  │  │
│  │ Backup Reminders       │  │
│  │ Import Notifications   │  │
│  └────────────────────────┘  │
│                              │
│  STATS                       │
│  ┌────────────────────────┐  │
│  │ My Items: 247          │  │
│  │ My Locations: 12       │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Section Details

#### Profile Section

**Backend endpoint:** `PATCH /api/users/{user_id}`

| Field | Type | Notes |
|-------|------|-------|
| Full Name | Text | Editable |
| Email | Text (email keyboard) | Read-only display or editable depending on role |
| Password | Secure text × 2 | Current + new, with confirmation |

#### API Key Section

**Backend endpoints:**
- `POST /api/users/me/api-key` — generate new key
- (Revoke via update)

- Show masked key with "Copy" button (`expo-clipboard`)
- "Regenerate" shows confirmation dialog (old key is invalidated)
- "Revoke" removes API key entirely

#### Appearance Section

Reuse the **theme system from Phase 1**:
- **Theme mode picker:** Light, Dark, System
- **Color palette picker:** Visual swatches for available palettes

Store preferences with `AsyncStorage` for instant apply without server round-trip.

#### Locale Section

| Setting | Options | Web Source |
|---------|---------|------------|
| Currency | USD, EUR, GBP, CAD, AUD, etc. (from `COMMON_CURRENCIES`) | `src/lib/locale.ts` |
| Locale | en-US, en-GB, fr-FR, de-DE, etc. (from `COMMON_LOCALES`) | `src/lib/locale.ts` |
| Currency position | Before, After | `CURRENCY_POSITION_OPTIONS` |
| Date format | MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc. | `DATE_FORMAT_OPTIONS` |

#### Notifications Section (Mobile-Only)

New section not in web. See [Section 4.9](#49-push-notifications-mobile-specific).

---

## 4.7 Insurance Information

**Web source:** `src/components/InsuranceTab.tsx` (806 lines)
**Effort estimate:** 1.5–2 days

### Context

Insurance information is a sub-feature of **primary locations** (locations marked as "Home"). It is stored in the `insurance_info` JSON field on the Location model and is **only visible for primary locations**.

### Data Model

```typescript
interface InsuranceInfo {
  company_name?: string;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
  agent_name?: string;
  policy_number?: string;
  primary_holder?: PolicyHolder;
  additional_holders?: PolicyHolder[];
  purchase_date?: string;
  purchase_price?: number;
  build_date?: string;
  // Legacy fields
  contact_info?: string;
  coverage_amount?: number;
  notes?: string;
}

interface PolicyHolder {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}
```

### Screen Placement

Embed as a tab within the **Location Detail screen** (only for primary locations):

```
Location Detail
  ├── Details Tab
  └── Insurance Tab  ← only visible when location.is_primary_location === true
```

### Insurance Tab Layout

```
┌──────────────────────────────┐
│  🏠 Insurance                │
├──────────────────────────────┤
│                              │
│  INSURANCE COMPANY           │
│  Company: _______________    │
│  Agent:   _______________    │
│  Address: _______________    │
│  Email:   _______________    │
│  Phone:   _______________    │
│  Policy #: ______________    │
│                              │
│  PRIMARY HOLDER              │
│  Name:    _______________    │
│  Phone:   _______________    │
│  Email:   _______________    │
│  Address: _______________    │
│                              │
│  ADDITIONAL HOLDERS          │
│  [+ Add Holder]              │
│                              │
│  PROPERTY VALUES             │
│  Purchase Price: $___,___    │
│  Purchase Date:  ________    │
│  Build Date:     ________    │
│                              │
│  CALCULATED TOTALS           │
│  Total Value:     $125,430   │
│  Estimated Value: $118,200   │
│  (includes 42 items in       │
│   5 sub-locations)           │
│                              │
│  [Print Summary]  [Export]   │
│                              │
│  [Save]  [Reset]             │
└──────────────────────────────┘
```

### Print / Export on Mobile

The web version offers three export modes:

| Web Mode | Mobile Equivalent | Implementation |
|----------|-------------------|----------------|
| Print Basic | Share as PDF | Use `expo-print` to generate HTML → PDF, then share via `expo-sharing` |
| Print Comprehensive | Share as PDF (with images) | Same approach, include item photos |
| Export CSV | Share CSV file | Generate CSV string, write to temp file, share via `expo-sharing` |

```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const printInsuranceSummary = async () => {
  const html = generateInsuranceHTML(insuranceInfo, items, location);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Insurance Summary',
  });
};
```

---

## 4.8 Google Drive Backup

**Backend endpoints:**
- `GET /api/gdrive/status` — connection status
- `POST /api/gdrive/connect` — exchange OAuth auth code for tokens
- `DELETE /api/gdrive/disconnect` — revoke connection
- `POST /api/gdrive/backup` — create a backup
- `GET /api/gdrive/backups` — list existing backups
- `DELETE /api/gdrive/backups/{backup_id}` — delete a specific backup

**Effort estimate:** 1.5–2 days

### OAuth Flow on Mobile

The backend uses Google OAuth with an authorization code exchange. On mobile, use `expo-auth-session` to handle the OAuth flow:

```typescript
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: GOOGLE_EXPO_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

useEffect(() => {
  if (response?.type === 'success') {
    const { code } = response.params;
    // Send code to backend
    api.post('/api/gdrive/connect', { code });
  }
}, [response]);
```

### Screen Layout

```
┌──────────────────────────────┐
│  ← Google Drive Backup       │
├──────────────────────────────┤
│                              │
│  Status: ✅ Connected         │
│  Last backup: Jan 15, 2025   │
│                              │
│  [Create Backup Now]         │
│  [Disconnect Google Drive]   │
│                              │
│  ── Existing Backups ──      │
│  ┌────────────────────────┐  │
│  │ Jan 15, 2025  12.4 MB  │  │
│  │                  [🗑️]  │  │
│  ├────────────────────────┤  │
│  │ Jan 8, 2025   11.9 MB  │  │
│  │                  [🗑️]  │  │
│  ├────────────────────────┤  │
│  │ Jan 1, 2025   11.2 MB  │  │
│  │                  [🗑️]  │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### States

```
NOT_CONNECTED → AUTHENTICATING → CONNECTED
                                    ↕
                              BACKING_UP
                                    ↕
                              CONNECTED (refresh list)
```

---

## 4.9 Push Notifications (Mobile-Specific)

**NEW feature** — not present in the web application.
**Effort estimate:** 1–1.5 days

### Overview

Mobile users benefit from push notifications for time-sensitive events. Use `expo-notifications` for local scheduling (no push server required for most cases).

### Notification Categories

| Category | Trigger | Default |
|----------|---------|---------|
| Maintenance due | Task `next_due_date` approaches | Enabled, 1 day before |
| Maintenance overdue | Task past `next_due_date` | Enabled, day of |
| Backup reminder | Periodic (weekly/monthly) | Disabled |
| Import complete | After CSV/Encircle import finishes | Enabled |

### Implementation

#### Permission Request

```typescript
import * as Notifications from 'expo-notifications';

const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    // Show explanation UI, store preference
    return false;
  }
  return true;
};
```

#### Schedule Maintenance Reminders

```typescript
const scheduleMaintenanceReminder = async (task: MaintenanceTask) => {
  if (!task.next_due_date) return;

  const dueDate = new Date(task.next_due_date);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

  if (reminderDate <= new Date()) return; // Already past

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔧 Maintenance Due Tomorrow',
      body: `${task.name} is due tomorrow`,
      data: { taskId: task.id, type: 'maintenance_reminder' },
    },
    trigger: { date: reminderDate },
  });
};
```

#### Handle Notification Taps

```typescript
Notifications.addNotificationResponseReceivedListener((response) => {
  const { taskId, type } = response.notification.request.content.data;
  if (type === 'maintenance_reminder') {
    navigation.navigate('MaintenanceDetail', { taskId });
  }
});
```

#### Notification Settings UI

Add to [User Settings](#46-user-settings-screen) as the **Notifications** section:

```
NOTIFICATIONS
┌────────────────────────────────┐
│ Maintenance Reminders     [✅] │
│   Remind: [1 day before ▼]    │
│ Overdue Alerts            [✅] │
│ Backup Reminders          [❌] │
│   Frequency: [Weekly ▼]       │
│ Import Notifications      [✅] │
└────────────────────────────────┘
```

Store notification preferences in `AsyncStorage` and sync with the task scheduling system.

---

## Component Decomposition Strategy

The web `AdminPage.tsx` (4,114 lines) **must** be decomposed into separate screens for mobile. This is the single most important architectural decision in Phase 4.

### Decomposition Map

| Web Tab (in `AdminPage.tsx`) | Mobile Screen | File | Approx. Lines |
|------------------------------|---------------|------|---------------|
| `users` tab | `AdminUsersScreen` | `screens/admin/AdminUsersScreen.tsx` | ~500 |
| `logs` tab | `AdminLogsScreen` | `screens/admin/AdminLogsScreen.tsx` | ~300 |
| `server` tab | `AdminServerSettingsScreen` | `screens/admin/AdminServerSettingsScreen.tsx` | ~350 |
| `ai-settings` tab | `AdminAIScreen` | `screens/admin/AdminAIScreen.tsx` | ~400 |
| `plugins` tab | `AdminPluginsScreen` | `screens/admin/AdminPluginsScreen.tsx` | ~400 |
| `status` tab | `AdminStatusScreen` | `screens/admin/AdminStatusScreen.tsx` | ~200 |
| `custom-fields` tab | `AdminCustomFieldsScreen` | `screens/admin/AdminCustomFieldsScreen.tsx` | ~250 |
| *(top-level)* | `AdminScreen` (navigation list) | `screens/admin/AdminScreen.tsx` | ~100 |

### Additional Standalone Screens (from Other Components)

| Web Component | Mobile Screen | File |
|---------------|---------------|------|
| `CSVImport.tsx` (320 lines) | `CSVImportScreen` | `screens/import/CSVImportScreen.tsx` |
| `EncircleImport.tsx` (516 lines) | `EncircleImportScreen` | `screens/import/EncircleImportScreen.tsx` |
| `Calendar.tsx` (469 lines) | `CalendarScreen` | `screens/CalendarScreen.tsx` |
| `MaintenanceTab.tsx` (396 lines) | `MaintenanceTab` (component) | `components/MaintenanceTab.tsx` |
| `MediaManagement.tsx` (675 lines) | `MediaManagementScreen` | `screens/MediaManagementScreen.tsx` |
| `InsuranceTab.tsx` (806 lines) | `InsuranceTab` (component) | `components/InsuranceTab.tsx` |
| `UserSettings.tsx` (1,608 lines) | `SettingsScreen` | `screens/SettingsScreen.tsx` |

### Shared Sub-components to Extract

These components are reused across multiple screens:

| Component | Used By | Purpose |
|-----------|---------|---------|
| `LocationPicker` | CSV Import, Encircle Import, Media Management | Hierarchical location selector with depth indicators |
| `UserRoleBadge` | User list, User edit | Colored role chip (admin/editor/viewer) |
| `ConfirmDialog` | Delete operations, Bulk delete, Revoke actions | Reusable confirmation alert wrapper |
| `StatusIndicator` | AI config, Plugins, System status | Green/yellow/red dot with label |
| `ColorSwatchPicker` | Maintenance task form | Row of tappable color circles |
| `EmptyState` | All list screens | Consistent "no data" illustration + message |

---

## Shared Utilities

### API Service Layer

Create dedicated API modules for each admin domain:

```
src/
  api/
    admin/
      users.ts      # User CRUD + location access
      logs.ts       # Log settings, files, content
      ai.ts         # AI provider config, testing
      plugins.ts    # Plugin CRUD + testing
      gdrive.ts     # Google Drive backup operations
      status.ts     # System status + config status
      settings.ts   # Global settings
    maintenance.ts  # Maintenance task CRUD
    media.ts        # Media stats, list, bulk ops
    imports.ts      # CSV + Encircle import
```

### Form Validation

Use a shared validation helper for common patterns:

```typescript
// shared/validation.ts
export const validators = {
  required: (value: string) => value.trim() ? null : 'Required',
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email',
  url: (value: string) => /^https?:\/\/.+/.test(value) ? null : 'Invalid URL',
  hexColor: (value: string) => /^#[0-9a-fA-F]{6}$/.test(value) ? null : 'Invalid color',
  minLength: (min: number) => (value: string) =>
    value.length >= min ? null : `Minimum ${min} characters`,
};
```

---

## Acceptance Criteria

### Data Import
- [ ] CSV import: pick file from device, upload, show results (items created, errors)
- [ ] CSV import: auto-create locations toggle works
- [ ] CSV import: parent location selection works
- [ ] Encircle import: pick XLSX + images from device
- [ ] Encircle import: preview step shows locations, items, and image matches
- [ ] Encircle import: confirm step completes import and shows results

### Maintenance
- [ ] Calendar screen displays tasks with color-coded dots (overdue/due soon/upcoming)
- [ ] Calendar month navigation works
- [ ] Tapping a day shows tasks for that date
- [ ] Create a new maintenance task with all fields (name, description, due date, recurrence, color)
- [ ] Edit an existing task
- [ ] Delete a task with confirmation
- [ ] Mark a task complete (updates `last_completed`, recalculates `next_due_date`)
- [ ] Per-item maintenance tab shows only that item's tasks

### Media Management
- [ ] Grid view displays all media with thumbnails
- [ ] Filter by media type (photo/video) works
- [ ] Filter by location works
- [ ] Infinite scroll pagination loads more items
- [ ] Multi-select mode via long press
- [ ] Bulk delete with confirmation dialog
- [ ] Reassign media to a different item
- [ ] Storage stats display (total size, counts)

### Admin Panel
- [ ] Admin section list navigates to all sub-screens
- [ ] **Users:** List, create, edit, delete users
- [ ] **Users:** Role assignment (admin/editor/viewer)
- [ ] **Users:** Location access control
- [ ] **Users:** Cannot delete self, cannot remove last admin
- [ ] **AI:** View and configure AI providers
- [ ] **AI:** Test connection per provider
- [ ] **Logs:** View log settings, change log level
- [ ] **Logs:** View log files and their content
- [ ] **Logs:** Rotate and cleanup logs
- [ ] **Plugins:** List, create, edit, delete plugins
- [ ] **Plugins:** Test plugin connection
- [ ] **Status:** Display system info, API key status, service status

### User Settings
- [ ] Edit profile (name, password)
- [ ] Generate / copy / revoke API key
- [ ] Theme selection (light/dark/system) applies immediately
- [ ] Color palette selection applies immediately
- [ ] Locale settings (currency, date format) persist and apply
- [ ] User stats display

### Insurance
- [ ] Insurance tab visible only on primary locations
- [ ] All insurance fields editable (company, policy, holders, property)
- [ ] Add/remove additional policy holders
- [ ] Calculated totals display (property + items value)
- [ ] Export/share insurance summary as PDF

### Google Drive
- [ ] Connect Google Drive via OAuth flow
- [ ] Create backup manually
- [ ] List existing backups with dates and sizes
- [ ] Delete individual backups
- [ ] Disconnect Google Drive

### Push Notifications
- [ ] Request notification permissions on first relevant action
- [ ] Schedule maintenance reminders (1 day before due)
- [ ] Send overdue alerts
- [ ] Tapping a notification navigates to the relevant task
- [ ] Notification preferences in User Settings

---

## Risk & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Google OAuth flow differences on iOS vs Android | High | Medium | Test on both platforms early; use `expo-auth-session` which abstracts differences |
| `AdminPage.tsx` decomposition misses shared state | Medium | Medium | Identify all cross-tab state in web version before starting; use React Context or Zustand for shared admin state |
| Large media grids cause memory pressure | High | Medium | Use `FlatList` with `removeClippedSubviews`, limit thumbnail resolution, implement proper image caching with `expo-image` |
| Notification scheduling lost on app restart | Medium | Low | Re-schedule all pending notifications on app launch from maintenance task data |
| Encircle import with many images is slow on mobile | Medium | High | Show upload progress per-image; consider compressing images before upload; set appropriate timeout |
| `expo-document-picker` inconsistencies across OS versions | Low | Medium | Test on minimum supported OS versions; provide fallback error messages |

---

## Dependencies Summary

| Package | Purpose | Phase 4 Section |
|---------|---------|-----------------|
| `expo-document-picker` | CSV and XLSX file selection | 4.1, 4.2 |
| `react-native-calendars` | Calendar grid display | 4.3 |
| `@react-native-community/datetimepicker` | Date selection in forms | 4.3, 4.7 |
| `expo-notifications` | Push notification scheduling | 4.9 |
| `expo-auth-session` | Google OAuth for Drive | 4.8 |
| `expo-print` | PDF generation for insurance export | 4.7 |
| `expo-sharing` | Share files (PDF, CSV) | 4.7 |
| `expo-clipboard` | Copy API key to clipboard | 4.6 |
| `expo-haptics` | Tactile feedback on task completion | 4.3 |
| `@react-native-picker/picker` | Dropdown selectors | Multiple |
| `expo-image` | Optimized image loading in media grid | 4.4 |

---

*Previous: [Phase 3 — Item Detail & Media](./03-Item-Detail-Media.md) · Next: [Phase 5 — Polish & Release](./05-Polish-Release.md)*
