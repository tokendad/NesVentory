# Phase 3: Media & AI Features

> **Status:** Planning  
> **Prerequisites:** Phase 1 (Foundation & Setup), Phase 2 (Core Screens & Navigation)  
> **Estimated Total Effort:** 8–12 developer-days  

---

## Table of Contents

- [Overview](#overview)
- [3.1 Photo Management](#31-photo-management)
- [3.2 Document Management](#32-document-management)
- [3.3 AI Item Detection](#33-ai-item-detection)
- [3.4 Barcode & QR Scanning](#34-barcode--qr-scanning)
- [3.5 Data Tag Parsing](#35-data-tag-parsing)
- [3.6 AI Enrichment & Valuation](#36-ai-enrichment--valuation)
- [3.7 Location Photos & Videos](#37-location-photos--videos)
- [3.8 Media Permissions](#38-media-permissions)
- [Web → Mobile Migration Reference](#web--mobile-migration-reference)
- [Shared Utilities](#shared-utilities)
- [Acceptance Criteria](#acceptance-criteria)
- [Effort Estimates](#effort-estimates)

---

## Overview

Phase 3 implements the full media pipeline — photo and document management with native camera integration — and all AI-powered features including item detection, barcode/QR scanning, data tag parsing, and enrichment. This phase maps three key web components to native mobile equivalents:

| Web Component | Lines | Mobile Equivalent |
|---|---|---|
| `src/components/AIDetection.tsx` | 492 | `AIDetectionScreen` + `CameraCaptureSheet` |
| `src/components/PhotoModal.tsx` | 223 | `PhotoViewerScreen` (fullscreen with pinch-to-zoom) |
| `src/components/EnrichmentModal.tsx` | 274 | `EnrichmentBottomSheet` |

**Backend endpoints consumed** (all require JWT auth via `Authorization: Bearer <token>`):

| Domain | Endpoints |
|---|---|
| Item Photos | `POST/GET/PATCH/DELETE /api/items/{id}/photos[/{photo_id}]` |
| Location Photos | `POST/DELETE /api/locations/{id}/photos[/{photo_id}]` |
| Location Videos | `POST/DELETE /api/locations/{id}/videos[/{video_id}]` |
| Documents | `POST/DELETE /api/items/{id}/documents[/{doc_id}]`, `POST /api/items/{id}/documents/from-url` |
| AI | `POST /api/ai/detect-items`, `parse-data-tag`, `barcode-lookup`, `barcode-lookup-multi`, `scan-qr`, `scan-barcode`, `run-valuation`, `enrich-from-data-tags` |
| AI Status | `GET /api/ai/status`, `GET /api/ai/ai-providers` |

---

## 3.1 Photo Management

### Expo Dependencies

```bash
npx expo install expo-camera expo-image-picker expo-image-manipulator expo-image
```

### 3.1.1 Camera & Gallery Integration

Provide two entry points for adding photos: direct camera capture and gallery selection.

**Camera capture with `expo-camera`:**

```typescript
// screens/CameraCaptureScreen.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

export default function CameraCaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.85,
      exif: true,
    });
    // photo.uri is a local file:// path ready for upload
    return photo;
  };

  if (!permission?.granted) {
    return <PermissionRequest onRequest={requestPermission} type="camera" />;
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <CameraOverlay
          onCapture={takePhoto}
          onFlip={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        />
      </CameraView>
    </View>
  );
}
```

**Gallery selection with `expo-image-picker`:**

```typescript
// hooks/usePhotoPicker.ts
import * as ImagePicker from 'expo-image-picker';

export function usePhotoPicker() {
  const pickFromGallery = async (allowMultiple = true) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowMultiple,
      quality: 0.85,
      exif: true,
    });

    if (result.canceled) return [];
    return result.assets; // Array of { uri, width, height, mimeType, fileSize }
  };

  const takeWithCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      exif: true,
    });

    if (result.canceled) return null;
    return result.assets[0];
  };

  return { pickFromGallery, takeWithCamera };
}
```

### 3.1.2 Photo Type Assignment

The backend supports these photo types (stored as `photo_type: Optional[str]` on the `Photo` model, plus boolean flags `is_primary` and `is_data_tag`):

| Type | Description | Backend Field |
|---|---|---|
| `default` | General item photo | `photo_type="default"` |
| `data_tag` | Product label / specs label | `photo_type="data_tag"`, `is_data_tag=true` |
| `receipt` | Purchase receipt | `photo_type="receipt"` |
| `warranty` | Warranty documentation | `photo_type="warranty"` |
| `optional` | Supplementary photo | `photo_type="optional"` |
| `profile` | Primary display photo | `photo_type="profile"`, `is_primary=true` |

Expose type selection as a bottom-sheet picker or segmented control during upload:

```typescript
// components/PhotoTypePicker.tsx
const PHOTO_TYPES = [
  { value: 'default',  label: 'General',   icon: 'image-outline' },
  { value: 'data_tag', label: 'Data Tag',  icon: 'pricetag-outline' },
  { value: 'receipt',  label: 'Receipt',   icon: 'receipt-outline' },
  { value: 'warranty', label: 'Warranty',  icon: 'shield-checkmark-outline' },
  { value: 'optional', label: 'Other',     icon: 'ellipsis-horizontal' },
  { value: 'profile',  label: 'Profile',   icon: 'star-outline' },
] as const;

type PhotoType = typeof PHOTO_TYPES[number]['value'];
```

### 3.1.3 Photo Compression Before Upload

The backend accepts up to **25 MB** per photo (`MAX_PHOTO_BYTES`), but compressing before upload improves speed and data usage on mobile:

```typescript
// utils/imageCompression.ts
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function compressPhoto(
  uri: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<{ uri: string; width: number; height: number }> {
  const { maxWidth = 2048, quality = 0.8 } = options ?? {};

  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: SaveFormat.JPEG }
  );

  return result; // { uri, width, height }
}
```

### 3.1.4 Upload Implementation

The web app uploads via `fetch` + browser `FormData` with a `File` object (see `src/lib/api.ts:653–676`). React Native requires a different `FormData` shape — the file is described as an object with `uri`, `name`, and `type` properties rather than a `File` blob:

```typescript
// services/photoApi.ts
import { getAuthHeaders } from './auth';
import { API_BASE_URL } from '../config';

interface UploadPhotoParams {
  itemId: string;
  uri: string;             // Local file:// URI from camera or picker
  photoType?: string;
  isPrimary?: boolean;
  isDataTag?: boolean;
  onProgress?: (percent: number) => void;
}

export async function uploadPhoto({
  itemId,
  uri,
  photoType = 'default',
  isPrimary = false,
  isDataTag = false,
  onProgress,
}: UploadPhotoParams): Promise<Photo> {
  const formData = new FormData();

  // React Native FormData file shape — the 'as any' cast is required
  // because RN's FormData.append() expects this non-standard object
  formData.append('file', {
    uri,
    name: `photo_${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  formData.append('is_primary', String(isPrimary));
  formData.append('is_data_tag', String(isDataTag));
  if (photoType) {
    formData.append('photo_type', photoType);
  }

  // Use XMLHttpRequest for progress tracking (fetch does not support upload progress)
  if (onProgress) {
    return uploadWithProgress(
      `${API_BASE_URL}/api/items/${itemId}/photos`,
      formData,
      onProgress,
    );
  }

  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/photos`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!res.ok) throw new UploadError(res.status, await res.text());
  return res.json();
}
```

**Upload progress tracking with `XMLHttpRequest`:**

```typescript
// utils/uploadWithProgress.ts
export function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new UploadError(xhr.status, xhr.responseText));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')));

    xhr.open('POST', url);
    // Set auth header — do NOT set Content-Type (browser sets multipart boundary)
    const headers = getAuthHeaders();
    Object.entries(headers).forEach(([key, val]) => xhr.setRequestHeader(key, val));

    xhr.timeout = 60_000; // 60s timeout for large photos
    xhr.send(formData);
  });
}
```

**Retry logic and offline queue** — integrate with the offline queue from Phase 1:

```typescript
// services/uploadQueue.ts
interface QueuedUpload {
  id: string;
  endpoint: string;
  formData: FormData;
  retries: number;
  maxRetries: number;
  createdAt: number;
}

class UploadQueue {
  private queue: QueuedUpload[] = [];

  enqueue(upload: Omit<QueuedUpload, 'id' | 'retries' | 'createdAt'>) {
    this.queue.push({
      ...upload,
      id: uuid(),
      retries: 0,
      createdAt: Date.now(),
    });
    this.processQueue();
  }

  private async processQueue() {
    // Process sequentially to avoid overwhelming the network
    for (const upload of this.queue.filter(u => u.retries <= u.maxRetries)) {
      try {
        await this.executeUpload(upload);
        this.queue = this.queue.filter(u => u.id !== upload.id);
      } catch (error) {
        upload.retries += 1;
        if (upload.retries > upload.maxRetries) {
          // Move to dead-letter; notify user
        }
      }
    }
  }
}
```

### 3.1.5 Photo Viewing — Fullscreen Viewer

Replace the web `PhotoModal.tsx` (modal with `<img>` tag and metadata form) with a native fullscreen viewer supporting pinch-to-zoom and swipe navigation:

```typescript
// screens/PhotoViewerScreen.tsx
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex: number;
  onUpdateType: (photoId: string, type: string) => void;
  onDelete: (photoId: string) => void;
}

export default function PhotoViewerScreen({
  photos,
  initialIndex,
  onUpdateType,
  onDelete,
}: PhotoViewerProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.fullscreen}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex}
        renderItem={({ item }) => (
          <GestureDetector gesture={pinchGesture}>
            <Animated.View style={[styles.imageContainer, animatedStyle]}>
              <Image
                source={{ uri: `${API_BASE_URL}${item.file_path}` }}
                style={styles.fullImage}
                contentFit="contain"
                transition={200}
              />
            </Animated.View>
          </GestureDetector>
        )}
      />
      {/* Bottom toolbar: type reassignment, share, delete */}
      <PhotoViewerToolbar
        photo={photos[currentIndex]}
        onUpdateType={onUpdateType}
        onDelete={onDelete}
        onShare={sharePhoto}
      />
    </View>
  );
}
```

**Photo gallery in item detail** — horizontal scrollable thumbnail strip:

```typescript
// components/PhotoGallery.tsx
<FlatList
  data={item.photos}
  horizontal
  showsHorizontalScrollIndicator={false}
  keyExtractor={(photo) => photo.id}
  renderItem={({ item: photo, index }) => (
    <TouchableOpacity onPress={() => openViewer(index)}>
      <Image
        source={{ uri: `${API_BASE_URL}${photo.thumbnail_path ?? photo.file_path}` }}
        style={styles.thumbnail}
        placeholder={blurhash}
        contentFit="cover"
        transition={150}
      />
      {photo.is_primary && <PrimaryBadge />}
      <TypeBadge type={photo.photo_type} />
    </TouchableOpacity>
  )}
  ListFooterComponent={<AddPhotoButton onPress={showPhotoOptions} />}
/>
```

---

## 3.2 Document Management

### Expo Dependencies

```bash
npx expo install expo-document-picker expo-file-system expo-intent-launcher expo-linking
```

### 3.2.1 Document Upload

Backend accepted MIME types (from `backend/app/routers/documents.py:72`):

```
application/pdf, text/plain
```

Maximum file size: **50 MB** (`MAX_DOCUMENT_BYTES`).

```typescript
// services/documentApi.ts
import * as DocumentPicker from 'expo-document-picker';

export async function pickAndUploadDocument(itemId: string): Promise<Document> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) throw new UserCancelledError();

  const asset = result.assets[0];
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? 'application/pdf',
  } as any);

  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/documents`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!res.ok) throw new UploadError(res.status, await res.text());
  return res.json();
}
```

### 3.2.2 Document from URL

The backend endpoint `POST /api/items/{id}/documents/from-url` downloads a document from a user-supplied URL (with SSRF validation). Map this to a simple text input:

```typescript
// components/DocumentFromUrlSheet.tsx
export function DocumentFromUrlSheet({ itemId, onSuccess }: Props) {
  const [url, setUrl] = useState('');

  const submit = async () => {
    const formData = new FormData();
    formData.append('url', url);
    // Optionally: formData.append('document_type', selectedType);

    const res = await fetch(
      `${API_BASE_URL}/api/items/${itemId}/documents/from-url`,
      {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        body: formData,
      }
    );
    if (res.ok) onSuccess(await res.json());
  };

  return (
    <BottomSheet>
      <TextInput placeholder="https://example.com/manual.pdf" value={url} onChangeText={setUrl} />
      <Button title="Download" onPress={submit} />
    </BottomSheet>
  );
}
```

### 3.2.3 Opening Documents

Use the system viewer to open downloaded documents:

```typescript
// utils/openDocument.ts
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export async function openDocument(documentUrl: string, mimeType: string) {
  // Download to local cache first
  const localUri = FileSystem.cacheDirectory + 'document_' + Date.now();
  const download = await FileSystem.downloadAsync(
    `${API_BASE_URL}${documentUrl}`,
    localUri,
    { headers: getAuthHeaders() }
  );

  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(download.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: mimeType,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
  } else {
    // iOS: Linking can open PDFs in the native viewer
    await Linking.openURL(download.uri);
  }
}
```

---

## 3.3 AI Item Detection

Maps from `src/components/AIDetection.tsx` (492 lines). The web component uses a file input with `FileReader.readAsDataURL()` for preview, then sends the file to `/api/ai/detect-items` via `FormData`.

### 3.3.1 Screen Structure

```
AIDetectionScreen
├── AI Status Check (GET /api/ai/status on mount)
├── Image Source Selection
│   ├── Camera Capture (expo-camera)
│   └── Gallery Pick (expo-image-picker)
├── Image Preview
├── Detection Action (POST /api/ai/detect-items)
├── Results Display
│   ├── Detected items list (name, brand, category, confidence, value)
│   ├── Item selection checkboxes
│   └── Location assignment picker
└── Batch Create Action (POST to create items)
```

### 3.3.2 Implementation

```typescript
// screens/AIDetectionScreen.tsx
import { useState, useEffect } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { Image } from 'expo-image';

interface DetectedItem {
  name: string;
  brand?: string;
  category?: string;
  confidence: number;
  estimated_value?: number;
  description?: string;
}

interface DetectionResult {
  items: DetectedItem[];
  processing_time?: number;
}

export default function AIDetectionScreen() {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState<DetectionResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Check AI availability on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ai/status`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setAiAvailable(data.available))
      .catch(() => setAiAvailable(false));
  }, []);

  const detectItems = async () => {
    if (!imageUri) return;
    setDetecting(true);
    try {
      const compressed = await compressPhoto(imageUri, { maxWidth: 1920 });

      const formData = new FormData();
      formData.append('file', {
        uri: compressed.uri,
        name: 'detection.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${API_BASE_URL}/api/ai/detect-items`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      });

      if (!res.ok) throw new Error(`Detection failed: ${res.status}`);
      const data: DetectionResult = await res.json();
      setResults(data);
    } catch (error) {
      Alert.alert(
        'Detection Failed',
        'AI service may be unavailable. Check your AI provider settings.',
      );
    } finally {
      setDetecting(false);
    }
  };

  // ... render with:
  // - PermissionGate for camera
  // - Image preview section
  // - Animated loading indicator during detection
  // - Results FlatList with selection and confidence badges
  // - "Add Selected to Inventory" button
}
```

### 3.3.3 Detection Results Card

```typescript
// components/DetectionResultCard.tsx
interface Props {
  item: DetectedItem;
  selected: boolean;
  onToggle: () => void;
}

export function DetectionResultCard({ item, selected, onToggle }: Props) {
  const confidenceColor = item.confidence >= 0.8 ? '#22c55e'
    : item.confidence >= 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <TouchableOpacity onPress={onToggle} style={[styles.card, selected && styles.selected]}>
      <View style={styles.header}>
        <Checkbox value={selected} onValueChange={onToggle} />
        <Text style={styles.name}>{item.name}</Text>
        <ConfidenceBadge value={item.confidence} color={confidenceColor} />
      </View>
      {item.brand && <Text style={styles.detail}>Brand: {item.brand}</Text>}
      {item.category && <Text style={styles.detail}>Category: {item.category}</Text>}
      {item.estimated_value != null && (
        <Text style={styles.value}>${item.estimated_value.toFixed(2)}</Text>
      )}
    </TouchableOpacity>
  );
}
```

---

## 3.4 Barcode & QR Scanning

### 3.4.1 Built-in Camera Scanner

`expo-camera` includes built-in barcode scanning — no extra native module needed:

```typescript
// screens/BarcodeScannerScreen.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';

const SUPPORTED_BARCODE_TYPES = [
  'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39',
] as const;

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lookupResult, setLookupResult] = useState<ProductInfo | null>(null);

  const handleBarcodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return; // Prevent duplicate scans
    setScanned(true);

    // Haptic feedback on scan
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (type === 'qr') {
      await handleQRCode(data);
    } else {
      await handleBarcode(data, type);
    }
  };

  const handleBarcode = async (barcode: string, type: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/barcode-lookup`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      });
      const product: ProductInfo = await res.json();
      setLookupResult(product);
    } catch (error) {
      Alert.alert('Lookup Failed', 'Could not find product information.');
      setScanned(false);
    }
  };

  const handleQRCode = async (data: string) => {
    // Check if it's a NesVentory internal QR code (links to an item)
    if (data.startsWith('nesventory://') || data.includes('/items/')) {
      // Navigate to the referenced item
      const itemId = extractItemId(data);
      navigation.navigate('ItemDetail', { itemId });
    } else {
      // Send to backend for interpretation
      const res = await fetch(`${API_BASE_URL}/api/ai/scan-qr`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await res.json();
      setLookupResult(result);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: [...SUPPORTED_BARCODE_TYPES] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <ScannerOverlay />
      {lookupResult && (
        <ProductResultSheet
          product={lookupResult}
          onCreateItem={() => { /* navigate to AddItem with prefilled data */ }}
          onScanAgain={() => { setScanned(false); setLookupResult(null); }}
        />
      )}
    </View>
  );
}
```

### 3.4.2 Scanner Overlay UI

```typescript
// components/ScannerOverlay.tsx
// Renders a semi-transparent overlay with a centered scanning window and animated scan line
export function ScannerOverlay() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse
    );
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Four dark corner areas */}
      <View style={styles.topOverlay} />
      <View style={styles.middleRow}>
        <View style={styles.sideOverlay} />
        <View style={styles.scanWindow}>
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          {/* Corner markers */}
          <CornerMarker position="top-left" />
          <CornerMarker position="top-right" />
          <CornerMarker position="bottom-left" />
          <CornerMarker position="bottom-right" />
        </View>
        <View style={styles.sideOverlay} />
      </View>
      <View style={styles.bottomOverlay}>
        <Text style={styles.hint}>Point camera at a barcode or QR code</Text>
      </View>
    </View>
  );
}
```

### 3.4.3 Multi-Barcode Scanning

For scanning multiple barcodes in a session (e.g., inventorying a shelf):

```typescript
// screens/MultiBarcodeScreen.tsx
export default function MultiBarcodeScreen() {
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scannedCodes.includes(data)) return; // Skip duplicates
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScannedCodes(prev => [...prev, data]);
  };

  const batchLookup = async () => {
    const res = await fetch(`${API_BASE_URL}/api/ai/barcode-lookup-multi`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcodes: scannedCodes }),
    });
    const results = await res.json();
    // Navigate to results screen with batch creation option
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.badge}>
        <Text>{scannedCodes.length} scanned</Text>
      </View>
      <ScannedBarcodeList codes={scannedCodes} />
      {scannedCodes.length > 0 && (
        <Button title={`Look Up ${scannedCodes.length} Items`} onPress={batchLookup} />
      )}
    </View>
  );
}
```

### 3.4.4 Barcode Image Scanning

For printed barcodes that can't be live-scanned (e.g., damaged, small, or on a screen), capture a photo and send to the backend:

```typescript
// This uses the AI endpoint, not the camera's built-in scanner
export async function scanBarcodeFromImage(uri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: 'barcode.jpg',
    type: 'image/jpeg',
  } as any);

  const res = await fetch(`${API_BASE_URL}/api/ai/scan-barcode`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return res.json();
}
```

---

## 3.5 Data Tag Parsing

Data tags are product labels containing specifications (voltage, wattage, model number, serial number, manufacturer, etc.). The backend uses AI/OCR to extract structured data from a photo of these labels.

### 3.5.1 Capture Flow

```
1. User navigates to item → "Scan Data Tag" button
2. Camera opens (or gallery picker)
3. Photo taken/selected → preview shown
4. Send photo to POST /api/ai/parse-data-tag
5. Display parsed fields in editable form
6. User reviews/edits → applies to item fields
```

### 3.5.2 Implementation

```typescript
// screens/DataTagScanScreen.tsx
interface ParsedDataTag {
  voltage?: string;
  wattage?: string;
  model_number?: string;
  serial_number?: string;
  manufacturer?: string;
  frequency?: string;
  amperage?: string;
  certifications?: string[];
  raw_text?: string;
}

export default function DataTagScanScreen({ route }: Props) {
  const { itemId } = route.params;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedDataTag | null>(null);

  const parseDataTag = async () => {
    if (!imageUri) return;
    setParsing(true);
    try {
      const compressed = await compressPhoto(imageUri, { maxWidth: 2048, quality: 0.9 });
      const formData = new FormData();
      formData.append('file', {
        uri: compressed.uri,
        name: 'data_tag.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${API_BASE_URL}/api/ai/parse-data-tag`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      });

      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
      setParsedData(await res.json());
    } finally {
      setParsing(false);
    }
  };

  const applyToItem = async (fields: Partial<ParsedDataTag>) => {
    // PATCH /api/items/{itemId} with the parsed fields
    // Map parsed fields to item schema fields
    await updateItem(itemId, {
      model_number: fields.model_number,
      serial_number: fields.serial_number,
      manufacturer: fields.manufacturer,
      custom_fields: {
        voltage: fields.voltage,
        wattage: fields.wattage,
      },
    });
  };

  return (
    <ScrollView>
      <ImageCapture uri={imageUri} onCapture={setImageUri} />
      <Button title="Parse Data Tag" onPress={parseDataTag} loading={parsing} />
      {parsedData && (
        <ParsedFieldsForm
          data={parsedData}
          onApply={applyToItem}
          onCancel={() => setParsedData(null)}
        />
      )}
    </ScrollView>
  );
}
```

### 3.5.3 Parsed Fields Form

Display each parsed field in an editable text input so the user can correct OCR errors before applying:

```typescript
// components/ParsedFieldsForm.tsx
const FIELD_CONFIG = [
  { key: 'manufacturer',   label: 'Manufacturer',   icon: 'business-outline' },
  { key: 'model_number',   label: 'Model Number',   icon: 'barcode-outline' },
  { key: 'serial_number',  label: 'Serial Number',  icon: 'finger-print-outline' },
  { key: 'voltage',        label: 'Voltage',         icon: 'flash-outline' },
  { key: 'wattage',        label: 'Wattage',         icon: 'bulb-outline' },
  { key: 'frequency',      label: 'Frequency',       icon: 'pulse-outline' },
  { key: 'amperage',       label: 'Amperage',        icon: 'thunderstorm-outline' },
] as const;

export function ParsedFieldsForm({ data, onApply }: Props) {
  const [editedData, setEditedData] = useState(data);

  return (
    <View>
      {FIELD_CONFIG.map(({ key, label, icon }) => {
        const value = editedData[key as keyof ParsedDataTag];
        if (!value) return null;
        return (
          <View key={key} style={styles.field}>
            <Ionicons name={icon} size={20} />
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={String(value)}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, [key]: text }))}
              style={styles.input}
            />
          </View>
        );
      })}
      <Button title="Apply to Item" onPress={() => onApply(editedData)} />
    </View>
  );
}
```

---

## 3.6 AI Enrichment & Valuation

Maps from `src/components/EnrichmentModal.tsx` (274 lines). The web component displays enrichment suggestions from multiple AI sources with confidence scores, allowing the user to accept or reject each suggestion.

### 3.6.1 Enrichment Bottom Sheet

Use a bottom sheet (not a full modal) so the user can still see the item context behind it:

```typescript
// components/EnrichmentBottomSheet.tsx
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

