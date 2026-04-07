# NesVentory Mobile Conversion — Master Tracking

> **Document version:** 1.0  
> **Last updated:** 2025-02-27  
> **Status:** Planning

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Phase Overview](#phase-overview)
- [Component Migration Map](#component-migration-map)
- [API Client Migration Notes](#api-client-migration-notes)
- [Web-Only APIs Requiring Replacement](#web-only-apis-requiring-replacement)
- [localStorage Key Migration](#localstorage-key-migration)
- [Progress Checklist](#progress-checklist)
- [Risk Register](#risk-register)
- [Open Questions](#open-questions)

---

## Project Overview

NesVentory is a full-stack home inventory management system currently built as a **React 19 + TypeScript 5.x + Vite 7** single-page web application backed by a **FastAPI + SQLite** REST API. This project converts the web frontend into a dedicated **Expo + React Native** mobile application.

### Key Principles

- **Backend stays untouched** — the mobile app consumes the same `/api/*` REST endpoints as the web client.
- **Web frontend remains operational** — this is a **new** mobile client, not a replacement.
- **Feature parity is the goal** — every user-facing feature in the web app should have a mobile equivalent, adapted for touch interaction and native capabilities.
- **Native where it matters** — camera, BLE printer communication, barcode scanning, and push notifications leverage native platform APIs through Expo/React Native modules.

### Current Web Codebase Metrics

| Metric | Value |
|--------|-------|
| Total component files | 30 `.tsx` files |
| Largest component | `AdminPage.tsx` — 4,114 lines |
| API client | `src/lib/api.ts` — 2,694 lines, ~126 exported functions |
| Utility modules | `theme.ts`, `niimbot.ts`, `constants.ts`, `locale.ts`, `types.ts`, `utils.ts`, `useMobile.ts` |
| Web-only type defs | `web-bluetooth.d.ts`, `web-serial.d.ts` |

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Expo ~54 + React Native | Managed workflow with dev client for native modules |
| **Language** | TypeScript 5.x | Matches existing web codebase |
| **State Management** | Zustand | Replaces React `useState`/context patterns in `App.tsx` |
| **Navigation** | `@react-navigation/native` (stack + bottom tabs) | Stack navigators per tab, modal stack for forms |
| **Auth Storage** | `@react-native-async-storage/async-storage` | Replaces `localStorage` for token/user persistence |
| **HTTP Client** | `fetch` (ported from existing `src/lib/api.ts`) | Native `fetch` in React Native — minimal changes needed |
| **Camera / Photos** | `expo-camera`, `expo-image-picker` | Camera for AI detection, picker for photo uploads |
| **BLE (Printer)** | `react-native-ble-plx` | NIIMBOT thermal printer communication over Bluetooth LE |
| **QR Generation** | `react-native-qrcode-svg` | SVG-based QR codes — replaces Canvas-based rendering |
| **Barcode Scanning** | `expo-barcode-scanner` | Native barcode/QR reader |
| **File System** | `expo-file-system` | Replaces `FileReader`, `URL.createObjectURL`, `Blob` patterns |
| **Printing** | `react-native-print` | Replaces `window.print()` / `window.open()` print flows |
| **Testing** | Jest + Detox (E2E) | Unit tests with Jest, end-to-end with Detox |
| **CI/CD** | EAS Build + EAS Submit | Cloud builds for iOS/Android, app store submission |

---

## Phase Overview

| Phase | Name | Key Deliverables | Dependencies | Status |
|:-----:|------|-----------------|:------------:|:------:|
| **1** | **Project Setup & Foundation** | Expo init, navigation skeleton (stack + bottom tabs), Zustand stores (auth, inventory, theme), API client adaptation, login/register screens, dark/light theming | None | Not Started |
| **2** | **Core Inventory** | Items list (FlatList), item create/edit form, item detail view, locations tree/list, location detail/edit, tags management, search & filter, bulk operations | Phase 1 | Not Started |
| **3** | **Media & AI Features** | Photo upload via `expo-image-picker`, photo viewer, document upload/viewing, AI item detection with native camera, barcode/QR scanning | Phase 1, Phase 2 | Not Started |
| **4** | **Advanced Features** | CSV import, Encircle import, maintenance calendar, media management screen, admin panel, insurance reports, Google Drive backup, locale/language settings | Phase 2, Phase 3 | Not Started |
| **5** | **Printer Integration** | NIIMBOT BLE connection manager, QR label generation (SVG-based), print workflow with model-specific settings, USB serial fallback. **⚠ Requires Expo dev client or bare workflow eject.** | Phase 1 | Not Started |
| **6** | **Testing, Polish & Release** | E2E test suite (Detox), iOS platform tuning, Android platform tuning, performance optimization, accessibility pass, app store assets, release builds | All Phases | Not Started |

### Phase Dependency Graph

```
Phase 1 (Foundation)
  ├──▶ Phase 2 (Core Inventory)
  │       ├──▶ Phase 3 (Media & AI)
  │       │       └──▶ Phase 4 (Advanced Features)
  │       └──▶ Phase 4 (Advanced Features)
  ├──▶ Phase 5 (Printer Integration)
  └──▶ Phase 6 (Testing & Release) ◀── All Phases
```

---

## Component Migration Map

Every web component maps to a mobile screen or component. Components marked with ⚠ require significant rework due to web-only API dependencies.

| Web Component | Lines | Mobile Equivalent | Migration Notes |
|--------------|:-----:|-------------------|-----------------|
| `App.tsx` | — | Navigation container + Zustand stores | Auth state, user context, theme → Zustand; routing → React Navigation |
| `Layout.tsx` | — | Bottom tab navigator + drawer | Sidebar → drawer navigation; header → stack navigator headers |
| `LoginForm.tsx` | 268 | `LoginScreen` | Native `TextInput` components; OIDC flow via `expo-auth-session` |
| `RegisterForm.tsx` | — | `RegisterScreen` | Straightforward port to native inputs |
| `OIDCCallback.tsx` | — | Handled by `expo-auth-session` | Deep link callback replaces URL-based callback |
| `InventoryPage.tsx` | 1,609 | `InventoryScreen` (`FlatList`) | `<table>` → `FlatList` with item cards; column config → sort/filter UI |
| `ItemsTable.tsx` | 428 | `ItemCard` component | Table rows → card-based list items |
| `ItemForm.tsx` | 2,437 | `ItemFormScreen` (`ScrollView` + sections) | Large form — split into collapsible sections; `URL.createObjectURL` → `expo-file-system` |
| `AddItemModal.tsx` | 264 | `AddItemScreen` (modal stack) | Modal → full-screen stack navigation |
| `ItemDetails.tsx` | 760 | `ItemDetailScreen` | Tab layout within screen; photo gallery → `FlatList` horizontal |
| `LocationsPage.tsx` | 926 | `LocationsScreen` (`SectionList`) | Tree view → expandable `SectionList`; drag-and-drop needs RN gesture handler |
| `LocationsTree.tsx` | — | `LocationTreeView` component | Recursive tree → collapsible list sections |
| `LocationDetailsModal.tsx` | 432 | `LocationDetailScreen` | Modal → stack screen |
| ⚠ `QRLabelPrint.tsx` | 1,229 | `PrintScreen` (`react-native-qrcode-svg` + BLE) | Canvas API → `react-native-skia` or SVG; Web Bluetooth → `react-native-ble-plx` |
| ⚠ `AIDetection.tsx` | 492 | `AIDetectionScreen` (`expo-camera`) | Web camera access → `expo-camera` with real-time frame processing |
| `Calendar.tsx` | 469 | `CalendarScreen` | HTML calendar → `react-native-calendars` |
| `MaintenanceTab.tsx` | 396 | `MaintenanceScreen` | Straightforward port |
| `AdminPage.tsx` | 4,114 | `AdminScreen` (tabs) | **Must decompose** — split into `AdminUsersTab`, `AdminFieldsTab`, `AdminSystemTab`, etc. |
| `UserSettings.tsx` | 1,608 | `SettingsScreen` | Large component — split into sections/sub-screens |
| `ThemeSettings.tsx` | — | `ThemeSettingsScreen` | `matchMedia` → RN `Appearance` API |
| `ThemeContext.tsx` | — | Zustand theme store | Context → Zustand; `localStorage` → `AsyncStorage` |
| `LocaleSettings.tsx` | — | `LocaleScreen` | Expo localization module |
| `MediaManagement.tsx` | 675 | `MediaScreen` | File previews → `Image` + `expo-file-system`; bulk operations → multi-select |
| `CSVImport.tsx` | 320 | `ImportScreen` (CSV tab) | File picker → `expo-document-picker`; `FileReader` → `expo-file-system` |
| `EncircleImport.tsx` | 516 | `ImportScreen` (Encircle tab) | Combined with CSV into tabbed import screen |
| `InsuranceTab.tsx` | 806 | `InsuranceScreen` | `window.print()` → `react-native-print`; `URL.createObjectURL` → temp file |
| `DashboardCards.tsx` | — | `DashboardScreen` | Card layout → RN `View` + `StyleSheet` grid |
| `PhotoModal.tsx` | — | `PhotoViewerScreen` | Modal image viewer → `react-native-image-viewing` |
| `EnrichmentModal.tsx` | 274 | `EnrichmentSheet` | Modal → bottom sheet (`@gorhom/bottom-sheet`) |
| `SetPasswordModal.tsx` | — | `SetPasswordScreen` | Modal → stack screen |
| `Status.tsx` | — | `StatusBanner` component | Toast/banner notification component |

---

## API Client Migration Notes

The existing `src/lib/api.ts` (2,694 lines, ~126 exported functions) is **largely portable** to React Native because it uses the standard `fetch` API throughout.

### Required Changes

1. **Base URL configuration**
   ```typescript
   // Web (current)
   const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

   // Mobile (new)
   import Constants from 'expo-constants';
   const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || "https://your-server.com";
   ```

2. **Authentication strategy**
   - The web app uses **HttpOnly cookies** set by the backend — `fetch` on React Native supports cookies with `credentials: 'include'`.
   - However, cookie behavior on mobile is inconsistent across platforms. **Recommended approach:** add a `Bearer` token header option to the backend and use `AsyncStorage` to persist the JWT on mobile.
   - The existing `window.dispatchEvent(new Event("auth:unauthorized"))` pattern (line 256 of `api.ts`) must be replaced with a Zustand store action or an event emitter.

3. **File uploads**
   ```typescript
   // Web (current) — uses File/Blob from <input type="file">
   const formData = new FormData();
   formData.append("file", fileBlob);

   // Mobile (new) — uses uri from expo-image-picker
   const formData = new FormData();
   formData.append("file", {
     uri: imageResult.assets[0].uri,
     name: "photo.jpg",
     type: "image/jpeg",
   } as any);
   ```

4. **Error handling**
   - The `HttpOnly cookie` comment at line 313 confirms tokens are not stored in `localStorage` — but `localStorage.getItem("NesVentory_user_email")` and `localStorage.getItem("NesVentory_currentUser")` in `App.tsx` must migrate to `AsyncStorage`.

### Functions That Need No Changes

The vast majority of API functions follow this pattern and port directly:

```typescript
export async function getItems(params?: ItemQueryParams): Promise<Item[]> {
  const query = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE}/api/items?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

## Web-Only APIs Requiring Replacement

| Web API | Used In | Occurrences | Mobile Replacement | Complexity |
|---------|---------|:-----------:|-------------------|:----------:|
| **Web Bluetooth** | `niimbot.ts`, `QRLabelPrint.tsx` | 2 files | `react-native-ble-plx` | 🔴 High |
| **Web Serial** | `niimbot.ts` | 1 file | `react-native-usb-serial` (or BLE only) | 🔴 High |
| **Canvas API** | `QRLabelPrint.tsx` | ~40 usages | `react-native-skia` or `react-native-canvas` | 🔴 High |
| **`window.print()`** | `InsuranceTab.tsx`, `Calendar.tsx` | 3 calls | `react-native-print` | 🟡 Medium |
| **`window.open()`** | `InsuranceTab.tsx`, `QRLabelPrint.tsx` | 3 calls | In-app navigation / `react-native-print` | 🟡 Medium |
| **`FileReader`** | `ItemForm.tsx`, modals | Implicit via `File` | `expo-file-system` | 🟢 Low |
| **`URL.createObjectURL()`** | `ItemForm.tsx`, `AddItemModal.tsx`, `InsuranceTab.tsx` | 5 calls | `expo-file-system` + `Image` component `uri` | 🟢 Low |
| **`window.matchMedia()`** | `theme.ts` | 1 call | RN `Appearance.getColorScheme()` | 🟢 Low |
| **`localStorage`** | `App.tsx`, `theme.ts`, `QRLabelPrint.tsx`, `ItemForm.tsx`, `InventoryPage.tsx`, `LocationsPage.tsx`, `AdminPage.tsx`, `LoginForm.tsx` | 18+ calls | `@react-native-async-storage/async-storage` | 🟢 Low |
| **`window.dispatchEvent()`** | `api.ts` (auth) | 1 call | Zustand store action + event emitter | 🟢 Low |
| **`document.createElement('canvas')`** | `QRLabelPrint.tsx` | 6 calls | `react-native-skia` rendering pipeline | 🔴 High |
| **`navigator.serial`** | `niimbot.ts` | 1 check | Omit or use `react-native-usb-serial` | 🟡 Medium |

---

## localStorage Key Migration

All `localStorage` keys used in the web app must migrate to `AsyncStorage` (async API — all reads become `await`).

| localStorage Key | Used In | Purpose |
|-----------------|---------|---------|
| `NesVentory_user_email` | `LoginForm.tsx`, `App.tsx` | Cached user email |
| `NesVentory_currentUser` | `App.tsx` | Cached user profile (non-sensitive fields) |
| `NesVentory_CustomFieldsTemplate` | `AdminPage.tsx`, `ItemForm.tsx` | Custom field presets |
| `NesVentory_itemColumns` | `InventoryPage.tsx` | Column visibility preferences |
| `THEME_STORAGE_KEY` (from `theme.ts`) | `theme.ts`, `ThemeContext.tsx` | Dark/light mode preference |
| `PRINT_PREFS_KEY` | `QRLabelPrint.tsx` | Printer/label preferences |
| `PRINT_TIP_SEEN_KEY` | `LocationsPage.tsx` | First-time guidance flag |

> **Note:** `AsyncStorage` is asynchronous unlike `localStorage`. All `getItem`/`setItem` calls must use `await` or be wrapped in `useEffect` with state hydration patterns. Consider using `zustand/middleware` with an `AsyncStorage` persistence adapter for seamless store hydration.

---

## Progress Checklist

### Phase 1 — Project Setup & Foundation

- [ ] Expo project initialized (`npx create-expo-app`)
- [ ] TypeScript configuration
- [ ] Navigation structure (stack + bottom tabs)
- [ ] Zustand auth store (login state, user profile, token)
- [ ] Zustand inventory store (items, locations, tags cache)
- [ ] Zustand theme store (dark/light, persisted to AsyncStorage)
- [ ] API client adapted for React Native (`fetch` + base URL config)
- [ ] Auth interceptor (401 handling → Zustand action)
- [ ] Login screen
- [ ] Register screen
- [ ] OIDC login flow (`expo-auth-session`)
- [ ] Theme system (dark/light with RN `Appearance` API)
- [ ] Splash screen + app icon

### Phase 2 — Core Inventory

- [ ] Items list screen (`FlatList` with pull-to-refresh)
- [ ] Item card component
- [ ] Item create/edit form (`ScrollView` + collapsible sections)
- [ ] Item detail view (tabs: details, photos, maintenance, insurance)
- [ ] Locations tree/list (`SectionList` with expand/collapse)
- [ ] Location detail/edit screen
- [ ] Tags management screen
- [ ] Search & filter (text search, location filter, tag filter, custom fields)
- [ ] Bulk operations (multi-select, bulk delete, bulk move)
- [ ] Dashboard / home screen with summary cards

### Phase 3 — Media & AI Features

- [ ] Photo upload (`expo-image-picker` — camera + gallery)
- [ ] Photo viewer (full-screen, zoom, swipe gallery)
- [ ] Document upload (`expo-document-picker`)
- [ ] Document viewer
- [ ] AI item detection via camera (`expo-camera` + backend AI endpoint)
- [ ] Barcode scanning (`expo-barcode-scanner`)
- [ ] QR code scanning

### Phase 4 — Advanced Features

- [ ] CSV import (`expo-document-picker` + parsing)
- [ ] Encircle import
- [ ] Maintenance calendar (`react-native-calendars`)
- [ ] Maintenance scheduling & reminders (push notifications)
- [ ] Media management screen (bulk operations on photos/docs)
- [ ] Admin panel — user management tab
- [ ] Admin panel — custom fields tab
- [ ] Admin panel — system settings tab
- [ ] Insurance report generation
- [ ] Google Drive backup integration
- [ ] Locale / language settings

### Phase 5 — Printer Integration

- [ ] BLE scanning & NIIMBOT device discovery
- [ ] BLE connection manager (connect, disconnect, reconnect)
- [ ] NIIMBOT protocol implementation (ported from `niimbot.ts`)
- [ ] QR label generation (SVG-based via `react-native-qrcode-svg`)
- [ ] Label rendering pipeline (replaces Canvas-based approach)
- [ ] Print workflow (model selection → label preview → print)
- [ ] Printer status monitoring
- [ ] USB serial fallback (optional — `react-native-usb-serial`)

### Phase 6 — Testing, Polish & Release

- [ ] Unit tests (Jest — stores, utilities, API client)
- [ ] Component tests (React Native Testing Library)
- [ ] E2E tests — auth flow (Detox)
- [ ] E2E tests — inventory CRUD (Detox)
- [ ] E2E tests — photo capture (Detox)
- [ ] iOS platform tuning (safe areas, haptics, gestures)
- [ ] Android platform tuning (back button, Material styling, permissions)
- [ ] Performance optimization (list virtualization, image caching, bundle size)
- [ ] Accessibility pass (screen reader, font scaling, contrast)
- [ ] App store assets (screenshots, descriptions, metadata)
- [ ] iOS release build + TestFlight
- [ ] Android release build + Play Store internal testing
- [ ] Production release

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|:-:|------|:----------:|:------:|------------|
| 1 | **HttpOnly cookie auth may not work seamlessly on React Native** — cookie handling varies between iOS and Android, and some RN networking libraries strip cookies. | High | High | Add a `Bearer` token auth option to the FastAPI backend alongside the existing cookie auth. Mobile client sends `Authorization: Bearer <jwt>` header; web client continues using cookies. |
| 2 | **Expo managed workflow may not support BLE** — `react-native-ble-plx` requires native code that isn't included in Expo Go. | High | Medium | Use **Expo dev client** (custom development build) which supports native modules. If needed, eject to bare workflow for Phase 5 only. |
| 3 | **Large components need careful decomposition** — `AdminPage.tsx` (4,114 lines), `ItemForm.tsx` (2,437 lines), and `UserSettings.tsx` (1,608 lines) are monolithic. | Medium | Medium | Decompose during migration: split `AdminPage` into ≥4 sub-screens/tabs, `ItemForm` into collapsible form sections, `UserSettings` into a settings list with sub-screens. |
| 4 | **Canvas-dependent QR label generation needs alternative rendering** — the web app uses `document.createElement('canvas')` extensively in `QRLabelPrint.tsx` (~6 canvas instances, 40+ canvas API calls) for label layout. | High | High | Replace with `react-native-skia` for 2D rendering or generate label images server-side. Alternatively, use `react-native-qrcode-svg` for QR codes and `react-native-svg` for label layout, converting to bitmap via `react-native-view-shot`. |
| 5 | **NIIMBOT protocol porting complexity** — `niimbot.ts` is tightly coupled to Web Bluetooth and Web Serial APIs with manufacturer-specific packet structures. | Medium | High | Port protocol logic (packet encoding/decoding) separately from transport layer. Create a transport abstraction that supports both `react-native-ble-plx` (BLE) and optional USB serial. Reference existing [NIIMBOT docs](../NIIMBOT/README.md). |
| 6 | **Offline support expectations** — mobile users expect apps to work without connectivity. | Medium | Medium | Implement progressive offline support: cache last-fetched inventory in Zustand + AsyncStorage; queue mutations for sync when online. Full offline-first is a post-v1 goal. |
| 7 | **React 19 features may not be available in React Native** — the web app uses React 19 (^19.2.3), but React Native's React version may lag. | Low | Medium | Verify Expo SDK 54's bundled React version. Avoid React 19-specific features (Server Components, `use()` hook) in shared code. |
| 8 | **App store review rejection** — Apple/Google may reject for incomplete features or policy violations. | Low | High | Submit with complete core features (Phases 1–3 minimum). Follow platform guidelines from day one. Plan for 1–2 review cycles. |

---

## Open Questions

> Track decisions that still need to be made.

| # | Question | Options | Decision | Date |
|:-:|----------|---------|:--------:|:----:|
| 1 | Auth strategy for mobile client? | A) Reuse HttpOnly cookies with `credentials: 'include'` B) Add Bearer token header support to backend | — | — |
| 2 | Monorepo or separate repo? | A) Monorepo (web + mobile share `types.ts`, `api.ts`) B) Separate repo with shared npm package | — | — |
| 3 | Minimum supported OS versions? | A) iOS 15+ / Android 10+ B) iOS 16+ / Android 12+ | — | — |
| 4 | Offline support scope for v1? | A) Read-only cache B) Full offline CRUD with sync C) No offline for v1 | — | — |
| 5 | Label rendering approach? | A) `react-native-skia` B) SVG → bitmap via `react-native-view-shot` C) Server-side rendering | — | — |

---

## Related Documents

- [NIIMBOT Printer Documentation](../NIIMBOT/README.md)
- [NIIMBOT Printer Models](../NIIMBOT/Printer_Models/)
- [Phase Documents](../Phase%20Documents/)
- [Project CLAUDE.md](../CLAUDE.md)

---

*This document is the single source of truth for the NesVentory mobile conversion project. Update phase statuses and check off deliverables as work progresses.*
