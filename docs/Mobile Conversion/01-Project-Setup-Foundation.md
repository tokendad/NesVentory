# Phase 1: Project Setup & Foundation

**Status:** 🔲 NOT STARTED  
**Estimated Effort:** 20–28 hours  
**Dependencies:** None — this is the foundational phase  
**Target:** Expo SDK 52+ / React Native 0.76+

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [1.1 Project Initialization](#11-project-initialization)
- [1.2 Navigation Architecture](#12-navigation-architecture)
- [1.3 State Management (Zustand)](#13-state-management-zustand)
- [1.4 API Client Adaptation](#14-api-client-adaptation)
- [1.5 Authentication Flow](#15-authentication-flow)
- [1.6 Theming System](#16-theming-system)
- [1.7 Shared Types & Constants](#17-shared-types--constants)
- [1.8 Development Environment](#18-development-environment)
- [Acceptance Criteria](#acceptance-criteria)

---

## Overview

This phase initializes the Expo + React Native project and establishes **all foundational infrastructure**: navigation, state management, authentication, theming, and API client adaptation.

The NesVentory web app is a single-page React 19 + TypeScript application built with Vite. It uses:

- **No state management library** — pure `useState` in `App.tsx` with prop drilling
- **HttpOnly cookie auth** — JWT tokens set as HttpOnly cookies via `credentials: 'include'`
- **Custom event system** — `window.dispatchEvent(new Event("auth:unauthorized"))` for 401 handling
- **CSS variables** for theming — 18 variables across 6 color palettes × 2 modes
- **A monolithic API client** — `src/lib/api.ts` (2,694 lines, 150+ exported functions)

The mobile app will modernize this with Zustand stores, secure token storage, and native navigation — while reusing the same backend API unchanged.

---

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Expo CLI | Latest (`npx expo`) | Build & development toolchain |
| iOS Simulator | Xcode 15+ (macOS only) | iOS testing |
| Android Emulator | Android Studio + API 34+ | Android testing |
| NesVentory Backend | v6.12+ running locally or remotely | API target |
| Git | 2.30+ | Version control |

> **Note:** The backend already supports `Authorization: Bearer <token>` headers (in addition to HttpOnly cookies), so no backend changes are required for mobile auth.

---

## 1.1 Project Initialization

**Estimated Effort:** 2–3 hours

### Create the Project

```bash
npx create-expo-app NesVentory-Mobile --template expo-template-blank-typescript
cd NesVentory-Mobile
```

### Install Required Dependencies

**Navigation:**

```bash
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
```

**State Management & Storage:**

```bash
npx expo install zustand
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
```

**Auth (OAuth/OIDC):**

```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
```

**Utilities:**

```bash
npx expo install expo-constants expo-status-bar expo-image-picker expo-file-system
```

> **Why `npx expo install`?** It resolves the exact version compatible with your Expo SDK, preventing native module version mismatches.

### Project Directory Structure

Create the following structure under `src/`:

```
src/
├── screens/                  # Full-screen components
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── OIDCCallbackScreen.tsx
│   ├── inventory/
│   │   ├── InventoryScreen.tsx
│   │   ├── ItemDetailScreen.tsx
│   │   └── ItemFormScreen.tsx
│   ├── locations/
│   │   ├── LocationsScreen.tsx
│   │   └── LocationDetailScreen.tsx
│   ├── calendar/
│   │   └── CalendarScreen.tsx
│   ├── media/
│   │   └── MediaScreen.tsx
│   └── settings/
│       ├── SettingsScreen.tsx
│       ├── AdminScreen.tsx
│       ├── ThemeScreen.tsx
│       └── LocaleScreen.tsx
├── components/               # Reusable UI components
│   ├── common/               # Buttons, inputs, modals, cards
│   ├── inventory/            # Item cards, item forms, search bars
│   ├── locations/            # Location tree, location picker
│   └── media/                # Photo grid, document viewer
├── navigation/               # Navigation configuration
│   ├── RootNavigator.tsx
│   ├── AuthStack.tsx
│   ├── MainTabs.tsx
│   └── types.ts              # Navigation param types
├── stores/                   # Zustand stores
│   ├── authStore.ts
│   ├── inventoryStore.ts
│   ├── uiStore.ts
│   └── settingsStore.ts
├── lib/                      # API client, constants, utils
│   ├── api.ts                # Adapted from web's api.ts
│   ├── constants.ts          # Ported from web (brands, retailers, types)
│   ├── utils.ts              # Ported from web (formatters)
│   └── config.ts             # Environment-specific configuration
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts
│   ├── useItems.ts
│   └── useLocations.ts
├── types/                    # TypeScript type definitions
│   ├── api.ts                # API response/request types
│   ├── models.ts             # Item, Location, User, Tag types
│   └── navigation.ts         # Navigation param list types
└── theme/                    # Theme configuration
    ├── colors.ts             # Color palette definitions
    ├── spacing.ts            # Spacing scale
    ├── typography.ts         # Font sizes and families
    └── ThemeProvider.tsx      # Theme context + Zustand integration
```

Scaffold it:

```bash
mkdir -p src/{screens/{auth,inventory,locations,calendar,media,settings},components/{common,inventory,locations,media},navigation,stores,lib,hooks,types,theme}
```

---

## 1.2 Navigation Architecture

**Estimated Effort:** 3–4 hours

### Web → Mobile View Mapping

The web app uses a `view` state variable in `App.tsx` to switch between views:

| Web `view` Value | Mobile Screen | Tab |
|---|---|---|
| `"inventory"` | `InventoryScreen` → `ItemDetailScreen` → `ItemFormScreen` | Inventory Tab |
| (locations modal) | `LocationsScreen` → `LocationDetailScreen` | Locations Tab |
| `"calendar"` | `CalendarScreen` | Calendar Tab |
| `"media"` | `MediaScreen` | Media Tab |
| `"user-settings"` | `SettingsScreen` → `ThemeScreen`, `LocaleScreen` | Settings Tab |
| `"admin"` | `AdminScreen` (nested under Settings) | Settings Tab |
| (login/register) | `LoginScreen` / `RegisterScreen` | Auth Stack |
| (OIDC callback) | `OIDCCallbackScreen` | Auth Stack |

### Navigation Param Types

```typescript
// src/navigation/types.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// --- Auth Stack ---
export type AuthStackParamList = {
  Login: { returnTo?: string } | undefined;
  Register: undefined;
  OIDCCallback: { code: string; state: string };
};

// --- Individual Tab Stacks ---
export type InventoryStackParamList = {
  InventoryList: undefined;
  ItemDetail: { itemId: number };
  ItemForm: { itemId?: number; mode: 'create' | 'edit' };
};

export type LocationsStackParamList = {
  LocationsList: undefined;
  LocationDetail: { locationId: number };
};

export type CalendarStackParamList = {
  CalendarMain: undefined;
};

export type MediaStackParamList = {
  MediaMain: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Admin: undefined;
  Theme: undefined;
  Locale: undefined;
};

// --- Main Tab Navigator ---
export type MainTabParamList = {
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  LocationsTab: NavigatorScreenParams<LocationsStackParamList>;
  CalendarTab: NavigatorScreenParams<CalendarStackParamList>;
  MediaTab: NavigatorScreenParams<MediaStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// --- Root Navigator ---
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
```

### Root Navigator

```typescript
// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDark = useSettingsStore((s) => s.isDark);

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Auth Stack

```typescript
// src/navigation/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OIDCCallbackScreen from '../screens/auth/OIDCCallbackScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OIDCCallback" component={OIDCCallbackScreen} />
    </Stack.Navigator>
  );
}
```

### Main Tab Navigator

```typescript
// src/navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import InventoryScreen from '../screens/inventory/InventoryScreen';
import ItemDetailScreen from '../screens/inventory/ItemDetailScreen';
import ItemFormScreen from '../screens/inventory/ItemFormScreen';
import LocationsScreen from '../screens/locations/LocationsScreen';
import LocationDetailScreen from '../screens/locations/LocationDetailScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import MediaScreen from '../screens/media/MediaScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminScreen from '../screens/settings/AdminScreen';
import ThemeScreen from '../screens/settings/ThemeScreen';
import LocaleScreen from '../screens/settings/LocaleScreen';
import { useSettingsStore } from '../stores/settingsStore';
import type {
  MainTabParamList,
  InventoryStackParamList,
  LocationsStackParamList,
  SettingsStackParamList,
} from './types';

// --- Inventory Stack ---
const InvStack = createNativeStackNavigator<InventoryStackParamList>();
function InventoryStack() {
  return (
    <InvStack.Navigator>
      <InvStack.Screen
        name="InventoryList"
        component={InventoryScreen}
        options={{ title: 'Inventory' }}
      />
      <InvStack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <InvStack.Screen
        name="ItemForm"
        component={ItemFormScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? 'Add Item' : 'Edit Item',
        })}
      />
    </InvStack.Navigator>
  );
}

// --- Locations Stack ---
const LocStack = createNativeStackNavigator<LocationsStackParamList>();
function LocationsStack() {
  return (
    <LocStack.Navigator>
      <LocStack.Screen
        name="LocationsList"
        component={LocationsScreen}
        options={{ title: 'Locations' }}
      />
      <LocStack.Screen
        name="LocationDetail"
        component={LocationDetailScreen}
        options={{ title: 'Location' }}
      />
    </LocStack.Navigator>
  );
}

// --- Settings Stack ---
const SetStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsStack() {
  return (
    <SetStack.Navigator>
      <SetStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <SetStack.Screen name="Admin" component={AdminScreen} />
      <SetStack.Screen name="Theme" component={ThemeScreen} />
      <SetStack.Screen name="Locale" component={LocaleScreen} />
    </SetStack.Navigator>
  );
}

// --- Tab Navigator ---
const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const isDark = useSettingsStore((s) => s.isDark);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            InventoryTab: focused ? 'cube' : 'cube-outline',
            LocationsTab: focused ? 'location' : 'location-outline',
            CalendarTab: focused ? 'calendar' : 'calendar-outline',
            MediaTab: focused ? 'images' : 'images-outline',
            SettingsTab: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDark ? '#38bdf8' : '#0284c7',
        tabBarInactiveTintColor: isDark ? '#6b7280' : '#9ca3af',
        tabBarStyle: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
        },
      })}
    >
      <Tab.Screen name="InventoryTab" component={InventoryStack} options={{ title: 'Inventory' }} />
      <Tab.Screen name="LocationsTab" component={LocationsStack} options={{ title: 'Locations' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Tab.Screen name="MediaTab" component={MediaScreen} options={{ title: 'Media' }} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
```

---

## 1.3 State Management (Zustand)

**Estimated Effort:** 4–5 hours

The web app manages all state in `App.tsx` using `useState` with prop drilling. The mobile app replaces this with **Zustand stores** for cleaner separation and persistence.

### Web State → Zustand Store Mapping

| Web State (`App.tsx`) | Zustand Store | Store Key |
|---|---|---|
| `token`, `currentUser`, `userEmail` | `useAuthStore` | `isAuthenticated`, `user`, `email` |
| `items`, `itemsLoading` | `useInventoryStore` | `items`, `loading.items` |
| `locations`, `locationsLoading` | `useInventoryStore` | `locations`, `loading.locations` |
| `tags` | `useInventoryStore` | `tags` |
| `searchQuery`, `selectedItem`, `editingItem` | `useUIStore` | `searchQuery`, `selectedItemId`, `isEditing` |
| `view` (inventory/media/settings/etc.) | Navigation state | (handled by React Navigation) |
| `localStorage: NesVentory_theme` | `useSettingsStore` | `themeMode`, `colorPalette` |
| `localStorage: NesVentory_locale` | `useSettingsStore` | `locale`, `currency`, `dateFormat` |

### Auth Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import * as api from '../lib/api';

interface User {
  id: number;
  email: string;
  display_name: string;
  role: 'admin' | 'viewer';
  is_approved: boolean;
  must_change_password: boolean;
}

interface AuthState {
  // State
  isAuthenticated: boolean;
  user: User | null;
  email: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithOIDC: (code: string, state: string, redirectUri: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// Token management — stored in encrypted SecureStore, NOT AsyncStorage
async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      email: '',
      isLoading: true, // true on boot — we check auth before showing anything
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(username, password);

          // Store JWT in SecureStore (the backend returns it in the response body
          // AND sets an HttpOnly cookie — mobile uses the response body token)
          await setToken(response.access_token);

          // Fetch user profile
          const user = await api.getCurrentUser();

          set({
            isAuthenticated: true,
            user,
            email: username,
            isLoading: false,
          });

          return { mustChangePassword: response.must_change_password ?? false };
        } catch (err) {
          set({
            isAuthenticated: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
          throw err;
        }
      },

      loginWithGoogle: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.googleOAuthLogin(idToken);
          await setToken(response.access_token);
          const user = await api.getCurrentUser();
          set({ isAuthenticated: true, user, isLoading: false });
        } catch (err) {
          set({
            isAuthenticated: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Google login failed',
          });
          throw err;
        }
      },

      loginWithOIDC: async (code, state, redirectUri) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.oidcCallback(code, state, redirectUri);
          await setToken(response.access_token);
          const user = await api.getCurrentUser();
          set({ isAuthenticated: true, user, isLoading: false });
        } catch (err) {
          set({
            isAuthenticated: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'OIDC login failed',
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // Ignore — server may already have invalidated the session
        }
        await clearToken();
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const token = await getToken();
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        try {
          const user = await api.getCurrentUser();
          set({ isAuthenticated: true, user, isLoading: false });
        } catch {
          // Token expired or invalid — clean up
          await clearToken();
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nesventory-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive data — token is in SecureStore
      partialState: (state) => ({
        email: state.email,
        // Do NOT persist: isAuthenticated, user, token (checked live on boot)
      }),
    },
  ),
);
```

### Inventory Store

```typescript
// src/stores/inventoryStore.ts
import { create } from 'zustand';
import * as api from '../lib/api';

interface InventoryState {
  items: api.Item[];
  locations: api.Location[];
  tags: api.Tag[];
  loading: {
    items: boolean;
    locations: boolean;
    tags: boolean;
  };
  error: string | null;

  // Data fetching
  fetchItems: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Item CRUD
  createItem: (data: api.CreateItemRequest) => Promise<api.Item>;
  updateItem: (id: number, data: api.UpdateItemRequest) => Promise<api.Item>;
  deleteItem: (id: number) => Promise<void>;
  deleteItems: (ids: number[]) => Promise<void>;

  // Optimistic updates
  setItems: (items: api.Item[]) => void;
  setLocations: (locations: api.Location[]) => void;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: [],
  locations: [],
  tags: [],
  loading: { items: false, locations: false, tags: false },
  error: null,

  fetchItems: async () => {
    set((s) => ({ loading: { ...s.loading, items: true } }));
    try {
      const items = await api.getItems();
      set({ items, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load items' });
    } finally {
      set((s) => ({ loading: { ...s.loading, items: false } }));
    }
  },

  fetchLocations: async () => {
    set((s) => ({ loading: { ...s.loading, locations: true } }));
    try {
      const locations = await api.getLocations();
      set({ locations, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load locations' });
    } finally {
      set((s) => ({ loading: { ...s.loading, locations: false } }));
    }
  },

  fetchTags: async () => {
    set((s) => ({ loading: { ...s.loading, tags: true } }));
    try {
      const tags = await api.getTags();
      set({ tags, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load tags' });
    } finally {
      set((s) => ({ loading: { ...s.loading, tags: false } }));
    }
  },

  fetchAll: async () => {
    await Promise.all([get().fetchItems(), get().fetchLocations(), get().fetchTags()]);
  },

  createItem: async (data) => {
    const item = await api.createItem(data);
    set((s) => ({ items: [...s.items, item] }));
    return item;
  },

  updateItem: async (id, data) => {
    const updated = await api.updateItem(id, data);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
    return updated;
  },

  deleteItem: async (id) => {
    await api.deleteItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  deleteItems: async (ids) => {
    await api.bulkDeleteItems(ids);
    set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
  },

  setItems: (items) => set({ items }),
  setLocations: (locations) => set({ locations }),
}));
```

### UI Store

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  searchQuery: string;
  selectedItemId: number | null;
  isEditing: boolean;

  setSearchQuery: (query: string) => void;
  selectItem: (id: number | null) => void;
  setEditing: (editing: boolean) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  searchQuery: '',
  selectedItemId: null,
  isEditing: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  selectItem: (id) => set({ selectedItemId: id }),
  setEditing: (editing) => set({ isEditing: editing }),
  reset: () => set({ searchQuery: '', selectedItemId: null, isEditing: false }),
}));
```

### Settings Store

```typescript
// src/stores/settingsStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ColorPalette = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal';