interface EnrichmentSuggestion {
  source: string;
  confidence: number;
  data: {
    description?: string;
    brand?: string;
    model_number?: string;
    serial_number?: string;
    estimated_value?: number;
    market_value?: number;
    insurance_value?: number;
    resale_value?: number;
    category?: string;
    specifications?: Record<string, string>;
  };
}

export function EnrichmentBottomSheet({ itemId, visible, onDismiss }: Props) {
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const triggerEnrichment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/enrich`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion: EnrichmentSuggestion) => {
    // Only fill empty fields — preserve user-supplied data (matches web behavior)
    const currentItem = await fetchItem(itemId);
    const updates: Record<string, any> = {};

    for (const [key, value] of Object.entries(suggestion.data)) {
      if (value != null && !currentItem[key]) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      await patchItem(itemId, updates);
    }
  };

  const current = suggestions[currentIndex];

  return (
    <BottomSheet snapPoints={['50%', '85%']} enablePanDownToClose>
      <BottomSheetScrollView>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : current ? (
          <View>
            <SourceHeader source={current.source} confidence={current.confidence} />
            <EnrichmentFields data={current.data} />
            <View style={styles.actions}>
              <Button title="Skip" variant="outline"
                onPress={() => setCurrentIndex(i => i + 1)} />
              <Button title="Apply" onPress={() => applySuggestion(current)} />
            </View>
            <Text style={styles.counter}>
              {currentIndex + 1} of {suggestions.length}
            </Text>
          </View>
        ) : (
          <EmptyState message="No enrichment suggestions available" />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
```

### 3.6.2 Batch Enrichment from Data Tags

Enrich multiple items at once using their data tag photos:

```typescript
export async function enrichFromDataTags(itemIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/ai/enrich-from-data-tags`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds }),
  });
  if (!res.ok) throw new Error(`Enrichment failed: ${res.status}`);
}
```

### 3.6.3 AI Valuation

Location-wide valuation to estimate total value of items in a location:

```typescript
export async function runValuation(locationId: string): Promise<ValuationResult> {
  const res = await fetch(`${API_BASE_URL}/api/ai/run-valuation`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ location_id: locationId }),
  });
  return res.json();
}

