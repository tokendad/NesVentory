# Niimbot B1 Printer Integration Guide

## Overview

This document outlines the research, libraries, and implementation details for printing to a Niimbot B1 thermal label printer via Bluetooth from a Node.js application. This was developed to integrate label printing into the Nesventory software.

---

## Research Summary

### Available Libraries

There are several open-source projects for communicating with Niimbot printers:

| Library | Language | Transport | Best For |
|---------|----------|-----------|----------|
| **@mmote/niimbluelib** | TypeScript | Web Bluetooth, Web Serial | Browser-based apps |
| **@mmote/niimblue-node** | TypeScript/Node.js | BLE (noble), Serial | **Server-side Node.js apps** |
| **niimbotjs** | TypeScript/Node.js | USB Serial only | Simple USB-only printing |

For a Node.js/Express backend like Nesventory, **`@mmote/niimblue-node`** is the best choice as it supports both Bluetooth LE and serial connections in a server environment.

### NPM Packages

```bash
npm install @mmote/niimblue-node   # Main library for Node.js
npm install qrcode                  # QR code generation
npm install sharp                   # Image processing (peer dependency)
```

### The Protocol

Niimbot printers use a simple binary packet protocol:

```
55 55 [CMD] [LEN] [DATA...] [CHECKSUM] aa aa
│  │    │     │      │          │       └──┘ Trailer
│  │    │     │      │          └─ XOR of CMD^LEN^DATA bytes
│  │    │     │      └─ Variable length data
│  │    │     └─ Data length (1-2 bytes depending on command)
│  │    └─ Command byte
└──┴─ Header
```

Key commands:
- `0x01` - PrintStart
- `0x03` - PageStart  
- `0x13` - SetPageSize
- `0x21` - SetDensity
- `0x85` - PrintBitmapRow
- `0x84` - PrintEmptyRow
- `0xE3` - PageEnd
- `0xF3` - PrintEnd

---

## Implementation

### Dependencies

```json
{
  "dependencies": {
    "@mmote/niimblue-node": "^0.0.12",
    "qrcode": "^1.5.4",
    "sharp": "^0.34.5"
  }
}
```

### System Requirements (Linux Server)

The server needs Bluetooth support and build tools for the `noble` native module:

```bash
# Ubuntu/Debian
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev build-essential

# Start Bluetooth service
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Grant Node.js Bluetooth permissions (to avoid running as root)
sudo setcap cap_net_raw+eip $(which node)
```

### Core API Usage

Here's how to use the niimblue-node library programmatically:

```javascript
import {
  NiimbotHeadlessBleClient,
  ImageEncoder,
  initClient,
  printImage
} from '@mmote/niimblue-node';
import sharp from 'sharp';

// Configuration for B1 printer
const CONFIG = {
  labelWidth: 384,      // pixels (50mm at 203dpi)
  labelHeight: 240,     // pixels (30mm at 203dpi)
  density: 3,           // 1-5, higher = darker
  quantity: 1,
  labelType: 1,         // 1 = with gaps
  threshold: 128,       // B/W threshold
  printDirection: 'top',
  printTask: 'B1',
};

async function printLabel(printerAddress, imageBuffer) {
  // Initialize BLE client
  const client = initClient('ble', printerAddress, false);

  // Connect to printer
  await client.connect();

  // Process image: flatten to white background, apply threshold
  let image = sharp(imageBuffer)
    .flatten({ background: '#fff' })
    .threshold(CONFIG.threshold)
    .resize(CONFIG.labelWidth, CONFIG.labelHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      position: 'centre',
      background: '#fff',
    });

  // Encode for printer
  const encoded = await ImageEncoder.encodeImage(image, CONFIG.printDirection);

  // Print
  await printImage(client, CONFIG.printTask, encoded, {
    quantity: CONFIG.quantity,
    labelType: CONFIG.labelType,
    density: CONFIG.density,
  });

  // Disconnect
  await client.disconnect();
}
```

### Scanning for Printers