interface SettingsState {
  // Theme
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  isDark: boolean; // resolved value

  // Locale
  locale: string;
  currency: string;
  dateFormat: string;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setColorPalette: (palette: ColorPalette) => void;
  setLocale: (locale: string) => void;
  setCurrency: (currency: string) => void;
  setDateFormat: (format: string) => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      colorPalette: 'blue',
      isDark: resolveIsDark('system'),
      locale: 'en-US',
      currency: 'USD',
      dateFormat: 'short',

      setThemeMode: (mode) => set({ themeMode: mode, isDark: resolveIsDark(mode) }),
      setColorPalette: (palette) => set({ colorPalette: palette }),
      setLocale: (locale) => set({ locale }),
      setCurrency: (currency) => set({ currency }),
      setDateFormat: (format) => set({ dateFormat: format }),
    }),
    {
      name: 'nesventory-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { themeMode } = useSettingsStore.getState();
  if (themeMode === 'system') {
    useSettingsStore.setState({ isDark: colorScheme === 'dark' });
  }
});
```

---

## 1.4 API Client Adaptation

**Estimated Effort:** 4–6 hours

The web API client (`src/lib/api.ts`, 2,694 lines) uses `fetch()` with `credentials: 'include'` for cookie-based auth. The mobile client must switch to **Bearer token auth** since HttpOnly cookies are unreliable in React Native.

### Key Changes Required

| Web Pattern | Mobile Replacement | Reason |
|---|---|---|
| `credentials: 'include'` | `Authorization: Bearer <token>` header | HttpOnly cookies unreliable on RN |
| `import.meta.env.VITE_API_BASE_URL` | `Constants.expoConfig?.extra?.apiBaseUrl` | Vite env vars unavailable |
| `window.dispatchEvent(new Event("auth:unauthorized"))` | `useAuthStore.getState().logout()` | No `window` in RN |
| `new File(...)` for uploads | `{ uri, name, type }` object in FormData | RN file handling differs |
| `window.location.origin` | Config constant | No window/DOM |

### Configuration

```typescript
// src/lib/config.ts
import Constants from 'expo-constants';