// Usage in LocationDetailScreen:
// "Run AI Valuation" button → calls runValuation → displays summary
```

---

## 3.7 Location Photos & Videos

### 3.7.1 Location Photos

Same flow as item photos, but different endpoints:

```typescript
// services/locationMediaApi.ts
export async function uploadLocationPhoto(locationId: string, uri: string) {
  const compressed = await compressPhoto(uri);
  const formData = new FormData();
  formData.append('file', {
    uri: compressed.uri,
    name: `location_${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}/photos`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return res.json();
}

export async function deleteLocationPhoto(locationId: string, photoId: string) {
  await fetch(`${API_BASE_URL}/api/locations/${locationId}/photos/${photoId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
}
```

### 3.7.2 Location Videos

```bash
npx expo install expo-av
```

Allowed video types (from `backend/app/routers/videos.py:19–25`): `video/mp4`, `video/mpeg`, `video/quicktime`, `video/x-msvideo`, `video/webm`. Max size: **100 MB**.

```typescript
// services/locationMediaApi.ts
export async function uploadLocationVideo(locationId: string, uri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: `video_${Date.now()}.mp4`,
    type: 'video/mp4',
  } as any);

  return uploadWithProgress(
    `${API_BASE_URL}/api/locations/${locationId}/videos`,
    formData,
    (progress) => console.log(`Upload: ${progress}%`),
  );
}
```

**Video playback:**

```typescript
// components/VideoPlayer.tsx
import { Video, ResizeMode } from 'expo-av';

export function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  return (
    <Video
      source={{ uri: `${API_BASE_URL}${videoUrl}`, headers: getAuthHeaders() }}
      style={styles.video}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
    />
  );
}
```

---

## 3.8 Media Permissions

### 3.8.1 Permission Strategy

Request permissions just-in-time (when the user triggers a feature), not on app launch. Provide clear rationale.

| Permission | Expo API | Trigger |
|---|---|---|
| Camera | `expo-camera` → `useCameraPermissions()` | Take photo, scan barcode |
| Photo Library | `expo-image-picker` → `requestMediaLibraryPermissionsAsync()` | Pick from gallery |
| File Access | `expo-document-picker` | Pick documents (no extra permissions needed on most platforms) |

### 3.8.2 Reusable Permission Gate

```typescript
// components/PermissionGate.tsx
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

interface PermissionGateProps {
  granted: boolean | null;
  onRequest: () => Promise<void>;
  permissionName: string;
  rationale: string;
  children: React.ReactNode;
}

export function PermissionGate({
  granted,
  onRequest,
  permissionName,
  rationale,
  children,
}: PermissionGateProps) {
  if (granted === null) {
    // Permission not yet requested
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={48} color="#6b7280" />
        <Text style={styles.title}>{permissionName} Access Needed</Text>
        <Text style={styles.rationale}>{rationale}</Text>
        <Button title={`Grant ${permissionName} Access`} onPress={onRequest} />
      </View>
    );
  }

  if (granted === false) {
    // Permission denied — direct to settings
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.title}>{permissionName} Denied</Text>
        <Text style={styles.rationale}>
          {rationale} Please enable it in your device settings.
        </Text>
        <Button title="Open Settings" onPress={Linking.openSettings} />
      </View>
    );
  }

  return <>{children}</>;
}
```

**Usage:**

```typescript
const [permission, requestPermission] = useCameraPermissions();

<PermissionGate
  granted={permission?.granted ?? null}
  onRequest={requestPermission}
  permissionName="Camera"
  rationale="NesVentory uses the camera to scan barcodes, capture item photos, and read data tags."
>
  <CameraView ... />
</PermissionGate>
```

### 3.8.3 `app.json` Permission Strings

Add user-facing rationale strings to `app.json` (required for App Store / Play Store):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "NesVentory needs camera access to take item photos, scan barcodes, and read data tags."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "NesVentory needs photo library access so you can add existing photos to your inventory items."
        }
      ]
    ]
  }
}
```

---

## Web → Mobile Migration Reference

| Web Pattern | Mobile Replacement | Notes |
|---|---|---|
| `<input type="file" accept="image/*">` | `expo-image-picker` `launchImageLibraryAsync()` | Returns `{ uri, width, height, mimeType }` |
| `<input type="file" accept=".pdf,.txt">` | `expo-document-picker` `getDocumentAsync()` | Returns `{ uri, name, mimeType, size }` |
| `FileReader.readAsDataURL(file)` | Direct `uri` from picker | No conversion needed; `<Image source={{ uri }}>` |
| `URL.createObjectURL(blob)` | Direct `uri` from picker | RN `Image` handles `file://` URIs natively |
| `new FormData(); fd.append('file', file)` | `fd.append('file', { uri, name, type } as any)` | RN FormData uses URI-based object, not File blob |
| `<canvas>` for image manipulation | `expo-image-manipulator` | Resize, compress, rotate, crop |
| `navigator.mediaDevices.getUserMedia()` | `expo-camera` `CameraView` | Full native camera with barcode scanning |
| `fetch()` upload (no progress) | `XMLHttpRequest` with `upload.onprogress` | `fetch` doesn't support upload progress events |
| `<img src={objectUrl}>` | `<Image source={{ uri }} />` (from `expo-image`) | Use `expo-image` for caching, blurhash, transitions |
| `window.open(documentUrl)` | `expo-file-system` download + `IntentLauncher` | Download first, then open with system viewer |

