# Phase 6: Testing, Polish & Release

**Status:** 🔲 Not Started
**Prerequisites:** Phases 1–5 substantially complete
**Estimated Total Effort:** 6–8 weeks

---

## Table of Contents

- [Overview](#overview)
- [6.1 Testing Strategy](#61-testing-strategy)
  - [Unit Tests](#unit-tests-jest--react-native-testing-library)
  - [Component Tests](#component-tests)
  - [E2E Tests (Detox)](#e2e-tests-detox)
  - [API Integration Tests](#api-integration-tests)
  - [BLE Testing](#ble-testing)
- [6.2 iOS Platform Polish](#62-ios-platform-polish)
- [6.3 Android Platform Polish](#63-android-platform-polish)
- [6.4 Performance Optimization](#64-performance-optimization)
- [6.5 Accessibility](#65-accessibility)
- [6.6 App Store Preparation](#66-app-store-preparation)
- [6.7 CI/CD Pipeline](#67-cicd-pipeline)
- [6.8 Documentation](#68-documentation)
- [6.9 Post-Launch](#69-post-launch)
- [Testing Checklist](#testing-checklist)
- [Effort Estimates Summary](#effort-estimates-summary)

---

## Overview

Phase 6 is the **final gate before public release**. It covers comprehensive quality assurance, platform-specific refinements for iOS and Android, performance tuning, accessibility compliance, and end-to-end preparation for App Store and Google Play submission.

Nothing in this phase adds new features — it hardens, polishes, and packages everything built in Phases 1–5 into a production-ready mobile application that meets the quality bar set by the NesVentory web experience (currently at v6.12.4).

### Goals

| Goal | Success Criteria |
|------|-----------------|
| Test coverage | ≥ 80% on business logic; all critical flows passing E2E |
| iOS polish | App Store Review Guidelines compliance; native feel |
| Android polish | Material Design alignment; Google Play policy compliance |
| Performance | Startup < 2s, lists at 60 fps, memory < 200 MB |
| Accessibility | WCAG AA minimum; VoiceOver + TalkBack verified |
| Store readiness | Listings complete, beta tested, staged rollout plan ready |

---

## 6.1 Testing Strategy

### Unit Tests (Jest + React Native Testing Library)

**Target:** ≥ 80% coverage on all business logic.
**Estimated Effort:** 1–1.5 weeks

Unit tests run entirely in Node.js with no device or simulator required. They validate isolated logic — stores, API clients, utilities, and hooks — with mocked dependencies.

#### Zustand Store Tests

Every store created in Phase 2 needs dedicated test coverage:

```typescript
// __tests__/stores/authStore.test.ts
import { useAuthStore } from '@/stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('sets token and user on successful login', () => {
    const { login } = useAuthStore.getState();
    login({ token: 'jwt-abc', user: { id: 1, username: 'admin' } });

    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-abc');
    expect(state.user?.username).toBe('admin');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears state on logout', () => {
    useAuthStore.getState().login({ token: 'jwt-abc', user: { id: 1, username: 'admin' } });
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
```

**Stores to test:**

| Store | Key Behaviors |
|-------|--------------|
| `authStore` | login, logout, token refresh, session expiry |
| `inventoryStore` | CRUD operations, optimistic updates, pagination state |
| `uiStore` | theme toggle, sidebar state, modal management |
| `settingsStore` | locale/currency persistence, printer config, server URL |

#### API Client Tests

Mock `fetch` globally and verify request construction, header injection, and error mapping:

```typescript
// __tests__/api/items.test.ts
import { fetchItems, createItem } from '@/api/items';

beforeEach(() => {
  global.fetch = jest.fn();
});

it('sends Authorization header with stored token', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [], total: 0 }),
  });

  await fetchItems({ page: 1, per_page: 20 });

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/items'),
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: expect.stringMatching(/^Bearer /),
      }),
    }),
  );
});

it('throws ApiError with status on 401', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ detail: 'Not authenticated' }),
  });

  await expect(fetchItems({ page: 1 })).rejects.toMatchObject({
    status: 401,
    message: 'Not authenticated',
  });
});
```

#### Utility Function Tests

Cover all formatting, validation, and transformation helpers:

- **Currency formatting** — respects locale and currency from settings store
- **Date formatting** — relative ("2 days ago") and absolute displays
- **Validation** — email, URL, required fields, numeric ranges
- **Image helpers** — thumbnail URL construction, MIME type detection
- **Barcode parsing** — EAN-13, UPC-A, QR content extraction

#### Custom Hook Tests

Use `renderHook` from `@testing-library/react-hooks`:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce } from '@/hooks/useDebounce';

it('debounces value updates', async () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 300),
    { initialProps: { value: 'a' } },
  );

  expect(result.current).toBe('a');

  rerender({ value: 'ab' });
  rerender({ value: 'abc' });

  // Value hasn't changed yet (within debounce window)
  expect(result.current).toBe('a');

  // After debounce period
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });

  expect(result.current).toBe('abc');
});
```

### Component Tests

**Target:** All screens render correctly; forms validate; navigation behaves as expected.
**Estimated Effort:** 1–1.5 weeks

Component tests render React Native components in a JSDOM-like environment and assert on the output tree and user interactions.

#### Screen Rendering

```typescript
// __tests__/screens/ItemsListScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ItemsListScreen } from '@/screens/ItemsListScreen';
import { mockItems } from '../fixtures/items';

jest.mock('@/api/items', () => ({
  fetchItems: jest.fn().mockResolvedValue({ items: mockItems, total: 3 }),
}));

it('renders item list with fetched data', async () => {
  render(<ItemsListScreen />);

  await waitFor(() => {
    expect(screen.getByText(mockItems[0].name)).toBeTruthy();
    expect(screen.getByText(mockItems[1].name)).toBeTruthy();
  });
});

it('shows empty state when no items exist', async () => {
  const { fetchItems } = require('@/api/items');
  fetchItems.mockResolvedValueOnce({ items: [], total: 0 });

  render(<ItemsListScreen />);

  await waitFor(() => {
    expect(screen.getByText(/no items/i)).toBeTruthy();
  });
});
```

#### Key Scenarios to Cover

| Scenario | What to Assert |
|----------|---------------|
| Form validation | Required field errors, format validation, submit disabled state |
| Form submission | API called with correct payload, success/error feedback shown |
| Navigation flows | Screen transitions, back button, deep link resolution |
| FlatList rendering | Correct item count, pull-to-refresh triggers reload |
| Modal/sheet interactions | Open, close, content rendering, dismiss gestures |
| Error states | Network error banner, retry button, 404 fallback |
| Loading states | Skeleton/spinner shown during fetch, hidden after |

### E2E Tests (Detox)

**Target:** All critical user flows pass on both iOS Simulator and Android Emulator.
**Estimated Effort:** 1.5–2 weeks

[Detox](https://github.com/wix/Detox) runs tests against a real app build, interacting through the accessibility layer the same way a user would.

#### Setup

```bash
# Install Detox CLI
npm install -g detox-cli

# Install project dependencies
npx expo install detox @types/detox

# Build for testing
detox build --configuration ios.sim.debug
detox build --configuration android.emu.debug
```

**Detox configuration** (`.detoxrc.js`):

```javascript
/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      config: 'e2e/jest.config.js',
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/NesVentory.app',
      build: 'xcodebuild -workspace ios/NesVentory.xcworkspace -scheme NesVentory -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 16' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

#### Critical User Flows

Each flow maps to a Detox test file in `e2e/`:

**1. Authentication Flow** (`e2e/auth.test.js`):

```javascript
describe('Authentication', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should log in with valid credentials', async () => {
    await element(by.id('input-username')).typeText('admin');
    await element(by.id('input-password')).typeText('password123');
    await element(by.id('btn-login')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await device.launchApp({ newInstance: true });
    await element(by.id('input-username')).typeText('wrong');
    await element(by.id('input-password')).typeText('wrong');
    await element(by.id('btn-login')).tap();

    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(3000);
  });
});
```

**2. Full Item Lifecycle** (`e2e/items.test.js`):
- Login → navigate to Items → create new item → fill form → save
- Verify item appears in list → tap to view detail
- Edit item → change name/location → save
- Delete item → confirm → verify removed from list

**3. Photo Capture & Upload** (`e2e/photos.test.js`):
- Open item → tap "Add Photo" → capture (mock camera input)
- Verify upload progress → image appears in item gallery
- View full-screen image → close

**4. Search & Filter** (`e2e/search.test.js`):
- Type search query → verify filtered results
- Apply location filter → verify scoped results
- Apply tag filter → verify scoped results
- Clear filters → verify full list restored

**5. Location Management** (`e2e/locations.test.js`):
- Create parent location → create child location
- Move item to child location → verify hierarchy
- Edit location → delete empty location

**6. Barcode Scanning** (`e2e/barcode.test.js`):
- Open scanner → mock camera barcode input
- Verify barcode detected → item lookup triggered

**7. Settings & Theme** (`e2e/settings.test.js`):
- Change theme → verify UI updates
- Change currency → verify formatting changes
- Settings persist across app restart

**8. BLE Printer Flow** (`e2e/printer.test.js`):
- Navigate to item → tap "Print Label"
- Select BLE printer → verify connection flow
- Print → verify success feedback

> **Note:** Camera and BLE tests require mocked device inputs. Detox supports stubbing native modules — use `detox-mocks` or custom mock builds for CI.

### API Integration Tests

**Target:** Every API function from the RN client works against a live NesVentory backend.
**Estimated Effort:** 3–5 days

These tests run against a real backend instance (Docker Compose with test database), verifying the mobile API client end-to-end.

#### Test Environment Setup

```yaml
# docker-compose.test.yml
services:
  nesventory-test:
    image: nesventory:latest
    ports:
      - "8182:8181"
    environment:
      SECRET_KEY: test-secret-key-do-not-use-in-prod
      APP_URL: http://localhost:8182
      DISABLE_SIGNUPS: "false"
    volumes:
      - test-data:/data
volumes:
  test-data:
```

#### Test Categories

| Category | Tests |
|----------|-------|
| **Auth flow** | Login → receive JWT → access protected route → logout → 401 on retry |
| **Items CRUD** | Create item → read → update → list (paginated) → delete |
| **Locations CRUD** | Create parent → create child → move → delete child → delete parent |
| **Tags** | Create tag → assign to item → remove from item → delete tag |
| **File upload** | Upload photo (multipart/form-data) → verify stored → download → delete |
| **File download** | Fetch photo/document by ID → verify content-type and binary integrity |
| **Search** | Full-text search → filter by location → filter by tag → combined filters |
| **Error handling** | 401 (expired token), 404 (nonexistent item), 422 (validation error), 500 (server error) |

#### Example: Auth Flow Integration Test

```typescript
// __tests__/integration/auth.test.ts
const BASE_URL = 'http://localhost:8182/api';

describe('Auth API Integration', () => {
  let token: string;

  it('logs in and receives a JWT', async () => {
    const res = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=admin',
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.access_token).toBeDefined();
    token = data.access_token;
  });

  it('accesses protected route with token', async () => {
    const res = await fetch(`${BASE_URL}/items`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${BASE_URL}/items`);
    expect(res.status).toBe(401);
  });
});
```

### BLE Testing

**Target:** Printer discovery, connection, and printing verified on physical devices.
**Estimated Effort:** 3–5 days

BLE testing has two tiers: **mocked** (for CI) and **physical** (for manual QA).

#### Mocked BLE Layer (CI-Safe)

Create a mock BLE manager that simulates the `react-native-ble-plx` interface:

```typescript
// __mocks__/react-native-ble-plx.ts
export class BleManager {
  private mockDevices = [
    { id: 'AA:BB:CC:DD:EE:FF', name: 'D110_MOCK', localName: 'D110' },
  ];

  startDeviceScan(
    _uuids: string[] | null,
    _options: object | null,
    callback: (error: Error | null, device: any) => void,
  ) {
    setTimeout(() => {
      this.mockDevices.forEach((d) => callback(null, d));
    }, 500);
  }

  stopDeviceScan() {}

  async connectToDevice(deviceId: string) {
    return { id: deviceId, isConnected: true };
  }

  async disconnectFromDevice() {
    return true;
  }
}
```

#### Physical Device Test Plan

| Test | Device(s) | Steps | Expected |
|------|-----------|-------|----------|
| Discovery | Any NIIMBOT | Power on printer → open scan screen → verify appears in list | Printer name + signal strength shown |
| Connect | D110, B21 | Tap discovered printer → wait for connection | Status shows "Connected", green indicator |
| Print | D110, B21 | Select item → print label → verify output | Label printed with correct QR code + text |
| Reconnect | Any | Print → turn off printer → turn on → print again | Auto-reconnect or clear error + manual reconnect |
| Disconnect | Any | Connected → tap disconnect → verify state cleared | Status shows "Disconnected", scan available |
| Timeout | Any | Start scan with printer off → wait 30s | Timeout error displayed, scan can be retried |

> **Important:** NIIMBOT models have different BLE service UUIDs and communication protocols. Refer to [NIIMBOT Printer Guide](../Guides/NIIMBOT_PRINTER_GUIDE.md) for model-specific details.

---

## 6.2 iOS Platform Polish

**Estimated Effort:** 1–1.5 weeks

### Safe Area Handling

Use `react-native-safe-area-context` consistently across all screens to account for:

- **Notch** (iPhone X and later) — top inset
- **Home indicator** (no physical Home button) — bottom inset
- **Dynamic Island** (iPhone 14 Pro and later) — expanded top inset
- **Status bar** — time, signal, battery area

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

export function ScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}
```

> Tab bar screens should **not** apply bottom safe area — the tab bar component handles this.

### Haptic Feedback

Use `expo-haptics` for tactile responses on key actions:

| Action | Haptic Type |
|--------|------------|
| Successful save / create | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |
| Delete confirmation | `Haptics.notificationAsync(NotificationFeedbackType.Warning)` |
| Pull-to-refresh trigger | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| Toggle switch | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| Barcode scan detected | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |
| Error / failed action | `Haptics.notificationAsync(NotificationFeedbackType.Error)` |

### Navigation & Gestures

- **Stack screens:** Native iOS push/pop transitions (card-style slide from right)
- **Modals:** Slide from bottom with drag-to-dismiss
- **Swipe-back:** Enabled by default on stack navigators (`gestureEnabled: true`)
- **Action sheets:** Use `ActionSheetIOS` or a cross-platform action sheet library instead of `Alert.alert` for multi-option choices (e.g., "Take Photo / Choose from Library / Cancel")

### Keyboard Handling

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
>
  {/* Form content */}
</KeyboardAvoidingView>
```

- Ensure all text inputs are visible when keyboard is open
- Use `ScrollView` with `keyboardShouldPersistTaps="handled"` for forms
- Dismiss keyboard on tap outside input fields

### Dark Mode

- Match system appearance via `useColorScheme()`
- Test all screens in both light and dark modes
- Verify no hard-coded colors bypass the theme system
- Ensure sufficient contrast in dark mode (especially text on surfaces)

### App Icon & Splash Screen

- App icon: 1024×1024px master asset (Xcode generates all sizes)
- Use the NesVentory logo adapted for iOS icon guidelines (no transparency, rounded corners applied by system)
- Splash screen via `expo-splash-screen`: Match app background color, show logo centered
- Preload auth state during splash to avoid flash of login screen

### iPad Support (Optional)

If pursued:
- Split view layout for item list + detail on larger screens
- Sidebar navigation instead of bottom tabs
- Pointer/trackpad hover states
- Keyboard shortcuts for common actions

---

## 6.3 Android Platform Polish

**Estimated Effort:** 1–1.5 weeks

### Material Design Alignment

While NesVentory uses a custom design system, Android users expect certain Material patterns:

- **FAB** (Floating Action Button) for primary creation actions
- **Snackbar** for non-blocking success/error feedback
- **Bottom sheets** for contextual actions
- **Ripple effects** on touchable elements (enabled by default in React Native)

### Status Bar & Navigation Bar

```typescript
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

// Themed status bar
<StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.surface} />

// Edge-to-edge navigation bar (Android 15+)
NavigationBar.setBackgroundColorAsync('transparent');
NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
```

### Back Button Handling

Handle both hardware back button and gesture navigation:

```typescript
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      if (hasUnsavedChanges) {
        showDiscardDialog();
        return true; // Prevent default back
      }
      return false; // Allow default back
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [hasUnsavedChanges]),
);
```

### Android 12+ Splash Screen

Use `expo-splash-screen` with the Android 12 Splash Screen API:

- Animated icon support (optional)
- Branded background color
- Smooth transition to app content

### Permissions

Android requires runtime permission requests with rationale:

| Permission | Usage | Rationale Message |
|------------|-------|------------------|
| `CAMERA` | Photo capture, barcode scan | "NesVentory needs camera access to take photos of your items and scan barcodes." |
| `READ_MEDIA_IMAGES` | Photo library access | "Access your photo library to attach existing photos to inventory items." |
| `BLUETOOTH_SCAN` | BLE printer discovery | "Bluetooth is needed to find your NIIMBOT printer." |
| `BLUETOOTH_CONNECT` | BLE printer connection | "Bluetooth is needed to connect and print labels." |
| `ACCESS_FINE_LOCATION` | BLE scanning (required by Android) | "Location permission is required by Android to scan for Bluetooth devices. NesVentory does not track your location." |
| `POST_NOTIFICATIONS` | Push notifications | "Enable notifications to receive alerts about maintenance reminders." |

> **Important:** `ACCESS_FINE_LOCATION` is required on Android < 12 for BLE scanning. On Android 12+, use `BLUETOOTH_SCAN` with `neverForLocation` flag instead.

### Adaptive Icon

Provide:
- **Foreground layer:** NesVentory logo (108×108dp, content within 72×72dp safe zone)
- **Background layer:** Solid brand color or subtle pattern
- System applies masking (circle, squircle, rounded square) per device manufacturer

### Accessibility: TalkBack

- Verify all interactive elements have `accessibilityLabel`
- Test focus order is logical (top-to-bottom, left-to-right)
- Custom components announce their role (`accessibilityRole`)
- Images have descriptive labels or are marked decorative (`accessibilityElementsHidden`)

---

## 6.4 Performance Optimization

**Estimated Effort:** 1–1.5 weeks

### FlatList Optimization

FlatList is the backbone of the items list, locations list, and search results. Poorly tuned lists cause jank and dropped frames.

#### Key Optimizations

```typescript
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  // Pre-calculate layout for fixed-height rows
  getItemLayout={(_, index) => ({
    length: ITEM_ROW_HEIGHT,
    offset: ITEM_ROW_HEIGHT * index,
    index,
  })}
  // Rendering window
  windowSize={5}               // Render 5 viewports of content
  maxToRenderPerBatch={10}     // Render 10 items per batch
  initialNumToRender={15}      // Render 15 items initially
  updateCellsBatchingPeriod={50}
  // Prevent unnecessary re-renders
  removeClippedSubviews={true}
/>
```

#### Memoize Render Items

```typescript
const renderItem = useCallback(
  ({ item }: { item: InventoryItem }) => <ItemRow item={item} />,
  [],
);

// ItemRow itself should be wrapped in React.memo
const ItemRow = React.memo(({ item }: { item: InventoryItem }) => {
  // ...render
});
```

### Image Optimization

| Strategy | Implementation |
|----------|---------------|
| **Fast loading** | Use `expo-image` (backed by SDWebImage/Glide) instead of `<Image>` |
| **Progressive loading** | Show low-res thumbnail first, swap to full image on load |
| **Caching** | `expo-image` provides disk + memory caching by default |
| **Lazy loading** | Images outside viewport are not loaded until scrolled into view (FlatList handles this) |
| **Size-appropriate** | Request thumbnail size for list views, full size only in detail/gallery |

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: item.thumbnailUrl }}
  placeholder={{ uri: item.blurhash }}
  contentFit="cover"
  transition={200}
  style={{ width: 60, height: 60, borderRadius: 8 }}
/>
```

### Bundle Size

| Action | Tool | Target |
|--------|------|--------|
| Analyze bundle | `npx react-native-bundle-visualizer` or `npx expo-metro-visualizer` | Identify top contributors |
| Tree-shake unused exports | Metro bundler (automatic, but verify) | Remove dead code |
| Lazy-load screens | `React.lazy()` or React Navigation lazy loading | Reduce initial bundle |
| Optimize assets | Compress images, use WebP where supported | Smaller download |

```typescript
// React Navigation lazy screen loading
const ItemDetailScreen = React.lazy(() => import('@/screens/ItemDetailScreen'));
```

### Memory Management

- **Monitor:** Use React DevTools Profiler and Xcode/Android Studio memory tools
- **Subscriptions:** Clean up all `useEffect` subscriptions (BLE listeners, keyboard events, app state)
- **BLE connections:** Disconnect on screen unmount; don't hold connections globally
- **Image memory:** `expo-image` manages cache eviction; set reasonable cache limits
- **Navigation:** Avoid accumulating screen instances — use `popToTop()` and screen limits

```typescript
// Cleanup example
useEffect(() => {
  const subscription = bleManager.onStateChange((state) => {
    // Handle state change
  }, true);

  return () => subscription.remove(); // Cleanup on unmount
}, []);
```

### Startup Time

| Optimization | Impact |
|-------------|--------|
| Minimize splash screen duration | Show content ASAP |
| Pre-load auth token from SecureStore | Avoid flash of login screen |
| Defer non-critical initialization | Load BLE, analytics, etc. after first paint |
| Reduce JS bundle parse time | Smaller bundle = faster parse |
| Use Hermes engine | Bytecode precompilation (enabled by default in Expo) |

**Target:** Cold start to interactive content in **< 2 seconds** on mid-range devices.

---

## 6.5 Accessibility

**Estimated Effort:** 3–5 days

Accessibility is not optional — it expands the user base and is required for compliance with app store guidelines.

### Screen Reader Support

| Platform | Screen Reader | Testing Method |
|----------|--------------|----------------|
| iOS | VoiceOver | Settings → Accessibility → VoiceOver (or triple-click Side button) |
| Android | TalkBack | Settings → Accessibility → TalkBack |

#### Checklist

- [ ] All interactive elements have `accessibilityLabel`
- [ ] Buttons describe their action, not their appearance ("Delete item", not "Red button")
- [ ] Images have descriptive `accessibilityLabel` or are marked `accessible={false}`
- [ ] Form fields have associated labels
- [ ] State changes are announced (`accessibilityLiveRegion="polite"`)
- [ ] Custom components set `accessibilityRole` (button, link, header, checkbox, etc.)

### Touch Targets

| Platform | Minimum Size | Standard |
|----------|-------------|----------|
| iOS | 44 × 44 pt | Apple HIG |
| Android | 48 × 48 dp | Material Design |

Ensure all tappable elements meet these minimums, even if the visual element is smaller (use `hitSlop` or padding).

### Color Contrast

Meet **WCAG 2.1 AA** minimum:

| Text Type | Minimum Ratio |
|-----------|--------------|
| Normal text (< 18pt) | 4.5:1 |
| Large text (≥ 18pt or 14pt bold) | 3:1 |
| UI components & graphical objects | 3:1 |

Verify with the Xcode Accessibility Inspector or Android Accessibility Scanner.

### Additional Accessibility

- **Reduced motion:** Respect `AccessibilityInfo.isReduceMotionEnabled()` — disable animations
- **Dynamic type:** Support system font size scaling via `allowFontScaling` (default in React Native)
- **Focus management:** When modals/sheets open, move focus to the new content; on close, return focus to trigger
- **Heading hierarchy:** Use `accessibilityRole="header"` for section headings so screen readers can navigate by heading

---

## 6.6 App Store Preparation

**Estimated Effort:** 1–1.5 weeks (both platforms combined)

### iOS — App Store Connect

#### Prerequisites

- **Apple Developer Program** membership ($99/year)
- Xcode installed (for certificate management)
- EAS CLI configured with Apple credentials

#### App Store Listing

| Field | Value |
|-------|-------|
| **App Name** | NesVentory |
| **Subtitle** | Home Inventory Manager |
| **Category** | Utilities (primary), Lifestyle (secondary) |
| **Description** | Comprehensive home inventory management — track items, locations, photos, warranties, and maintenance schedules. Print QR labels, scan barcodes, and use AI to detect and enrich items. Self-hosted backend with full data ownership. |
| **Keywords** | inventory, home, items, tracking, QR, barcode, label, printer, warehouse, organize |
| **Privacy Policy URL** | `https://<your-domain>/privacy` (required) |

#### Screenshots Required

| Device | Size | Count |
|--------|------|-------|
| iPhone 6.7" (15 Pro Max) | 1290 × 2796 | 3–10 screenshots |
| iPhone 6.5" (11 Pro Max) | 1242 × 2688 | 3–10 screenshots |
| iPhone 5.5" (8 Plus) | 1242 × 2208 | 3–10 screenshots (optional but recommended) |
| iPad 12.9" (if supporting iPad) | 2048 × 2732 | 3–10 screenshots |

**Screenshot subjects:**
1. Dashboard / home screen
2. Items list with search
3. Item detail with photos
4. Barcode scanner
5. Label printing (BLE flow)
6. Location hierarchy
7. AI item detection (optional)

#### App Privacy Details

Disclose data collection accurately:

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Photos | Yes (user-initiated) | Yes | No |
| Location (if GPS used) | No | N/A | No |
| Identifiers (user ID) | Yes | Yes | No |
| Usage data | Optional (if analytics added) | No | No |

#### Certificates & Provisioning

EAS Build handles most of this automatically:

```bash
# Build for iOS (EAS manages signing)
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios
```

#### TestFlight

- Upload build via EAS Submit
- Add internal testers (up to 25, no review required)
- Add external testers (up to 10,000, requires beta review)
- Collect crash reports and feedback before full submission

### Android — Google Play Console

#### Prerequisites

- **Google Play Developer** account ($25 one-time fee)
- EAS CLI configured with upload key

#### Play Store Listing

| Field | Value |
|-------|-------|
| **Title** | NesVentory – Home Inventory |
| **Short description** | Track items, locations, photos & print QR labels. |
| **Full description** | (Same as iOS description, expanded to fill 4000 chars) |
| **Category** | Tools (primary) |
| **Content rating** | Complete IARC questionnaire (likely "Everyone") |
| **Privacy Policy URL** | `https://<your-domain>/privacy` (required) |

#### Graphics Assets

| Asset | Size | Required |
|-------|------|----------|
| **Feature graphic** | 1024 × 500 px | Yes |
| **Phone screenshots** | 16:9 or 9:16, min 320px | Yes (2–8) |
| **7" tablet screenshots** | 16:9 or 9:16 | Recommended |
| **10" tablet screenshots** | 16:9 or 9:16 | Recommended |
| **App icon** | 512 × 512 px | Yes (high-res) |

#### Data Safety Section

Equivalent to Apple's App Privacy:

| Question | Answer |
|----------|--------|
| Does app collect or share data? | Yes (collects) |
| Is data encrypted in transit? | Yes (HTTPS) |
| Can users request data deletion? | Yes (via account deletion or backend admin) |
| Data types collected | Photos (optional), app activity, account info |

#### Signing Keys

```bash
# EAS manages signing keys
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

- **Upload key:** Managed by EAS (can be rotated)
- **App signing key:** Managed by Google Play App Signing (recommended, non-rotatable)

#### Testing Tracks

| Track | Purpose | Audience |
|-------|---------|----------|
| Internal testing | Developer QA | Up to 100 testers, no review |
| Closed testing | Beta testers | Invite-only, quick review |
| Open testing | Public beta | Anyone can join, quick review |
| Production | Public release | Full review |

### Version Strategy (Both Platforms)

Align mobile app version with the NesVentory `VERSION` file convention:

| Component | Example | Notes |
|-----------|---------|-------|
| Version name | `1.0.0` | Semver, user-visible |
| iOS build number | `1` | Auto-increment per build |
| Android version code | `1` | Auto-increment per build |

**Mapping to NesVentory versions:**

The mobile app starts at `1.0.0` (independent of the web app's `6.x.x` versioning). The app communicates its compatible API version range via a custom header or startup check.

---

## 6.7 CI/CD Pipeline

**Estimated Effort:** 3–5 days

### EAS Build & Submit

[EAS (Expo Application Services)](https://docs.expo.dev/eas/) provides cloud-based builds and store submission:

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "autoIncrement": "buildNumber" },
      "android": { "autoIncrement": "versionCode" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

### GitHub Actions Workflows

#### PR Checks (on every pull request)

```yaml
# .github/workflows/mobile-pr-check.yml
name: Mobile PR Check
on:
  pull_request:
    paths:
      - 'mobile/**'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: TypeScript check
        working-directory: mobile
        run: npx tsc --noEmit

      - name: Lint
        working-directory: mobile
        run: npx eslint . --max-warnings 0

      - name: Unit tests
        working-directory: mobile
        run: npx jest --coverage --ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: mobile/coverage
```

#### Build on Merge to Main

```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build
on:
  push:
    branches: [main]
    paths:
      - 'mobile/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Build iOS (preview)
        working-directory: mobile
        run: eas build --platform ios --profile preview --non-interactive

      - name: Build Android (preview)
        working-directory: mobile
        run: eas build --platform android --profile preview --non-interactive
```

#### Production Release (on git tag)

```yaml
# .github/workflows/mobile-release.yml
name: Mobile Release
on:
  push:
    tags:
      - 'mobile-v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Build & Submit iOS
        working-directory: mobile
        run: |
          eas build --platform ios --profile production --non-interactive
          eas submit --platform ios --non-interactive

      - name: Build & Submit Android
        working-directory: mobile
        run: |
          eas build --platform android --profile production --non-interactive
          eas submit --platform android --non-interactive
```

### Environment Management

| Environment | API URL | Usage |
|-------------|---------|-------|
| Development | `http://localhost:8181` | Local dev via Expo Dev Client |
| Staging | `https://staging.example.com` | Preview/beta builds |
| Production | `https://your-nesventory.com` | Production builds |

Manage via `app.config.ts` with environment variables:

```typescript
// app.config.ts
export default ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:8181',
    eas: { projectId: 'your-eas-project-id' },
  },
});
```

---

## 6.8 Documentation

**Estimated Effort:** 2–3 days

### Documents to Create

| Document | Location | Audience |
|----------|----------|----------|
| **Mobile README** | `mobile/README.md` | New developers |
| **Development Setup** | `mobile/docs/DEVELOPMENT.md` | Contributors |
| **Architecture** | `mobile/docs/ARCHITECTURE.md` | All developers |
| **API Integration** | `mobile/docs/API_INTEGRATION.md` | Mobile developers |
| **Troubleshooting** | `mobile/docs/TROUBLESHOOTING.md` | All developers |
| **Contributing** | `mobile/CONTRIBUTING.md` | OSS contributors |

### Mobile README Template

```markdown
# NesVentory Mobile App

React Native (Expo) mobile client for [NesVentory](https://github.com/tokendad/NesVentory).

## Prerequisites
- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- iOS: Xcode 15+ (macOS only)
- Android: Android Studio with SDK 34+

## Quick Start
npm install
npx expo start

## Testing
npm test                  # Unit + component tests
npm run test:e2e:ios      # Detox E2E (iOS)
npm run test:e2e:android  # Detox E2E (Android)

## Building
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

### Architecture Documentation

Document the decisions made in Phases 1–5:

- **Navigation structure** (tab navigator + stack navigators)
- **State management** (Zustand stores and their responsibilities)
- **API client** (interceptors, token refresh, error handling)
- **BLE integration** (service architecture, protocol handling)
- **Offline support** (if implemented — cache strategy, sync logic)
- **Theme system** (design tokens, dark mode, platform adaptations)

---

## 6.9 Post-Launch

**Estimated Effort:** Ongoing

### Crash Reporting

Integrate Sentry for real-time crash reporting:

```bash
npx expo install @sentry/react-native
```

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://your-dsn@sentry.io/project',
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
});
```

### OTA Updates

Use `expo-updates` for over-the-air JavaScript updates (no store review needed):

```bash
# Push a JS-only update
eas update --branch production --message "Fix item form validation"
```

**Important:** OTA updates can only change JavaScript — native code changes still require a full build + store submission.

### Analytics (Optional)

If adding analytics, choose a privacy-respecting provider:

- **PostHog** (self-hosted option)
- **Plausible** (privacy-first)
- **Expo analytics** (built-in, minimal)

Track only what's needed:
- Screen views (which features are used)
- Error rates (which flows fail)
- Performance metrics (startup time, API latency)

**Do not track:** Personal data, item contents, photos, location data.

### User Feedback

- In-app feedback button (opens email or form)
- App Store / Play Store review prompt (after positive interactions, rate-limited)
- GitHub Issues for bug reports from technical users

### Performance Monitoring

- Monitor crash-free rate (target: > 99.5%)
- Monitor ANR rate on Android (target: < 0.5%)
- Monitor startup time regression
- Monitor API error rates from mobile clients

---

## Testing Checklist

### Functional Tests

- [ ] Login (password)
- [ ] Login (Google OAuth)
- [ ] Login (OIDC)
- [ ] Logout and session expiry
- [ ] Items — create
- [ ] Items — read (list + detail)
- [ ] Items — update
- [ ] Items — delete
- [ ] Locations — create with hierarchy
- [ ] Locations — read (list + tree)
- [ ] Locations — update
- [ ] Locations — delete
- [ ] Tags — create
- [ ] Tags — assign to items
- [ ] Tags — remove from items
- [ ] Tags — delete
- [ ] Photo capture (camera)
- [ ] Photo upload (library)
- [ ] Photo viewing (gallery)
- [ ] Document upload
- [ ] Document viewing
- [ ] AI item detection (photo scan)
- [ ] AI data tag parsing
- [ ] Barcode scanning (EAN-13, UPC-A)
- [ ] QR code scanning
- [ ] Search (full-text)
- [ ] Filter by location
- [ ] Filter by tag
- [ ] Bulk operations (select + delete)
- [ ] CSV import
- [ ] Encircle import
- [ ] Maintenance calendar view
- [ ] Maintenance task CRUD
- [ ] Media management dashboard
- [ ] Admin — user management
- [ ] Admin — AI provider configuration
- [ ] Google Drive backup
- [ ] Printer — BLE discovery
- [ ] Printer — BLE connection
- [ ] Printer — label printing (item)
- [ ] Printer — label printing (location)
- [ ] Theme switching (light/dark/system)
- [ ] Locale and currency settings
- [ ] Push notifications (if implemented)

### Platform Tests

- [ ] iPhone SE (small screen)
- [ ] iPhone 15 (standard)
- [ ] iPhone 15 Pro Max (large screen)
- [ ] iPad (optional)
- [ ] Android phone — small (Pixel 4a)
- [ ] Android phone — large (Pixel 8 Pro / Samsung S24 Ultra)
- [ ] Android tablet (optional)
- [ ] iOS — light mode
- [ ] iOS — dark mode
- [ ] Android — light mode
- [ ] Android — dark mode
- [ ] Offline behavior — cached data displayed
- [ ] Offline behavior — queued actions sync on reconnect
- [ ] Background → foreground transition (token refresh)
- [ ] App killed → cold restart (state restoration)
- [ ] Deep linking (optional)
- [ ] Orientation — portrait locked (or landscape if supported)

### Performance Benchmarks

| Metric | Target | How to Measure |
|--------|--------|----------------|
| App startup (cold) | < 2 seconds | Stopwatch from tap to interactive |
| Items list scroll | 60 fps (no dropped frames) | React DevTools Profiler or Perf Monitor |
| Photo upload (10 MB) | < 5 seconds | Timer in upload handler |
| Search response | < 300 ms (API round-trip) | Network tab in Flipper |
| Navigation transition | < 300 ms | Visual inspection + profiler |
| Memory usage (typical) | < 200 MB | Xcode / Android Studio memory profiler |
| Memory usage (gallery) | < 350 MB | Stress test with 50+ images |
| Bundle size (JS) | < 5 MB (compressed) | `eas build` output or metro visualizer |
| App binary size | < 50 MB (iOS), < 30 MB (Android) | Store listing / build output |

---

## Effort Estimates Summary

| Section | Estimated Effort | Dependencies |
|---------|-----------------|-------------|
| 6.1 Testing Strategy | 3–4 weeks | Phases 1–5 code complete |
| 6.2 iOS Platform Polish | 1–1.5 weeks | Phase 3 (UI) complete |
| 6.3 Android Platform Polish | 1–1.5 weeks | Phase 3 (UI) complete |
| 6.4 Performance Optimization | 1–1.5 weeks | All screens implemented |
| 6.5 Accessibility | 3–5 days | UI finalized |
| 6.6 App Store Preparation | 1–1.5 weeks | Builds stable |
| 6.7 CI/CD Pipeline | 3–5 days | EAS account setup |
| 6.8 Documentation | 2–3 days | Architecture settled |
| 6.9 Post-Launch | Ongoing | App live in stores |
| **Total** | **~6–8 weeks** | — |

> **Note:** iOS and Android polish (6.2 + 6.3) can run in parallel if separate developers are available. Testing (6.1) should start as soon as Phase 5 features are code-complete — don't wait for all polish to finish.

---

## Related Documents

- [Phase 1: Project Setup & Navigation](./01-Project-Setup-Navigation.md)
- [Phase 2: Core Data & State Management](./02-Core-Data-State-Management.md)
- [Phase 3: UI Components & Screens](./03-UI-Components-Screens.md)
- [Phase 4: Camera, Scanning & Media](./04-Camera-Scanning-Media.md)
- [Phase 5: BLE Printing & Advanced Features](./05-BLE-Printing-Advanced-Features.md)
- [API Endpoints Reference](../Guides/API_ENDPOINTS.md)
- [NIIMBOT Printer Guide](../Guides/NIIMBOT_PRINTER_GUIDE.md)
- [Docker Compose Variables](../Guides/DOCKER_COMPOSE_VARIABLES.md)