// Reads from app.config.ts → extra.apiBaseUrl
// Falls back to localhost for development
export const API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiBaseUrl?.replace(/\/$/, '') ||
  __DEV__
    ? 'http://localhost:8080'
    : '';

// For the corresponding app.config.ts:
// export default {
//   expo: {
//     extra: {
//       apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
//     },
//   },
// };
```

### API Client Wrapper

```typescript
// src/lib/api.ts (top section — replaces web's fetch pattern)
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

// --- Auth Token Management ---
async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

// --- Core Fetch Wrapper ---
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Inject Bearer token (replaces credentials: 'include')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Default Content-Type for JSON bodies
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return handleResponse<T>(res);
}

// --- Response Handler (replaces web's handleResponse) ---
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      // Replace: window.dispatchEvent(new Event("auth:unauthorized"))
      // Direct store access — Zustand supports this outside React components
      const { useAuthStore } = require('../stores/authStore');
      useAuthStore.getState().logout();
    }

    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // Non-JSON error response — use raw text
    }
    throw new Error(message || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// --- Convenience Methods ---
export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
```

### Login Function (Modified for Mobile)

```typescript
// The login endpoint uses application/x-www-form-urlencoded (OAuth2 spec)
export async function login(
  username: string,
  password: string,
): Promise<{ access_token: string; token_type: string; must_change_password?: boolean }> {
  const body = new URLSearchParams();
  body.set('username', username);
  body.set('password', password);

  // Login does NOT use apiFetch — no token to inject yet
  const res = await fetch(`${API_BASE_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const data = JSON.parse(text);
      message = data.detail || 'Login failed';
    } catch {
      message = text || `HTTP ${res.status}`;
    }
    throw new Error(message);
  }

  // The backend returns the token in the response body AND sets an HttpOnly cookie.
  // Mobile uses the response body token; the cookie is ignored.
  return res.json();
}
```

### File Upload Adaptation

React Native doesn't use `File` objects — instead, `FormData` accepts `{ uri, name, type }`:

```typescript
// --- File Upload Helper ---
// React Native uses { uri, name, type } instead of File objects

interface RNFile {
  uri: string;   // e.g., "file:///path/to/photo.jpg" from expo-image-picker
  name: string;  // e.g., "photo.jpg"
  type: string;  // e.g., "image/jpeg"
}

export async function uploadItemPhoto(
  itemId: number,
  file: RNFile,
  options: {
    isPrimary?: boolean;
    isDataTag?: boolean;
    photoType?: string;
  } = {},
): Promise<unknown> {
  const token = await getAuthToken();
  const formData = new FormData();

  // React Native FormData accepts this shape directly
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any); // 'as any' needed — RN's FormData type differs from web

  if (options.isPrimary) formData.append('is_primary', 'true');
  if (options.isDataTag) formData.append('is_data_tag', 'true');
  if (options.photoType) formData.append('photo_type', options.photoType);

  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/photos`, {
    method: 'POST',
    headers: {
      // Do NOT set Content-Type — fetch sets it automatically with boundary for multipart
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return handleResponse(res);
}

// Same pattern for location photos and document uploads
export async function uploadLocationPhoto(locationId: number, file: RNFile): Promise<unknown> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return handleResponse(res);
}
```

### Functions That Port As-Is

Most API functions can be ported by simply replacing the `fetch()` call with `apiGet`/`apiPost`/`apiPut`/`apiDelete`. Examples:

```typescript
// Web:
// export async function getItems(): Promise<Item[]> {
//   const res = await fetch(`${API_BASE_URL}/api/items`, { credentials: 'include' });
//   return handleResponse<Item[]>(res);
// }

// Mobile:
export function getItems(): Promise<Item[]> {
  return apiGet<Item[]>('/api/items');
}

export function getItem(id: number): Promise<Item> {
  return apiGet<Item>(`/api/items/${id}`);
}

export function getLocations(): Promise<Location[]> {
  return apiGet<Location[]>('/api/locations');
}

export function getTags(): Promise<Tag[]> {
  return apiGet<Tag[]>('/api/tags');
}

export function getCurrentUser(): Promise<User> {
  return apiGet<User>('/api/users/me');
}

export function createItem(data: CreateItemRequest): Promise<Item> {
  return apiPost<Item>('/api/items', data);
}

export function updateItem(id: number, data: UpdateItemRequest): Promise<Item> {
  return apiPut<Item>(`/api/items/${id}`, data);
}

export function deleteItem(id: number): Promise<void> {
  return apiDelete<void>(`/api/items/${id}`);
}
```

### Web API References to Remove or Replace

| Web Reference | Mobile Replacement |
|---|---|
| `window.dispatchEvent(new Event("auth:unauthorized"))` | `useAuthStore.getState().logout()` |
| `window.location.origin` | `API_BASE_URL` from config |
| `window.location.search` | React Navigation route params |
| `window.location.href = url` | `Linking.openURL(url)` or `WebBrowser.openBrowserAsync(url)` |
| `window.location.reload()` | Not needed — Zustand re-renders automatically |
| `localStorage.getItem(...)` | `AsyncStorage.getItem(...)` |
| `localStorage.setItem(...)` | `AsyncStorage.setItem(...)` |
| `document.*` references | Remove entirely |

---

## 1.5 Authentication Flow

**Estimated Effort:** 4–5 hours

### Backend Auth Endpoints Reference

| Endpoint | Method | Purpose | Auth Required |
|---|---|---|---|
| `/api/token` | POST | Password login (OAuth2 form) | No |
| `/api/auth/logout` | POST | Clear session | Yes |
| `/api/users/me` | GET | Get current user profile | Yes |
| `/api/auth/registration/status` | GET | Is registration enabled? | No |
| `/api/auth/google/status` | GET | Google OAuth config | No |
| `/api/auth/google` | POST | Google OAuth login | No |
| `/api/auth/oidc/status` | GET | OIDC provider config | No |
| `/api/auth/oidc/login` | GET | Get OIDC authorization URL | No |
| `/api/auth/oidc/callback` | POST | OIDC callback exchange | No |

### Password Login Flow

```
┌──────────────┐      POST /api/token          ┌──────────────┐
│              │  ─────────────────────────────► │              │
│  LoginScreen │  username + password (form)     │   Backend    │
│              │  ◄───────────────────────────── │              │
└──────────────┘  { access_token, token_type }   └──────────────┘
       │
       │  Store token in SecureStore
       │  Fetch /api/users/me
       │  Update authStore
       ▼
┌──────────────┐
│   MainTabs   │
└──────────────┘
```

### Login Screen Skeleton

```typescript
// src/screens/auth/LoginScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import * as api from '../../lib/api';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcButtonText, setOidcButtonText] = useState('Login with SSO');
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  // Check which auth providers are available
  useEffect(() => {
    async function checkProviders() {
      try {
        const [googleStatus, oidcStatus, regStatus] = await Promise.all([
          api.getGoogleOAuthStatus(),
          api.getOIDCStatus(),
          api.getRegistrationStatus(),
        ]);
        setGoogleEnabled(googleStatus.enabled);
        setGoogleClientId(googleStatus.client_id);
        setOidcEnabled(oidcStatus.enabled);
        setOidcButtonText(oidcStatus.button_text || 'Login with SSO');
        setRegistrationEnabled(regStatus.enabled);
      } catch {
        // Auth providers unavailable — password login only
      }
    }
    checkProviders();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Please enter email and password.');
      return;
    }

    try {
      const result = await login(email.trim(), password);
      if (result.mustChangePassword) {
        // TODO: Navigate to password change screen
        Alert.alert('Password Change Required', 'Please update your password.');
      }
    } catch {
      // Error is set in the store
    }
  };

  const handleGoogleLogin = async () => {
    // See Section 1.5.2 for expo-auth-session integration
  };

  const handleOIDCLogin = async () => {
    // See Section 1.5.3 for OIDC flow
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo / App Name */}
        <Text style={[styles.title, { color: theme.colors.text }]}>NesVentory</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Home Inventory Manager
        </Text>

        {/* Error message */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.danger + '20' }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Email */}
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBg,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.text,
          }]}
          placeholder="Email or username"
          placeholderTextColor={theme.colors.muted}
          value={email}
          onChangeText={(text) => { setEmail(text); clearError(); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
        />

        {/* Password */}
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBg,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.text,
          }]}
          placeholder="Password"
          placeholderTextColor={theme.colors.muted}
          value={password}
          onChangeText={(text) => { setPassword(text); clearError(); }}
          secureTextEntry
          textContentType="password"
          onSubmitEditing={handleLogin}
        />

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.accent }]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* OAuth Providers */}
        {googleEnabled && (
          <TouchableOpacity
            style={[styles.oauthButton, { borderColor: theme.colors.border }]}
            onPress={handleGoogleLogin}
          >
            <Text style={[styles.oauthButtonText, { color: theme.colors.text }]}>
              Sign in with Google
            </Text>
          </TouchableOpacity>
        )}

        {oidcEnabled && (
          <TouchableOpacity
            style={[styles.oauthButton, { borderColor: theme.colors.border }]}
            onPress={handleOIDCLogin}
          >
            <Text style={[styles.oauthButtonText, { color: theme.colors.text }]}>
              {oidcButtonText}
            </Text>
          </TouchableOpacity>
        )}

        {/* Register Link */}
        {registrationEnabled && (
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.linkText, { color: theme.colors.accent }]}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
  errorBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, textAlign: 'center' },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  oauthButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  oauthButtonText: { fontSize: 16, fontWeight: '500' },
  linkText: { textAlign: 'center', fontSize: 14, marginTop: 16 },
});
```

### Google OAuth (expo-auth-session)

```typescript
// In LoginScreen — Google OAuth handler
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for web browser redirect to close properly
WebBrowser.maybeCompleteAuthSession();