```javascript
import { NiimbotHeadlessBleClient } from '@mmote/niimblue-node';

async function scanForPrinters(timeoutMs = 10000) {
  const devices = await NiimbotHeadlessBleClient.scan(timeoutMs);
  // Returns array of { address: string, name: string }
  // B1 printers show up as "B1-XXXXXXXXXX"
  return devices.filter(d => d.name?.startsWith('B1-'));
}
```

### Generating QR Code Labels

```javascript
import QRCode from 'qrcode';
import sharp from 'sharp';

async function createQRLabel(qrContent, labelText, width = 384, height = 240) {
  // Generate QR code as PNG buffer
  const qrSize = Math.min(width, height) - 40;
  const qrBuffer = await QRCode.toBuffer(qrContent, {
    type: 'png',
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'M'
  });

  // Create label with white background
  const label = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  });

  // Resize QR and composite onto label
  const resizedQR = await sharp(qrBuffer)
    .resize(qrSize, qrSize, { fit: 'contain', background: '#FFFFFF' })
    .toBuffer();

  const qrX = Math.floor((width - qrSize) / 2);
  const qrY = 10;

  // Add text below QR code using SVG
  const textY = qrY + qrSize + 10;
  const textHeight = height - textY - 5;
  const svgText = `
    <svg width="${width}" height="${textHeight}">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, sans-serif" font-size="14" fill="black">
        ${labelText}
      </text>
    </svg>
  `;

  return label
    .composite([
      { input: resizedQR, left: qrX, top: qrY },
      { input: Buffer.from(svgText), left: 0, top: textY }
    ])
    .png()
    .toBuffer();
}
```

---

## Integration into Nesventory

### Suggested Architecture

```
Nesventory/
├── server/
│   ├── services/
│   │   └── printer.service.js    # Niimbot printing service
│   ├── routes/
│   │   └── printer.routes.js     # API endpoints for printing
│   └── ...
```

### Example Printer Service

```javascript
// services/printer.service.js
import { NiimbotHeadlessBleClient, ImageEncoder, initClient, printImage } from '@mmote/niimblue-node';
import QRCode from 'qrcode';
import sharp from 'sharp';

class PrinterService {
  constructor() {
    this.printerAddress = null;
    this.config = {
      labelWidth: 384,
      labelHeight: 240,
      density: 3,
      labelType: 1,
      printDirection: 'top',
      printTask: 'B1',
    };
  }

  async scanPrinters(timeout = 10000) {
    const devices = await NiimbotHeadlessBleClient.scan(timeout);
    return devices.filter(d => d.name?.startsWith('B1-') || d.name?.startsWith('D110'));
  }

  setDefaultPrinter(address) {
    this.printerAddress = address;
  }

  async printQRLabel(qrContent, labelText) {
    if (!this.printerAddress) {
      throw new Error('No printer configured. Run scan and set printer first.');
    }

    // Generate label image
    const labelBuffer = await this.createQRLabel(qrContent, labelText);

    // Print it
    await this.printImage(labelBuffer);
  }

  async printItemLabel(item) {
    // Example: Generate QR label for an inventory item
    const qrContent = `INV:${item.id}:${item.sku}`;
    const labelText = `${item.name} - ${item.sku}`;
    await this.printQRLabel(qrContent, labelText);
  }

  async printLocationLabel(location) {
    // Example: Generate location/bin label
    const qrContent = `LOC:${location.id}`;
    const labelText = `${location.zone} - ${location.bin}`;
    await this.printQRLabel(qrContent, labelText);
  }

  async createQRLabel(qrContent, labelText) {
    const { labelWidth, labelHeight } = this.config;
    const qrSize = Math.min(labelWidth, labelHeight) - 40;

    const qrBuffer = await QRCode.toBuffer(qrContent, {
      type: 'png',
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M'
    });

    const resizedQR = await sharp(qrBuffer)
      .resize(qrSize, qrSize, { fit: 'contain', background: '#FFFFFF' })
      .toBuffer();

    const qrX = Math.floor((labelWidth - qrSize) / 2);
    const qrY = 10;
    const textY = qrY + qrSize + 10;
    const textHeight = labelHeight - textY - 5;

    const svgText = `
      <svg width="${labelWidth}" height="${textHeight}">
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              font-family="Arial, sans-serif" font-size="14" fill="black">
          ${this.escapeXml(labelText)}
        </text>
      </svg>
    `;

    return sharp({
      create: {
        width: labelWidth,
        height: labelHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      { input: resizedQR, left: qrX, top: qrY },
      { input: Buffer.from(svgText), left: 0, top: textY }
    ])
    .png()
    .toBuffer();
  }

  async printImage(imageBuffer) {
    const client = initClient('ble', this.printerAddress, false);

    try {
      await client.connect();

      let image = sharp(imageBuffer)
        .flatten({ background: '#fff' })
        .threshold(128)
        .resize(this.config.labelWidth, this.config.labelHeight, {
          kernel: sharp.kernel.nearest,
          fit: 'contain',
          position: 'centre',
          background: '#fff',
        });

      const encoded = await ImageEncoder.encodeImage(image, this.config.printDirection);

      await printImage(client, this.config.printTask, encoded, {
        quantity: 1,
        labelType: this.config.labelType,
        density: this.config.density,
      });
    } finally {
      await client.disconnect();
    }
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default new PrinterService();
```