---

## Shared Utilities

### File Structure

```
src/
├── services/
│   ├── photoApi.ts           # Item photo CRUD
│   ├── locationMediaApi.ts   # Location photo + video CRUD
│   ├── documentApi.ts        # Document CRUD
│   └── aiApi.ts              # All AI endpoint calls
├── hooks/
│   ├── usePhotoPicker.ts     # Camera + gallery picker
│   └── usePermission.ts      # Generic permission wrapper
├── utils/
│   ├── imageCompression.ts   # expo-image-manipulator wrapper
│   ├── uploadWithProgress.ts # XHR-based upload with progress
│   └── openDocument.ts       # System viewer launcher
├── components/
│   ├── PermissionGate.tsx    # Permission request/denied UI
│   ├── PhotoGallery.tsx      # Horizontal thumbnail strip
│   ├── PhotoTypePicker.tsx   # Type selector bottom sheet
│   ├── ScannerOverlay.tsx    # Camera scanning overlay
│   ├── DetectionResultCard.tsx
│   ├── ParsedFieldsForm.tsx
│   ├── EnrichmentBottomSheet.tsx
│   └── VideoPlayer.tsx
└── screens/
    ├── CameraCaptureScreen.tsx
    ├── PhotoViewerScreen.tsx
    ├── AIDetectionScreen.tsx
    ├── BarcodeScannerScreen.tsx
    ├── MultiBarcodeScreen.tsx
    └── DataTagScanScreen.tsx
```