// Inside the component:
const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
  // Use the client ID from the backend's /api/auth/google/status
  androidClientId: googleClientId ?? undefined,
  iosClientId: googleClientId ?? undefined,
  webClientId: googleClientId ?? undefined,
});

useEffect(() => {
  if (googleResponse?.type === 'success') {
    const { id_token } = googleResponse.params;
    if (id_token) {
      loginWithGoogle(id_token);
    }
  }
}, [googleResponse]);

const handleGoogleLogin = () => {
  googlePromptAsync();
};
```

### OIDC / Authelia (expo-auth-session)

```typescript
// Generic OIDC flow using expo-auth-session
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session';
import { useAutoDiscovery } from 'expo-auth-session';

// Fetch discovery document from the OIDC provider
// The backend's /api/auth/oidc/status tells us the provider name,
// but we need the discovery URL from app config
const discovery = useAutoDiscovery(OIDC_DISCOVERY_URL);

const redirectUri = makeRedirectUri({
  scheme: 'nesventory',
  path: 'oidc-callback',
});

const [oidcRequest, oidcResponse, oidcPromptAsync] = useAuthRequest(
  {
    clientId: OIDC_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: 'code',
  },
  discovery,
);

useEffect(() => {
  if (oidcResponse?.type === 'success') {
    const { code, state } = oidcResponse.params;
    loginWithOIDC(code, state, redirectUri);
  }
}, [oidcResponse]);
```

### Auto-Logout on 401

The web app uses a custom DOM event:

```typescript
// Web: api.ts dispatches → App.tsx listens
window.dispatchEvent(new Event("auth:unauthorized"));
```

The mobile app replaces this with a direct Zustand store call:

```typescript
// Mobile: api.ts calls the store directly (Zustand supports external access)
if (res.status === 401) {
  useAuthStore.getState().logout();
}
```

This is simpler and more reliable — no event system needed.

---

## 1.6 Theming System

**Estimated Effort:** 3–4 hours

### Web Theme Architecture

The web app uses CSS variables on `<html>` with a `ThemeContext`:
- **3 modes:** `system`, `dark`, `light`
- **6 color palettes:** `blue`, `green`, `red`, `purple`, `orange`, `teal`
- **18 CSS variables:** `--bg`, `--text`, `--accent`, `--danger`, `--success`, etc.
- **Stored in:** `localStorage` as `NesVentory_theme`

### Mobile Theme Architecture

React Native has no CSS variables. Instead, use a **theme object** accessed via Zustand + a thin context wrapper.

### Color Palette Definitions

```typescript
// src/theme/colors.ts