### Example API Routes

```javascript
// routes/printer.routes.js
import express from 'express';
import printerService from '../services/printer.service.js';

const router = express.Router();

// Scan for available printers
router.get('/scan', async (req, res) => {
  try {
    const printers = await printerService.scanPrinters();
    res.json({ success: true, printers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set default printer
router.post('/set-printer', (req, res) => {
  const { address } = req.body;
  printerService.setDefaultPrinter(address);
  res.json({ success: true, message: `Printer set to ${address}` });
});

// Print a QR code label
router.post('/print-qr', async (req, res) => {
  try {
    const { content, label } = req.body;
    await printerService.printQRLabel(content, label);
    res.json({ success: true, message: 'Label printed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Print label for an inventory item
router.post('/print-item/:itemId', async (req, res) => {
  try {
    // Fetch item from your database
    const item = await Item.findById(req.params.itemId);
    await printerService.printItemLabel(item);
    res.json({ success: true, message: 'Item label printed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## Tested Configuration

### Hardware
- **Printer:** Niimbot B1
- **Serial:** H801031588
- **Firmware:** 5.22
- **Connection:** Bluetooth LE
- **Printer Address:** `01:08:03:82:81:4d`

### Server
- **OS:** Linux (Ubuntu)
- **Bluetooth Adapter:** USB dongle
- **Node.js:** v18+

### Label Settings
- **Size:** 50x30mm (384x240 pixels at 203dpi)
- **Density:** 3 (medium)
- **Print Direction:** top
- **Print Task:** B1

---

## Common Label Sizes

| Physical Size | Pixels (203 DPI) | Use Case |
|---------------|------------------|----------|
| 50x30mm | 384 x 240 | Standard QR labels |
| 40x30mm | 315 x 240 | Smaller QR labels |
| 30x20mm | 240 x 160 | Compact labels |
| 40x60mm | 315 x 472 | Larger labels with more text |

---

## Troubleshooting

### "Timeout waiting for Noble to be powered on"
- Run with `sudo`, or
- Grant capabilities: `sudo setcap cap_net_raw+eip $(which node)`

### Printer not found in scan
- Ensure printer is ON and not connected to phone app
- Check Bluetooth: `hciconfig` (should show `UP RUNNING`)
- Bring up adapter: `sudo hciconfig hci0 up`

### Print quality issues
- Increase `density` (1-5)
- Lower `threshold` value (more black pixels)
- Ensure image contrast is high

---

## Files Created

1. **print-test.mjs** - Standalone test script with scanning and printing
2. **setup.sh** - Linux setup script for Bluetooth dependencies
3. **README.md** - Usage documentation

All tested and working with the B1 printer at address `01:08:03:82:81:4d`.

---

## Resources

- [NiimBlue Project](https://github.com/MultiMote/niimblue) - Web UI
- [NiimBlueLib](https://github.com/MultiMote/niimbluelib) - Core protocol library
- [Niimblue-node](https://github.com/MultiMote/niimblue-node) - Node.js implementation
- [Protocol Documentation](https://printers.niim.blue/interfacing/proto/) - Packet format details