### Expo Dependencies (all Phase 3)

```bash
npx expo install \
  expo-camera \
  expo-image-picker \
  expo-image-manipulator \
  expo-image \
  expo-document-picker \
  expo-file-system \
  expo-intent-launcher \
  expo-linking \
  expo-av \
  expo-haptics \
  react-native-gesture-handler \
  react-native-reanimated \
  @gorhom/bottom-sheet
```

---

## Acceptance Criteria

- [ ] Take a photo with the camera and upload it to an item with type assignment
- [ ] Pick one or more photos from the gallery and upload with progress indicator
- [ ] View photos in a fullscreen viewer with pinch-to-zoom and swipe between photos
- [ ] Delete photos and reassign photo types from the viewer
- [ ] Upload PDF/text documents and open them with the system viewer
- [ ] Download a document from URL via the backend
- [ ] AI Detection: capture or pick image → detect items → batch create from results
- [ ] Live barcode scanning with automatic product lookup
- [ ] Multi-barcode scanning session with batch lookup
- [ ] QR code scanning (NesVentory internal links + generic)
- [ ] Image-based barcode scanning for damaged/printed barcodes
- [ ] Data tag photo capture → parse → review → apply fields to item
- [ ] AI enrichment: trigger, review suggestions, apply selected data
- [ ] Batch enrichment from data tags
- [ ] Location photo upload and delete
- [ ] Location video upload, delete, and playback
- [ ] Camera permission requested just-in-time with clear rationale
- [ ] Photo library permission handled gracefully
- [ ] Settings deep-link shown when permissions are permanently denied
- [ ] All uploads retry on failure; offline uploads queue and sync when online