export type ColorPalette = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal';

// Accent colors per palette — matches web's CSS exactly
const PALETTE_ACCENTS: Record<ColorPalette, { dark: string; light: string }> = {
  blue:   { dark: '#38bdf8', light: '#0284c7' },
  green:  { dark: '#4ade80', light: '#16a34a' },
  red:    { dark: '#f87171', light: '#dc2626' },
  purple: { dark: '#a78bfa', light: '#7c3aed' },
  orange: { dark: '#fb923c', light: '#ea580c' },
  teal:   { dark: '#2dd4bf', light: '#0d9488' },
};

export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgElevated: string;
  bgElevatedSofter: string;
  bgHeader: string;
  bgSidebar: string;

  // Accent (palette-dependent)
  accent: string;
  accentSoft: string;
  accentBorder: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderPanel: string;

  // Text
  text: string;
  muted: string;

  // Semantic
  danger: string;
  success: string;

  // Inputs
  inputBg: string;
  inputBorder: string;

  // Table
  tableRowEven: string;
  tableRowOdd: string;
  tableRowHover: string;
}

export function getThemeColors(isDark: boolean, palette: ColorPalette): ThemeColors {
  const accent = isDark ? PALETTE_ACCENTS[palette].dark : PALETTE_ACCENTS[palette].light;

  if (isDark) {
    return {
      bg: '#050816',
      bgElevated: '#0f172a',
      bgElevatedSofter: '#1e293b',
      bgHeader: '#0f172a',
      bgSidebar: '#0f172a',

      accent,
      accentSoft: accent + '20',       // 12% opacity
      accentBorder: accent + 'B3',     // 70% opacity

      border: '#1e293b',
      borderSubtle: '#1e293b',
      borderPanel: '#334155',

      text: '#e5e7eb',
      muted: '#6b7280',

      danger: '#f97373',
      success: '#4ade80',

      inputBg: '#1e293b',
      inputBorder: '#334155',

      tableRowEven: '#0f172a',
      tableRowOdd: '#1e293b',
      tableRowHover: '#334155',
    };
  }

  return {
    bg: '#f8fafc',
    bgElevated: '#ffffff',
    bgElevatedSofter: '#f1f5f9',
    bgHeader: '#ffffff',
    bgSidebar: '#ffffff',

    accent,
    accentSoft: accent + '15',
    accentBorder: accent + '99',

    border: '#e2e8f0',
    borderSubtle: '#e2e8f0',
    borderPanel: '#cbd5e1',

    text: '#1e293b',
    muted: '#64748b',

    danger: '#dc2626',
    success: '#16a34a',

    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',

    tableRowEven: '#ffffff',
    tableRowOdd: '#f8fafc',
    tableRowHover: '#f1f5f9',
  };
}
```

### Spacing & Typography

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// src/theme/typography.ts
import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
```

