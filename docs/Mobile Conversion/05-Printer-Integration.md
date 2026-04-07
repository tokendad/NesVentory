# Phase 5: NIIMBOT Printer Integration

> **Complexity**: ⚠️ Highest of all phases — involves BLE protocol reverse engineering, image rasterization, and cross-platform native module integration.
>
> **Estimated Total Effort**: 4–6 weeks (1 senior developer)

---

## Table of Contents

- [Overview](#overview)
- [5.1 — BLE Library Setup](#51--ble-library-setup)
- [5.2 — NIIMBOT BLE Protocol Port](#52--niimbot-ble-protocol-port)
- [5.3 — QR Code & Label Generation](#53--qr-code--label-generation)
- [5.4 — Printer Discovery Screen](#54--printer-discovery-screen)
- [5.5 — Print Configuration Screen](#55--print-configuration-screen)
- [5.6 — Print Workflow](#56--print-workflow)
- [5.7 — Server-Relay Printing (Alternative Path)](#57--server-relay-printing-alternative-path)
- [5.8 — USB Serial (Optional / Future)](#58--usb-serial-optional--future)
- [Architecture Decision: PrinterDriver Abstraction](#architecture-decision-printerdriver-abstraction)
- [Platform Differences](#platform-differences)
- [Acceptance Criteria](#acceptance-criteria)
- [Dependencies](#dependencies)
- [Risk Mitigations](#risk-mitigations)
- [Estimated Effort Breakdown](#estimated-effort-breakdown)

---

## Overview

NesVentory's web application communicates with **NIIMBOT thermal label printers** using the Web Bluetooth and Web Serial APIs (see `src/lib/niimbot.ts`). These browser-only APIs are unavailable inside React Native. Phase 5 replaces them with **native BLE libraries** so the mobile app can discover, connect to, and print labels on NIIMBOT printers directly from a phone.

A secondary path — **server-relay printing** — sends print jobs to the NesVentory backend which drives a server-attached printer over USB or Bluetooth. This path requires zero native BLE code and works immediately with the existing REST API.

### What We're Porting

| Web Source File | Lines | Responsibility | Mobile Replacement |
|---|---|---|---|
| `src/lib/niimbot.ts` | 387 | BLE/Serial transport, packet protocol, image rasterization | `react-native-ble-plx` + custom protocol module |
| `src/components/QRLabelPrint.tsx` | 1,229 | QR generation (Canvas + `qrcode`), label layout, print orchestration | `react-native-qrcode-svg` + `react-native-view-shot` / Skia |

### Connection Modes (Existing Web)

The web UI already supports four connection modes (defined in `QRLabelPrint.tsx`):

```typescript
export type ConnectionType = "bluetooth" | "usb" | "server" | "system";
```

| Mode | Web Implementation | Mobile Equivalent |
|---|---|---|
| `bluetooth` | Web Bluetooth API → `BluetoothTransport` | `react-native-ble-plx` → `BLEPrinterDriver` |
| `usb` | Web Serial API → `SerialTransport` | Android USB OTG (future) |
| `server` | REST API → `POST /printer/print-label` | Same REST API → `ServerPrinterDriver` |
| `system` | REST API → `POST /printer/system/print` | Same REST API (CUPS) |

---

## 5.1 — BLE Library Setup

### Primary Library

**[`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx)** — the most mature and widely adopted BLE library for React Native. It wraps CoreBluetooth (iOS) and Android BLE APIs with a consistent JavaScript interface.

**Alternative**: `react-native-ble-manager` — slightly different API surface, less active maintenance, but viable if `ble-plx` has blocking issues.

### Expo Compatibility

> **Critical**: Managed Expo does not support native BLE modules. You must use an **Expo dev client** (custom development build) or eject to bare workflow.

```bash
# Install BLE library
npx expo install react-native-ble-plx

# Create custom dev client (required for native BLE)
npx expo prebuild
npx expo run:ios   # or run:android
```

### iOS Configuration

Add Bluetooth usage descriptions to `ios/<AppName>/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>NesVentory needs Bluetooth to communicate with your NIIMBOT label printer.</string>

<key>NSBluetoothPeripheralUsageDescription</key>
<string>NesVentory needs Bluetooth to discover and print labels on NIIMBOT printers.</string>
```

### Android Configuration

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Bluetooth permissions (all Android versions) -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 12+ (API 31+) — granular Bluetooth permissions -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

<!-- BLE feature declaration -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
```

### Runtime Permission Flow (Android 12+)

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(results).every(
      r => r === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS handles permissions via Info.plist — system prompt shown automatically
  return true;
}
```

**Effort estimate**: 2–3 days (setup, permissions, dev client configuration)

---

## 5.2 — NIIMBOT BLE Protocol Port

This is the core of the mobile printer driver. The web's `niimbot.ts` implements a proprietary BLE protocol that must be ported to React Native's BLE stack.

### BLE Service & Characteristic UUIDs

From `src/lib/niimbot.ts` (line 5–6) and `backend/app/niimbot/printer.py` (line 64–65):

```typescript
// Single service, single characteristic — all communication goes through this pair
const NIIMBOT_SERVICE_UUID  = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
const NIIMBOT_CHARACTERISTIC_UUID = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';
```

All NIIMBOT printers use the **same** service/characteristic UUIDs. The characteristic supports both **write** (commands to printer) and **notify** (responses from printer).

### Device Discovery

The web uses name-prefix filters for BLE scanning (line 138–155 of `niimbot.ts`):

```typescript
// NIIMBOT printers advertise with single-letter prefixes
const NIIMBOT_NAME_PREFIXES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K', 'M', 'N', 'P', 'S', 'T', 'Z'
];
```

**React Native implementation**:

```typescript
import { BleManager, Device } from 'react-native-ble-plx';

const bleManager = new BleManager();

function scanForNiimbotPrinters(
  onDeviceFound: (device: Device) => void,
  timeoutMs = 10000
): void {
  bleManager.startDeviceScan(
    [NIIMBOT_SERVICE_UUID],  // Filter by service UUID
    { allowDuplicates: false },
    (error, device) => {
      if (error) {
        console.error('BLE scan error:', error);
        return;
      }
      if (device && isNiimbotDevice(device)) {
        onDeviceFound(device);
      }
    }
  );

  // Stop scanning after timeout
  setTimeout(() => bleManager.stopDeviceScan(), timeoutMs);
}

function isNiimbotDevice(device: Device): boolean {
  if (!device.name) return false;
  const PREFIXES = ['A','B','C','D','E','F','H','J','K','M','N','P','S','T','Z'];
  return PREFIXES.some(p => device.name!.startsWith(p));
}
```

### Packet Protocol

The NIIMBOT packet format is identical across all models (from `backend/app/niimbot/packet.py` and `niimbot.ts` lines 72–125):

```
┌────────┬──────┬─────────┬──────────────┬──────────┬────────┐
│ Header │ Type │ DataLen │ Data (0..N)  │ Checksum │ Footer │
│ 0x5555 │ 1B   │ 1B      │ N bytes      │ 1B       │ 0xAAAA │
└────────┴──────┴─────────┴──────────────┴──────────┴────────┘

Checksum = Type XOR DataLen XOR Data[0] XOR Data[1] XOR ... XOR Data[N-1]
```

**React Native packet implementation**:

```typescript
export class NiimbotPacket {
  constructor(
    public readonly type: number,
    public readonly data: Uint8Array
  ) {}

  /** Serialize packet to bytes for BLE transmission. */
  toBytes(): Uint8Array {
    const len = this.data.length;
    let checksum = this.type ^ len;
    for (const b of this.data) checksum ^= b;

    // Total: Header(2) + Type(1) + Len(1) + Data(N) + Checksum(1) + Footer(2)
    const packet = new Uint8Array(7 + len);
    packet[0] = 0x55;
    packet[1] = 0x55;
    packet[2] = this.type;
    packet[3] = len;
    packet.set(this.data, 4);
    packet[4 + len] = checksum;
    packet[5 + len] = 0xaa;
    packet[6 + len] = 0xaa;
    return packet;
  }

  /** Parse packet from received BLE notification data. */
  static fromBytes(buffer: Uint8Array): NiimbotPacket | null {
    if (buffer.length < 7) return null;
    if (buffer[0] !== 0x55 || buffer[1] !== 0x55) return null;

    const type = buffer[2];
    const len = buffer[3];
    if (buffer.length < 7 + len) return null;

    const data = buffer.slice(4, 4 + len);
    let checksum = type ^ len;
    for (const b of data) checksum ^= b;

    if (checksum !== buffer[4 + len]) {
      console.warn('NIIMBOT packet checksum mismatch');
      return null;
    }

    // Verify footer
    if (buffer[5 + len] !== 0xaa || buffer[6 + len] !== 0xaa) return null;

    return new NiimbotPacket(type, data);
  }
}
```

### Command Types (Request Codes)

From `niimbot.ts` lines 54–70 and `backend/app/niimbot/printer.py` lines 31–45:

| Code | Hex | Name | Direction | Description |
|---|---|---|---|---|
| 1 | `0x01` | `START_PRINT` | → Printer | Begin print job |
| 3 | `0x03` | `START_PAGE_PRINT` | → Printer | Begin page within job |
| 19 | `0x13` | `SET_DIMENSION` | → Printer | Set label width × height (pixels, big-endian `uint16` pairs) |
| 21 | `0x15` | `SET_QUANTITY` | → Printer | Set number of copies |
| 26 | `0x1A` | `GET_RFID` | → Printer | Read RFID tag on label roll |
| 32 | `0x20` | `ALLOW_PRINT_CLEAR` | → Printer | Clear print buffer |
| 33 | `0x21` | `SET_LABEL_DENSITY` | → Printer | Set print darkness (1–5) |
| 35 | `0x23` | `SET_LABEL_TYPE` | → Printer | Set label type (gap, continuous, etc.) |
| 64 | `0x40` | `GET_INFO` | ↔ Both | Query device info (serial, firmware, battery) |
| 133 | `0x85` | `PRINT_BITMAP_ROW` | → Printer | Send one rasterized scanline |
| 163 | `0xA3` | `GET_PRINT_STATUS` | ↔ Both | Poll print progress |
| 192 | `0xC0` | `CONNECT` | ↔ Both | Protocol handshake (backend only) |
| 220 | `0xDC` | `HEARTBEAT` | ↔ Both | Status query (battery, paper, cover) |
| 227 | `0xE3` | `END_PAGE_PRINT` | → Printer | End page |
| 243 | `0xF3` | `END_PRINT` | → Printer | End print job |

**Response codes** follow a convention: `response_code = request_code + 1` (for most commands).

### Print Sequence

The complete print sequence extracted from `niimbot.ts` `printImage()` (lines 319–386) and the backend's `printer.py` (lines 374–525):

```
1. SET_LABEL_DENSITY  (0x21) — density value (1–5)
2. SET_LABEL_TYPE     (0x23) — label type (1 = gap-detect)
3. START_PRINT        (0x01) — begin job
4. START_PAGE_PRINT   (0x03) — begin page
5. SET_DIMENSION      (0x13) — width and height in pixels (big-endian uint16)
6. PRINT_BITMAP_ROW   (0x85) — repeated for each scanline (row 0..N)
7. END_PAGE_PRINT     (0xE3) — end page
8. [wait for print completion]
9. END_PRINT          (0xF3) — end job
```

### Bitmap Row Packet Format (`0x85`)

Each scanline sent via `PRINT_BITMAP_ROW` has this structure:

```
┌─────────────┬────┬────┬────┬─────┬─────────────────────┐
│ Row Index   │ C1 │ C2 │ C3 │ Rep │ Monochrome Bits     │
│ uint16 (BE) │ u8 │ u8 │ u8 │ u8  │ ceil(width/8) bytes │
└─────────────┴────┴────┴────┴─────┴─────────────────────┘

- Row Index: 0-based scanline number
- C1, C2, C3: Pixel count bytes (used by V5 protocol for run-length hints;
              set to 0 for simple encoding, or to black-pixel count for V5)
- Rep: Repeat count (always 1 for single-pass printing)
- Monochrome Bits: 1 bit per pixel, MSB first. 1 = black (burn), 0 = white (skip)
```

### V5 Protocol Variant

Newer models (D11-H, D101, D110, D110-M, B21, B21 Pro, B21-C2B, M2-H) use **V5 protocol** with different `START_PRINT` and `SET_DIMENSION` payload formats:

```typescript
// V5 START_PRINT — 9-byte payload
const startPrintV5 = new Uint8Array([
  0x00, 0x01,                    // quantity (uint16 BE)
  0x00, 0x00, 0x00, 0x00,       // padding
  0x00, 0x00, 0x01              // const
]);

// V5 SET_DIMENSION — 13-byte payload
// struct.pack(">HHH H B B B H", height, width, qty, 0, 0, 0, 1, 0)
function setDimensionV5(width: number, height: number): Uint8Array {
  const buf = new ArrayBuffer(13);
  const view = new DataView(buf);
  view.setUint16(0, height);     // rows
  view.setUint16(2, width);      // columns
  view.setUint16(4, 1);          // quantity
  view.setUint16(6, 0);          // padding
  view.setUint8(8, 0);           // 0
  view.setUint8(9, 0);           // 0
  view.setUint8(10, 1);          // const
  view.setUint16(11, 0);         // padding
  return new Uint8Array(buf);
}
```

### MTU Negotiation

**Critical mobile difference**: BLE Maximum Transmission Unit (MTU) varies by platform.

| Platform | Default MTU | Typical Negotiated | Notes |
|---|---|---|---|
| Android | 23 bytes | 185–512 bytes | Must explicitly request higher MTU |
| iOS | 185 bytes | 185–512 bytes | Negotiated automatically by CoreBluetooth |
| Web Bluetooth | 20 bytes (usable) | Handled by browser | Browser splits writes internally |

```typescript
// After connecting on Android, request higher MTU
const device = await bleManager.connectToDevice(deviceId);
const mtu = await device.requestMTU(512);  // Request max
console.log(`Negotiated MTU: ${mtu}`);

// BLE write payload limit = MTU - 3 (ATT header)
const maxWriteSize = mtu - 3;
```

### Write Chunking

When a packet exceeds the BLE MTU, split it into chunks:

```typescript
async function writeWithChunking(
  device: Device,
  serviceUUID: string,
  charUUID: string,
  data: Uint8Array,
  mtu: number
): Promise<void> {
  const chunkSize = mtu - 3; // ATT protocol overhead
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.slice(offset, Math.min(offset + chunkSize, data.length));
    const base64Chunk = Buffer.from(chunk).toString('base64');
    await device.writeCharacteristicWithoutResponseForService(
      serviceUUID,
      charUUID,
      base64Chunk
    );
    // Small delay to prevent BLE buffer overflow (especially for D11/D110)
    if (offset % (chunkSize * 10) === 0) {
      await new Promise(r => setTimeout(r, 5));
    }
  }
}
```

### Notification Handling (Reading Responses)

Unlike the web's simplified write-only approach, the mobile driver should implement full response handling via BLE notifications (matching the backend's `_transceive` pattern):

```typescript
// Set up notification listener on the NIIMBOT characteristic
device.monitorCharacteristicForService(
  NIIMBOT_SERVICE_UUID,
  NIIMBOT_CHARACTERISTIC_UUID,
  (error, characteristic) => {
    if (error) {
      console.error('Notification error:', error);
      return;
    }
    if (characteristic?.value) {
      const data = Buffer.from(characteristic.value, 'base64');
      receiveBuffer.push(...data);
      processReceivedPackets(); // Parse packets from buffer
    }
  }
);
```

**Effort estimate**: 8–10 days (protocol port, MTU handling, connection management, response parsing)

---

## 5.3 — QR Code & Label Generation

The web uses the Canvas API and the `qrcode` npm package for label rendering. React Native has no Canvas API, so we need alternative approaches.

### QR Code Generation

**Primary library**: [`react-native-qrcode-svg`](https://github.com/awesomejerry/react-native-qrcode-svg)

Generates QR codes as SVG, which renders natively on both platforms:

```tsx
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={`${APP_URL}/#/item/${item.id}`}
  size={200}
  ecl="H"             // High error correction (matches backend: ERROR_CORRECT_H)
  backgroundColor="white"
  color="black"
/>
```

### SVG → Bitmap Conversion for Printing

NIIMBOT printers need rasterized bitmap data, not SVG. Two approaches:

**Option A — `react-native-view-shot`** (simpler, recommended for MVP):

```typescript
import { captureRef } from 'react-native-view-shot';

// Render label in a hidden View, then capture as PNG
const uri = await captureRef(labelViewRef, {
  format: 'png',
  quality: 1.0,
  width: labelWidthPx,
  height: labelHeightPx,
});
// uri is a local file path to the captured PNG
```

**Option B — `react-native-skia`** (higher performance, pixel-perfect):

```typescript
import { Skia, Canvas, Image } from '@shopify/react-native-skia';

// Draw directly to an offscreen Skia surface
const surface = Skia.Surface.Make(width, height)!;
const canvas = surface.getCanvas();
// ... draw QR code, text, borders ...
const image = surface.makeImageSnapshot();
const pixels = image.readPixels();  // Raw RGBA pixel data
```

### Barcode Generation

For barcode support: `react-native-barcode-builder` or render barcodes via Skia/SVG.

### Label Layout Engine

Define label templates that match the web's layout patterns from `QRLabelPrint.tsx`:

```typescript
interface LabelTemplate {
  name: string;
  widthPx: number;
  heightPx: number;
  widthMm: number;
  lengthMm: number;
  elements: LabelElement[];
}

type LabelElement =
  | { type: 'qrcode'; x: number; y: number; size: number; value: string }
  | { type: 'text'; x: number; y: number; fontSize: number; bold: boolean; value: string }
  | { type: 'barcode'; x: number; y: number; width: number; height: number; value: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number };
```

### Image Rasterization for NIIMBOT

Convert the captured label image to 1-bit monochrome data suitable for NIIMBOT thermal printing.

**Step 1: Convert to grayscale**

```typescript
function rgbaToGrayscale(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}
```

**Step 2: Apply Floyd-Steinberg dithering** (critical for QR code readability on thermal paper):

```typescript
function floydSteinbergDither(gray: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Float32Array(gray); // Work in float for error diffusion

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = result[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      result[idx] = newPixel;
      const error = oldPixel - newPixel;

      if (x + 1 < width)              result[idx + 1]         += error * 7 / 16;
      if (y + 1 < height && x > 0)    result[idx + width - 1] += error * 3 / 16;
      if (y + 1 < height)             result[idx + width]     += error * 5 / 16;
      if (y + 1 < height && x + 1 < width) result[idx + width + 1] += error * 1 / 16;
    }
  }

  // Convert to binary
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < result.length; i++) {
    binary[i] = result[i] < 128 ? 1 : 0; // 1 = black
  }
  return binary;
}
```

> **Note**: For clean QR codes/barcodes, simple threshold (< 128 = black) is usually sufficient. Floyd-Steinberg dithering is needed for photos or gradients.

**Step 3: Pack to 1-bit-per-pixel rows**

This matches the web's `printImage()` logic at `niimbot.ts` lines 338–356:

```typescript
function packMonochromeRow(binary: Uint8Array, y: number, width: number): Uint8Array {
  const bytesPerRow = Math.ceil(width / 8);
  const rowBytes = new Uint8Array(bytesPerRow);

  for (let x = 0; x < width; x++) {
    const isBlack = binary[y * width + x] === 1;
    if (isBlack) {
      const byteIdx = Math.floor(x / 8);
      const bitIdx = 7 - (x % 8);   // MSB first
      rowBytes[byteIdx] |= (1 << bitIdx);
    }
  }

  return rowBytes;
}
```

### Print Direction & Image Rotation

NIIMBOT models have different **print directions** that affect whether the image needs rotation before sending:

| Print Direction | Models | Rotation Required | Description |
|---|---|---|---|
| `left` | D11, D11S, D11-H, D101, D110, D110-M, B18 | +90° CW | Printhead is on the left side |
| `top` | B1, B21, B21 Pro, B21-C2B, M2-H | None (0°) | Printhead is on top |

This matches the `printDirection` field in `niimbot.ts` (line 11) and the `direction` field in `printer_service.py` `PRINTER_MODELS` dict (lines 122–132).

**Effort estimate**: 5–7 days (QR generation, layout engine, rasterization, dithering)

---

## 5.4 — Printer Discovery Screen

### UI Components

```
┌─────────────────────────────────┐
│  🔍 Find NIIMBOT Printers      │
│                                 │
│  Scanning...  ○○○               │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 📱 D11-H                  │  │
│  │    Signal: ████░░ -62 dBm │  │
│  │    [Connect]              │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📱 B21                    │  │
│  │    Signal: ██░░░░ -78 dBm │  │
│  │    [Connect]              │  │
│  └───────────────────────────┘  │
│                                 │
│  ── Previously Connected ──     │
│  ┌───────────────────────────┐  │
│  │ 📱 D11-H (Last: 2h ago)  │  │
│  │    [Reconnect]            │  │
│  └───────────────────────────┘  │
│                                 │
│  ℹ️ Not finding your printer?   │
│  • Make sure it's powered on   │
│  • Stay within 3 meters        │
│  • Check Bluetooth is enabled  │
└─────────────────────────────────┘
```

### Features

- **Live scan**: Show devices as they're discovered, sorted by signal strength (RSSI)
- **Device identification**: Parse NIIMBOT model from advertised name (e.g., "D11-H_1234")
- **Saved devices**: Persist previously connected device IDs in `AsyncStorage` for quick reconnect
- **Connection status**: Global indicator (header bar icon) showing connected/disconnected/connecting
- **Error handling**: Clear messages for common issues (Bluetooth off, permissions denied, no devices found)
- **Pull-to-refresh**: Re-trigger BLE scan

### Connection State Machine

```
  ┌──────────────┐
  │ Disconnected │◄─────────────────┐
  └──────┬───────┘                  │
         │ user taps "Connect"      │ connection lost /
         ▼                          │ user disconnects
  ┌──────────────┐                  │
  │  Connecting  │──── timeout ─────┤
  └──────┬───────┘     (30s)        │
         │ success                  │
         ▼                          │
  ┌──────────────┐                  │
  │  Connected   │──────────────────┘
  └──────────────┘
         │ connection drop detected
         ▼
  ┌──────────────┐
  │ Reconnecting │──── max retries ──► Disconnected
  └──────────────┘     (3 attempts)
```

**Effort estimate**: 3–4 days (UI, scanning, saved devices, state machine)

---

## 5.5 — Print Configuration Screen

Map from the web's printer configuration (defined in `backend/app/routers/printer.py` `PrinterConfig` model, lines 61–72):

### Configuration Fields

| Field | Source | Mobile UI Control |
|---|---|---|
| Printer model | `GET /api/printer/models` | Dropdown/picker |
| Connection type | BLE / Server / System | Segmented control |
| Bluetooth address | Filled from discovery screen | Auto-populated, editable |
| Density | 1–5 (varies by model) | Slider with model-specific bounds |
| Label width (mm) | From model spec or custom | Numeric input (validated against max) |
| Label length (mm) | User-configurable | Numeric input (validated against max) |
| Print direction | `left` or `top` (from model spec) | Read-only display |

### Supported Printer Models

From `printer_service.py` `PRINTER_MODELS` and `niimbot.ts` `NIIMBOT_MODELS`:

| Model | DPI | Printhead (px) | Direction | Max Width (mm) | Max Length (mm) | Density Range |
|---|---|---|---|---|---|---|
| D11-H | 300 | 142 | `left` | 15 | 200 | 1–5 |
| D101 | 203 | 192 | `left` | 25 | 100 | 1–3 |
| D110 | 203 | 96 | `left` | 15 | 100 | 1–3 |
| D110-M | 203 | 96 | `left` | 15 | 100 | 1–5 |
| B1 | 203 | 384 | `top` | 50 | 200 | 1–5 |
| B21 | 203 | 384 | `top` | 50 | 200 | 1–5 |
| B21 Pro | 300 | 591 | `top` | 50 | 200 | 1–5 |
| B21-C2B | 203 | 384 | `top` | 50 | 200 | 1–5 |
| M2-H | 300 | 567 | `top` | 50 | 240 | 1–5 |

### Label Profiles

The backend supports **label profiles** via the `printer_profiles` router (`backend/app/routers/printer_profiles.py`):

- `GET /api/printer/profiles/printer` — List saved printer profiles
- `POST /api/printer/profiles/printer` — Create new printer profile
- Label profiles: save/load custom label dimensions, density, and layout settings

The mobile app should sync these profiles from the server so the user's label preferences are consistent across web and mobile.

### Test Print

Include a **Test Print** button that calls `POST /api/printer/print-test-label` (server-relay mode) or performs a local BLE test print with a timestamp and model identification.

**Effort estimate**: 3–4 days (UI forms, model data, profile sync, validation)

---

## 5.6 — Print Workflow

### Entry Points

The print action is accessible from multiple locations:

1. **Item Detail Screen** → "Print Label" button → prints item QR label
2. **Location Detail Screen** → "Print Label" button → prints location QR label
3. **Batch Print** → Select multiple items → "Print All" → sequential print jobs

### User Flow

```
Item/Location Detail
        │
        ▼
  ┌─────────────┐
  │ Print Label  │  ← Button in detail screen
  └──────┬──────┘
         │
         ▼
  ┌─────────────────┐
  │ Select Profile   │  ← Choose label profile/template
  │ (or use default) │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │ Preview Label    │  ← Show rendered label before printing
  │ [Edit] [Print]   │
  └──────┬──────────┘
         │ user taps Print
         ▼
  ┌─────────────────┐
  │ Printing...      │  ← Progress indicator with row count
  │ ████████░░ 75%   │
  └──────┬──────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Success    Error
 ✅ Done    ❌ "Cover open" / "No labels" / "Connection lost"
            [Retry] [Cancel]
```

### Print Modes

Matching the web's `PrintMode` from `QRLabelPrint.tsx` (lines 23–29):

| Mode | Description |
|---|---|
| `qr_only` | QR code only — no text |
| `qr_with_items` | QR code + item name + location (default) |
| `items_only` | Text list only — no QR code |

### Error Handling

The backend's `heartbeat()` method (lines 578–629 of `printer.py`) returns status information that maps to user-facing errors:

| Raw Status | Meaning | User Message |
|---|---|---|
| `closingstate = 1` (B-series) | Cover open | "Printer cover is open. Please close it and try again." |
| `paperstate = 1` (B-series) | No labels loaded | "No labels detected. Please load a label roll." |
| `powerlevel < 10` | Low battery | "Printer battery is low (X%). Please charge before printing." |
| BLE disconnect during print | Connection lost | "Connection lost during printing. Move closer to the printer and try again." |

> **Important**: B-series printers (B1, B21, etc.) use **inverted** status values compared to D-series. See `printer.py` lines 590–592.

### Batch Printing

For multiple items, the mobile app queues print jobs and sends them sequentially:

```typescript
async function batchPrint(items: Item[], driver: PrinterDriver, config: LabelConfig): Promise<BatchResult> {
  const results: PrintResult[] = [];
  for (let i = 0; i < items.length; i++) {
    onProgress(i, items.length);
    try {
      const image = await renderLabel(items[i], config);
      await driver.printLabel(image, config);
      results.push({ item: items[i], success: true });
      // Inter-label delay (let printer advance label)
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      results.push({ item: items[i], success: false, error });
      // Ask user: Continue or abort?
    }
  }
  return { results, totalPrinted: results.filter(r => r.success).length };
}
```

**Effort estimate**: 4–5 days (workflow screens, preview, progress, error handling, batch)

---

## 5.7 — Server-Relay Printing (Alternative Path)

The backend exposes printer endpoints that drive a **server-attached** NIIMBOT printer. This path works on mobile with zero BLE code — the phone sends a REST request and the server handles all printer communication.

### Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/printer/config` | Get user's printer configuration |
| `PUT` | `/api/printer/config` | Update printer configuration |
| `POST` | `/api/printer/print-label` | Print a QR label (location or item) |
| `POST` | `/api/printer/print-test-label` | Print a test label |
| `POST` | `/api/printer/test-connection` | Verify server ↔ printer connection |
| `GET` | `/api/printer/status` | Get printer status (serial, firmware, battery) |
| `GET` | `/api/printer/models` | List supported NIIMBOT models |
| `GET` | `/api/printer/system/available` | Check if CUPS system printing is available |
| `POST` | `/api/printer/system/print` | Print via system printer (CUPS) |
| `GET` | `/api/printer/profiles/printer` | List printer profiles |
| `POST` | `/api/printer/profiles/printer` | Create printer profile |

### Server Print Request

From `printer.py` `PrintLabelRequest` (lines 75–86):

```typescript
// Mobile API call for server-relay printing
async function printViaServer(
  target: { type: 'location'; id: string; name: string } |
          { type: 'item'; id: string; name: string },
  labelLengthMm?: number
): Promise<void> {
  const body = target.type === 'location'
    ? { location_id: target.id, location_name: target.name, label_length_mm: labelLengthMm }
    : { item_id: target.id, item_name: target.name, label_length_mm: labelLengthMm };

  const response = await apiClient.post('/api/printer/print-label', body);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Print failed');
  }
}
```

### When to Use Server-Relay vs. Direct BLE

| Scenario | Recommended Path |
|---|---|
| Printer is USB-connected to server (Docker host) | Server-relay (`POST /printer/print-label`) |
| Printer is next to user's phone | Direct BLE (`BLEPrinterDriver`) |
| User is remote / on different network from printer | Server-relay (only option) |
| iOS user, printer only supports USB | Server-relay (iOS has no USB OTG) |
| No internet / server unavailable | Direct BLE (works offline) |

### Implementation Priority

Implement server-relay first — it's a simple REST call with the existing API client from Phase 1. This gives users a working print path immediately while BLE is being developed.

**Effort estimate**: 1–2 days (REST calls, error handling, UI integration)

---

## 5.8 — USB Serial (Optional / Future)

### Android USB OTG

Android supports USB On-The-Go (OTG) which allows connecting USB peripherals:

- **Library**: `react-native-usb-serial` or `react-native-usb-serialport`
- **Baud rate**: 115200 (matching `printer.py` `SerialTransport` line 180)
- **Flow control**: DSR/DTR + RTS/CTS, XON/XOFF disabled (matching backend)

### iOS Limitations

iOS does **not** support generic USB serial communication without Apple MFi certification. This means:

- **USB printing is not possible on iOS** (unless NIIMBOT joins the MFi program)
- iOS users must use **BLE** or **server-relay** printing

### Priority

USB OTG is **low priority** because:
1. All NIIMBOT models support BLE (the primary mobile path)
2. Server-relay covers USB-connected printers via the backend
3. USB OTG is Android-only, fragmenting the codebase

**Effort estimate**: 3–4 days if pursued (Android only)

---

## Architecture Decision: PrinterDriver Abstraction

Create an abstraction layer so the print workflow code doesn't need to know which transport is being used:

```typescript
// src/services/printer/PrinterDriver.ts

export interface PrinterDevice {
  id: string;
  name: string;
  model?: string;         // Parsed NIIMBOT model (e.g., "D11-H")
  rssi?: number;          // BLE signal strength (dBm)
  connectionType: 'ble' | 'server' | 'system';
}

export interface LabelConfig {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  lengthMm: number;
  density: number;        // 1–5
  printDirection: 'left' | 'top';
  dpi: number;
  model: string;
}

export interface PrinterStatus {
  connected: boolean;
  batteryLevel?: number;    // 0–100
  coverOpen?: boolean;
  hasLabels?: boolean;
  firmwareVersion?: string;
  serialNumber?: string;
}

export interface PrintProgress {
  currentRow: number;
  totalRows: number;
  percent: number;        // 0–100
}

export interface PrinterDriver {
  /** Scan for available printer devices. */
  scan(timeoutMs?: number): Promise<PrinterDevice[]>;

  /** Connect to a specific printer device. */
  connect(device: PrinterDevice): Promise<void>;

  /** Disconnect from the current printer. */
  disconnect(): Promise<void>;

  /** Check if currently connected. */
  isConnected(): boolean;

  /** Print a monochrome bitmap label. */
  printLabel(
    imageData: Uint8Array,
    config: LabelConfig,
    onProgress?: (progress: PrintProgress) => void
  ): Promise<void>;

  /** Get current printer status. */
  getStatus(): Promise<PrinterStatus>;
}
```

### Driver Implementations

```typescript
// src/services/printer/BLEPrinterDriver.ts
export class BLEPrinterDriver implements PrinterDriver {
  // Uses react-native-ble-plx
  // Implements NIIMBOT packet protocol directly
  // Handles MTU negotiation, write chunking, notifications
}

// src/services/printer/ServerPrinterDriver.ts
export class ServerPrinterDriver implements PrinterDriver {
  // Uses REST API calls to NesVentory backend
  // scan() → GET /api/printer/models (no BLE scan needed)
  // connect() → POST /api/printer/test-connection
  // printLabel() → POST /api/printer/print-label
  // getStatus() → GET /api/printer/status
}

// src/services/printer/SystemPrinterDriver.ts
export class SystemPrinterDriver implements PrinterDriver {
  // Uses CUPS system printer endpoints
  // scan() → GET /api/printer/system/available
  // printLabel() → POST /api/printer/system/print
}
```

### Driver Factory

```typescript
// src/services/printer/PrinterDriverFactory.ts
export function createPrinterDriver(type: ConnectionType): PrinterDriver {
  switch (type) {
    case 'bluetooth':
      return new BLEPrinterDriver();
    case 'server':
      return new ServerPrinterDriver(apiClient);
    case 'system':
      return new SystemPrinterDriver(apiClient);
    default:
      throw new Error(`Unsupported connection type: ${type}`);
  }
}
```

### React Context for Global Printer State

```typescript
// src/contexts/PrinterContext.tsx
interface PrinterContextValue {
  driver: PrinterDriver | null;
  device: PrinterDevice | null;
  status: PrinterStatus | null;
  connectionType: ConnectionType;
  setConnectionType: (type: ConnectionType) => void;
  connect: (device: PrinterDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  printLabel: (item: Item | Location, config: LabelConfig) => Promise<void>;
}

export const PrinterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Manages global printer connection state
  // Auto-reconnect logic
  // Connection status monitoring
};
```

---

## Platform Differences

| Feature | iOS | Android | Notes |
|---|---|---|---|
| **BLE** | ✅ CoreBluetooth | ✅ Android BLE | Both fully supported |
| **BLE Permissions** | Info.plist descriptions (automatic prompt) | Runtime permissions (Android 12+: `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT`) | Different flows |
| **USB Serial** | ❌ Not supported (no MFi) | ✅ USB OTG | Android only |
| **Background BLE** | ⚠️ Limited (~30s, then suspended) | ✅ Foreground service | iOS kills BLE in background |
| **Default MTU** | 185 bytes (auto-negotiated) | 23 bytes (must request higher) | Android needs `requestMTU()` |
| **Max MTU** | 512 bytes typical | 512 bytes typical | Device-dependent |
| **BLE Write Type** | Write without response preferred | Write without response preferred | Faster than write-with-response |
| **Simultaneous Connections** | Up to 7 (system limit) | Varies by device (typically 4–7) | One printer at a time is sufficient |

---

## Acceptance Criteria

- [ ] Scan and discover NIIMBOT printers via BLE on both iOS and Android
- [ ] Connect to a printer and read device info (serial, firmware version)
- [ ] Generate QR code label from item data (QR + text)
- [ ] Print label to NIIMBOT printer via direct BLE connection
- [ ] Print test label with timestamp for verification
- [ ] Save and load label profiles from backend
- [ ] Server-relay printing works via `POST /api/printer/print-label`
- [ ] Connection status indicator visible in app header/navigation
- [ ] Handle common errors gracefully (cover open, no labels, low battery, BLE disconnect)
- [ ] Print preview shows accurate label rendering before sending
- [ ] Batch printing of multiple items works with progress indicator
- [ ] Previously connected devices saved for quick reconnect
- [ ] Works on both iOS and Android with platform-appropriate permissions

---

## Dependencies

| Dependency | Required By | Status |
|---|---|---|
| **Phase 1** (Project Setup) | API client, navigation, auth | Must be complete |
| **Phase 2** (Core Screens) | Item/location detail screens (print entry points) | Should be complete |
| **Phases 3–4** | Not required | Can develop in parallel |

### NPM Packages

| Package | Purpose | Phase |
|---|---|---|
| `react-native-ble-plx` | BLE communication | 5.1 |
| `react-native-qrcode-svg` | QR code generation (SVG) | 5.3 |
| `react-native-view-shot` | Capture rendered label as bitmap | 5.3 |
| `react-native-svg` | SVG rendering (peer dep of qrcode-svg) | 5.3 |
| `@shopify/react-native-skia` | (Optional) Direct bitmap rendering | 5.3 |
| `buffer` | Base64 encoding for BLE writes | 5.2 |

---

## Risk Mitigations

### 1. BLE Reliability

**Risk**: BLE connections are inherently unreliable — interference, distance, power management.

**Mitigation**:
- Implement automatic reconnect with exponential backoff (3 retries, 1s → 2s → 4s)
- Monitor connection state via `react-native-ble-plx` device disconnect listener
- Add inter-row delays during printing (5–15ms per 10 rows) to prevent BLE buffer overflow
- Display signal strength (RSSI) to help users stay within range

### 2. Expo Compatibility

**Risk**: Managed Expo workflow does not support native BLE modules.

**Mitigation**:
- Plan for **Expo dev client** (custom development build) from the start
- Run `npx expo prebuild` early to generate native project files
- Test on physical devices — BLE does not work in simulators/emulators
- Document the requirement in project setup instructions

### 3. NIIMBOT Protocol Accuracy

**Risk**: The protocol is reverse-engineered; edge cases may exist for untested models.

**Mitigation**:
- Port directly from the **working** `niimbot.ts` and `backend/app/niimbot/printer.py` code
- Reference [niimbluelib](https://github.com/MultiMote/niimbluelib) for protocol details
- Test with D11-H first (most commonly used model in NesVentory, confirmed working)
- V5 protocol variant covers most modern models (D11-H, D101, D110, B21, etc.)
- Use server-relay as fallback if a model has BLE issues on mobile

### 4. Image Quality on Thermal Paper

**Risk**: Poorly rasterized QR codes may be unreadable by barcode scanners.

**Mitigation**:
- Use high error correction level (`ERROR_CORRECT_H`) for QR codes
- Simple threshold (< 128 = black) for QR/barcode/text content (no dithering needed)
- Reserve Floyd-Steinberg dithering for photographic or gradient content only
- Match the web's QR sizing logic: responsive QR size based on label dimensions
- Print test labels during development to verify scannability

### 5. Cross-Model Compatibility

**Risk**: Different NIIMBOT models use different protocol variants (legacy, V5, B1-specific).

**Mitigation**:
- The backend already handles three protocol paths (`printer.py` lines 374–509):
  - B1 classic protocol (lines 394–473)
  - V5 protocol for D11-H, D101, B21, etc. (lines 475–501)
  - Legacy protocol fallback (lines 502–509)
- Mirror this model-switching logic in the mobile `BLEPrinterDriver`
- Start with V5 (covers most models), add B1 variant, then legacy if needed

---

## Estimated Effort Breakdown

| Section | Task | Effort | Priority |
|---|---|---|---|
| **5.1** | BLE library setup, permissions, dev client | 2–3 days | P0 |
| **5.2** | NIIMBOT packet protocol port | 5–6 days | P0 |
| **5.2** | MTU negotiation & write chunking | 2–3 days | P0 |
| **5.2** | Notification handling & response parsing | 2–3 days | P0 |
| **5.3** | QR code generation (SVG + bitmap) | 2–3 days | P0 |
| **5.3** | Label layout engine & templates | 2–3 days | P0 |
| **5.3** | Image rasterization (monochrome + dithering) | 2–3 days | P0 |
| **5.4** | Printer discovery screen | 3–4 days | P0 |
| **5.5** | Print configuration screen | 3–4 days | P1 |
| **5.6** | Print workflow (preview, progress, errors) | 4–5 days | P0 |
| **5.6** | Batch printing | 1–2 days | P2 |
| **5.7** | Server-relay integration (REST API) | 1–2 days | P0 (do first) |
| **5.8** | USB OTG (Android only) | 3–4 days | P3 |
| | **Testing & debugging** (physical devices) | 3–5 days | P0 |
| | **Total** | **~4–6 weeks** | |

### Recommended Implementation Order

1. **Server-relay** (5.7) — gives a working print path in 1–2 days
2. **BLE setup + protocol** (5.1, 5.2) — core infrastructure
3. **QR + rasterization** (5.3) — generates printable images
4. **Discovery + print workflow** (5.4, 5.6) — complete BLE path
5. **Configuration + profiles** (5.5) — polish
6. **Batch printing** (5.6 batch) — enhancement
7. **USB OTG** (5.8) — optional, Android-only

---

## References

- **Web BLE driver**: `src/lib/niimbot.ts` (387 lines)
- **Web print component**: `src/components/QRLabelPrint.tsx` (1,229 lines)
- **Backend printer router**: `backend/app/routers/printer.py`
- **Backend printer profiles**: `backend/app/routers/printer_profiles.py`
- **Backend NIIMBOT client**: `backend/app/niimbot/printer.py` (protocol, transports)
- **Backend printer service**: `backend/app/printer_service.py` (model specs, image composition)
- **Packet format**: `backend/app/niimbot/packet.py`
- **niimbluelib** (upstream reference): https://github.com/MultiMote/niimbluelib
- **NIIMBOT model specs**: https://printers.niim.blue/