---

## Effort Estimates

| Section | Scope | Estimate |
|---|---|---|
| 3.1 Photo Management | Camera, gallery, upload, compression, viewer, gallery strip | 2–3 days |
| 3.2 Document Management | Picker, upload, from-URL, system viewer | 0.5–1 day |
| 3.3 AI Item Detection | Screen, API integration, results UI, batch create | 1–1.5 days |
| 3.4 Barcode & QR Scanning | Live scanner, overlay, lookup, multi-scan, image scan | 1.5–2 days |
| 3.5 Data Tag Parsing | Capture, parse API, editable fields form | 0.5–1 day |
| 3.6 AI Enrichment | Bottom sheet, apply logic, batch enrichment, valuation | 1–1.5 days |
| 3.7 Location Photos & Videos | Upload/delete, video playback | 0.5–1 day |
| 3.8 Media Permissions | PermissionGate, app.json config, settings deep-link | 0.5 day |
| **Total** | | **8–12 days** |

> **Risk factor:** AI features depend on backend AI providers being configured (Gemini API key, plugin endpoints). Test with AI disabled and verify graceful degradation (status check on mount, informative error states).

---

## Related Documentation

- Phase 1: [01-Foundation-Setup.md](./01-Foundation-Setup.md)
- Phase 2: [02-Core-Screens-Navigation.md](./02-Core-Screens-Navigation.md)
- Backend API reference: `backend/app/routers/ai.py`, `photos.py`, `documents.py`, `videos.py`, `location_photos.py`
- Backend upload limits: `backend/app/upload_utils.py` (10 MB AI images, 25 MB photos, 50 MB docs, 100 MB videos)