### Theme Provider

```typescript
// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { getThemeColors, type ThemeColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
  isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useSettingsStore((s) => s.isDark);
  const colorPalette = useSettingsStore((s) => s.colorPalette);

  const theme = useMemo<Theme>(
    () => ({
      colors: getThemeColors(isDark, colorPalette),
      spacing,
      typography,
      isDark,
    }),
    [isDark, colorPalette],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

### App Entry Point with ThemeProvider

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useAuthStore } from './src/stores/authStore';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

---

## 1.7 Shared Types & Constants

**Estimated Effort:** 1–2 hours

### Types — Port As-Is

The web types from `src/lib/types.ts` are framework-agnostic:

```typescript
// src/types/api.ts — ported from web's src/lib/types.ts

// These two types need mobile-specific adaptation:
export interface PhotoUpload {
  uri: string;     // Changed from: file: File
  name: string;    // Changed from: embedded in File
  type: string;    // Changed from: embedded in File
  preview: string; // Local URI for thumbnail
  photoType: string;
}

export interface DocumentUpload {
  uri?: string;    // Changed from: file?: File
  name?: string;
  type?: string;
  url?: string;    // URL-based upload (unchanged)
  documentType: string;
}
```

### Constants — Port Verbatim

These are plain string arrays / objects with no web dependencies:

```typescript
// src/lib/constants.ts — copy directly from web

export const PHOTO_TYPES = ['DEFAULT', 'DATA_TAG', 'RECEIPT', 'WARRANTY', 'OPTIONAL', 'PROFILE'];
export const DOCUMENT_TYPES = ['MANUAL', 'ATTACHMENT'];

export const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_MIMES = ['application/pdf', 'text/plain'];

export const RELATIONSHIP_TYPES = [
  'SELF', 'SPOUSE', 'PARTNER', 'MOTHER', 'FATHER', 'SISTER', 'BROTHER',
  'DAUGHTER', 'SON', 'GRANDMOTHER', 'GRANDFATHER', 'AUNT', 'UNCLE',
  'COUSIN', 'NIECE', 'NEPHEW', 'PET', 'PLANT', 'OTHER',
];

// 180+ brands (Apple, Samsung, IKEA, Nike, etc.)
export const BRANDS: string[] = [ /* copy from web */ ];

// 180+ retailers (Amazon, Best Buy, Target, Walmart, etc.)
export const RETAILERS: string[] = [ /* copy from web */ ];
```

### Utilities — Mostly Portable

Most utils from `src/lib/utils.ts` are platform-agnostic:

| Function | Portable? | Notes |
|---|---|---|
| `formatPhotoType(type)` | ✅ Yes | Pure string manipulation |
| `formatCurrency(value, currency, locale)` | ✅ Yes | `Intl.NumberFormat` works in RN (Hermes) |
| `formatDate(date, options, locale)` | ✅ Yes | `Intl.DateTimeFormat` works in Hermes |
| `formatDateTime(dateTime, locale)` | ✅ Yes | Same as above |
| `getLocationPath(id, locations, sep)` | ✅ Yes | Pure array traversal |
| `getUserLocale()` | ⚠️ Adapt | Read from Zustand store instead of localStorage |
| `getUserCurrency()` | ⚠️ Adapt | Read from Zustand store instead of localStorage |
| `getFilenameFromUrl(url)` | ✅ Yes | `URL` constructor works in RN |

### Navigation Param Types

```typescript
// src/types/navigation.ts
// Re-export from navigation/types.ts for convenience
export type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  InventoryStackParamList,
  LocationsStackParamList,
  SettingsStackParamList,
} from '../navigation/types';
```

---

## 1.8 Development Environment

**Estimated Effort:** 1–2 hours

### EAS Build Configuration

```bash
# Install EAS CLI
npm install -g eas-cli

# Initialize EAS
eas init

# Configure build profiles
eas build:configure
```

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "API_BASE_URL": "http://192.168.1.x:8080"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "API_BASE_URL": "https://staging.nesventory.example.com"
      }
    },
    "production": {
      "env": {
        "API_BASE_URL": "https://nesventory.example.com"
      }
    }
  }
}
```

### App Configuration

```typescript
// app.config.ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'NesVentory',
  slug: 'nesventory-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'nesventory', // Deep link scheme (used for OAuth redirects)
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#050816',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.nesventory.mobile',
    infoPlist: {
      NSCameraUsageDescription: 'NesVentory uses the camera to scan barcodes and take item photos.',
      NSPhotoLibraryUsageDescription: 'NesVentory accesses your photo library to attach images to items.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#050816',
    },
    package: 'com.nesventory.mobile',
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  plugins: ['expo-secure-store', 'expo-router'],
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
  },
};

export default config;
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@stores/*": ["src/stores/*"],
      "@lib/*": ["src/lib/*"],
      "@hooks/*": ["src/hooks/*"],
      "@theme/*": ["src/theme/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

> **Note:** You'll need `babel-plugin-module-resolver` for runtime alias resolution in Metro:
> ```bash
> npm install --save-dev babel-plugin-module-resolver
> ```
> Then update `babel.config.js` to add the alias plugin.

### ESLint + Prettier

```bash
# Match web project conventions
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier eslint-config-prettier
```

Minimal `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

### Development Workflow

```bash
# Start development server
npx expo start

# Run on iOS Simulator
npx expo run:ios

# Run on Android Emulator
npx expo run:android

# Run with tunnel (for testing on physical device over network)
npx expo start --tunnel
```

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | Expo app runs on iOS Simulator and Android Emulator | `npx expo run:ios` / `npx expo run:android` — no crash |
| 2 | Navigation between all 5 tab screens works | Tap each tab, verify screen renders |
| 3 | Auth stack → Main tabs transition on login | Enter credentials → tabs appear |
| 4 | Login/logout flow functional against backend API | Login → fetch `/api/users/me` → display user name → logout → back to login |
| 5 | Theme switching (dark/light/system) works | Toggle in settings → colors update immediately |
| 6 | Color palette switching works | Switch palettes → accent color changes across app |
| 7 | API client can fetch items list from backend | Inventory tab loads and displays items from `/api/items` |
| 8 | Zustand stores persist across app restarts | Login → kill app → reopen → still on auth check (not login screen) |
| 9 | TypeScript compiles without errors | `npx tsc --noEmit` passes |
| 10 | 401 responses trigger automatic logout | Expire token manually → next API call → redirected to login |

---

## Effort Summary

| Section | Estimated Hours | Complexity |
|---|---|---|
| 1.1 Project Initialization | 2–3 | Low |
| 1.2 Navigation Architecture | 3–4 | Medium |
| 1.3 State Management (Zustand) | 4–5 | Medium |
| 1.4 API Client Adaptation | 4–6 | High |
| 1.5 Authentication Flow | 4–5 | High |
| 1.6 Theming System | 3–4 | Medium |
| 1.7 Shared Types & Constants | 1–2 | Low |
| 1.8 Development Environment | 1–2 | Low |
| **Total** | **22–31 hours** | |

---

## Dependencies on Future Phases

This phase produces the **foundational skeleton** that all subsequent phases build on:

- **Phase 2 (Core Screens)** — Implements actual screen content using navigation + stores from this phase
- **Phase 3 (Media & Camera)** — Uses `uploadItemPhoto()` helper and `RNFile` pattern from this phase
- **Phase 4 (Advanced Features)** — Extends stores and API client established here
- **Phase 5 (Polish & Release)** — Builds EAS production builds using config from this phase

---

*Last updated: Phase 1 initial draft*
