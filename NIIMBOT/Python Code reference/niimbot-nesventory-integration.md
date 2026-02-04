# Niimbot B1 Printer Integration Guide for NesVentory

## Overview

This document outlines the research, libraries, and implementation details for printing to a Niimbot B1 thermal label printer via Bluetooth from the NesVentory backend server. NesVentory uses **FastAPI (Python 3.11)** for its backend, so this guide focuses on Python-based solutions.

---

## Research Summary

### Available Libraries

There are several open-source projects for communicating with Niimbot printers:

| Library | Language | Transport | Best For |
|---------|----------|-----------|----------|
| **niimprint** (Python) | Python | BLE, Serial, USB | **FastAPI backend** |
| **NiimPrintX** (Python) | Python | BLE | Python apps |
| **@mmote/niimblue-node** | Node.js | BLE, Serial | Node.js apps |
| **niimbotjs** | Node.js | USB only | Simple USB printing |

For NesVentory's FastAPI backend, **Python-based libraries** are the best choice.

### Python Libraries

The main Python library is based on the original reverse engineering work:

- **[kjy00302/niimprint](https://github.com/kjy00302/niimprint)** - Original Python implementation
- **[AndBondStyle/niimprint](https://github.com/AndBondStyle/niimprint)** - Fork with improvements

```bash
# Install dependencies
pip install bleak pillow qrcode
```

### The Protocol

Niimbot printers use a simple binary packet protocol:

```
55 55 [CMD] [LEN] [DATA...] [CHECKSUM] aa aa
│  │    │     │      │          │       └──┘ Trailer
│  │    │     │      │          └─ XOR of CMD^LEN^DATA bytes
│  │    │     │      └─ Variable length data
│  │    │     └─ Data length
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

## Tested Configuration

### Hardware
- **Printer:** Niimbot B1
- **Serial:** H801031588
- **Firmware:** 5.22
- **Connection:** Bluetooth LE
- **Printer Address:** `01:08:03:82:81:4d`

### Server
- **OS:** Linux (Ubuntu)
- **Bluetooth Adapter:** USB dongle (BD Address: 00:1A:7D:DA:71:0B)
- **Python:** 3.11+

### Label Settings
- **Size:** 50x30mm (384x240 pixels at 203dpi)
- **Density:** 3 (medium)
- **Print Direction:** top
- **Print Task:** B1

---

## Implementation for NesVentory

### Option 1: Python Native (Recommended for FastAPI)

#### Dependencies

Add to `backend/requirements.txt`:

```
bleak>=0.21.0          # Bluetooth LE library
pillow>=10.0.0         # Image processing
qrcode>=7.4.0          # QR code generation
```

#### Printer Service Module

Create `backend/app/services/printer_service.py`:

```python
"""
Niimbot B1 Bluetooth Printer Service for NesVentory

Based on the niimprint protocol implementation.
"""

import asyncio
import struct
from enum import IntEnum
from typing import Optional
from PIL import Image
import qrcode
from bleak import BleakClient, BleakScanner

# Niimbot BLE UUIDs
NIIMBOT_SERVICE_UUID = "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
NIIMBOT_CHAR_TX_UUID = "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f"  # Write
NIIMBOT_CHAR_RX_UUID = "00002af1-0000-1000-8000-00805f9b34fb"  # Notify


class RequestCode(IntEnum):
    CONNECT = 0xC1
    GET_INFO = 0x40
    SET_DENSITY = 0x21
    SET_LABEL_TYPE = 0x23
    PRINT_START = 0x01
    PAGE_START = 0x03
    SET_PAGE_SIZE = 0x13
    PRINT_BITMAP_ROW = 0x85
    PRINT_EMPTY_ROW = 0x84
    PAGE_END = 0xE3
    PRINT_END = 0xF3
    PRINT_STATUS = 0xA3
    HEARTBEAT = 0xDC


class NiimbotPacket:
    """Build and parse Niimbot protocol packets."""
    
    HEADER = bytes([0x55, 0x55])
    TRAILER = bytes([0xAA, 0xAA])
    
    @staticmethod
    def build(command: int, data: bytes = b'') -> bytes:
        """Build a packet with header, command, length, data, checksum, trailer."""
        length = len(data)
        
        if length <= 0xFF:
            length_bytes = bytes([length])
        else:
            length_bytes = struct.pack('>H', length)
        
        # Checksum: XOR of command, length bytes, and data
        checksum = command
        for b in length_bytes:
            checksum ^= b
        for b in data:
            checksum ^= b
        
        return (
            NiimbotPacket.HEADER +
            bytes([command]) +
            length_bytes +
            data +
            bytes([checksum]) +
            NiimbotPacket.TRAILER
        )
    
    @staticmethod
    def parse(data: bytes) -> tuple[int, bytes]:
        """Parse a packet, return (command, data)."""
        if len(data) < 6:
            raise ValueError("Packet too short")
        if data[:2] != NiimbotPacket.HEADER or data[-2:] != NiimbotPacket.TRAILER:
            raise ValueError("Invalid packet header/trailer")
        
        command = data[2]
        length = data[3]
        payload = data[4:4+length]
        
        return command, payload


class NiimbotPrinter:
    """Niimbot B1 Bluetooth printer client."""
    
    def __init__(self, address: str):
        self.address = address
        self.client: Optional[BleakClient] = None
        self.response_queue: asyncio.Queue = asyncio.Queue()
        self._connected = False
        
        # B1 printer settings
        self.print_width = 384  # pixels (50mm at 203dpi)
        self.print_height = 240  # pixels (30mm at 203dpi)
        self.density = 3  # 1-5
        self.label_type = 1  # 1 = with gaps
    
    async def _notification_handler(self, sender, data: bytearray):
        """Handle incoming BLE notifications."""
        await self.response_queue.put(bytes(data))
    
    async def connect(self) -> bool:
        """Connect to the printer via BLE."""
        self.client = BleakClient(self.address)
        await self.client.connect()
        
        # Subscribe to notifications
        await self.client.start_notify(NIIMBOT_CHAR_RX_UUID, self._notification_handler)
        
        # Send connect command
        packet = NiimbotPacket.build(RequestCode.CONNECT, bytes([0x01]))
        await self.client.write_gatt_char(NIIMBOT_CHAR_TX_UUID, packet)
        
        # Wait for response
        response = await asyncio.wait_for(self.response_queue.get(), timeout=5.0)
        self._connected = True
        
        return True
    
    async def disconnect(self):
        """Disconnect from the printer."""
        if self.client and self.client.is_connected:
            await self.client.disconnect()
        self._connected = False
    
    async def _send_and_wait(self, command: int, data: bytes = b'', timeout: float = 5.0) -> bytes:
        """Send a command and wait for response."""
        packet = NiimbotPacket.build(command, data)
        await self.client.write_gatt_char(NIIMBOT_CHAR_TX_UUID, packet)
        response = await asyncio.wait_for(self.response_queue.get(), timeout=timeout)
        return response
    
    async def set_density(self, density: int = 3):
        """Set print density (1-5)."""
        self.density = max(1, min(5, density))
        await self._send_and_wait(RequestCode.SET_DENSITY, bytes([self.density]))
    
    async def set_label_type(self, label_type: int = 1):
        """Set label type (1=with gaps, 2=continuous)."""
        self.label_type = label_type
        await self._send_and_wait(RequestCode.SET_LABEL_TYPE, bytes([self.label_type]))
    
    async def print_image(self, image: Image.Image, quantity: int = 1):
        """Print a PIL Image to the label printer."""
        # Resize to label dimensions
        image = image.resize((self.print_width, self.print_height), Image.Resampling.LANCZOS)
        
        # Convert to 1-bit black and white
        image = image.convert('L')  # Grayscale
        image = image.point(lambda x: 0 if x < 128 else 255, '1')  # Threshold
        
        # Set density and label type
        await self.set_density(self.density)
        await self.set_label_type(self.label_type)
        
        # Start print job
        print_start_data = struct.pack('>BHBHB', 0x00, quantity, 0x00, 0x00, 0x00)
        await self._send_and_wait(RequestCode.PRINT_START, print_start_data)
        
        # Start page
        await self._send_and_wait(RequestCode.PAGE_START, bytes([0x01]))
        
        # Set page size
        page_size_data = struct.pack('>HHH', self.print_height, self.print_width, quantity)
        await self._send_and_wait(RequestCode.SET_PAGE_SIZE, page_size_data)
        
        # Send image data row by row
        pixels = list(image.getdata())
        bytes_per_row = self.print_width // 8
        
        for row in range(self.print_height):
            row_data = []
            for byte_idx in range(bytes_per_row):
                byte_val = 0
                for bit in range(8):
                    pixel_idx = row * self.print_width + byte_idx * 8 + bit
                    if pixels[pixel_idx] == 0:  # Black pixel
                        byte_val |= (1 << (7 - bit))
                row_data.append(byte_val)
            
            # Check if row is empty (all white)
            if all(b == 0 for b in row_data):
                # Send empty row command
                packet = NiimbotPacket.build(
                    RequestCode.PRINT_EMPTY_ROW,
                    struct.pack('>HB', row, 1)
                )
            else:
                # Send bitmap row
                row_bytes = bytes(row_data)
                packet = NiimbotPacket.build(
                    RequestCode.PRINT_BITMAP_ROW,
                    struct.pack('>H', row) + row_bytes
                )
            
            await self.client.write_gatt_char(NIIMBOT_CHAR_TX_UUID, packet)
            
            # Small delay to prevent overwhelming the printer
            if row % 10 == 0:
                await asyncio.sleep(0.01)
        
        # End page
        await self._send_and_wait(RequestCode.PAGE_END, bytes([0x01]))
        
        # Wait for printing to complete
        await self._wait_for_print_complete()
        
        # End print job
        await self._send_and_wait(RequestCode.PRINT_END, bytes([0x01]))
    
    async def _wait_for_print_complete(self, timeout: float = 30.0):
        """Poll printer status until printing is complete."""
        start_time = asyncio.get_event_loop().time()
        
        while True:
            response = await self._send_and_wait(RequestCode.PRINT_STATUS, bytes([0x01]))
            _, payload = NiimbotPacket.parse(response)
            
            if len(payload) >= 10:
                page = payload[1]
                print_progress = payload[2]
                feed_progress = payload[3]
                
                if print_progress == 100 and feed_progress == 100:
                    break
            
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError("Print timeout")
            
            await asyncio.sleep(0.5)


class PrinterService:
    """High-level printer service for NesVentory."""
    
    def __init__(self):
        self.printer_address: Optional[str] = None
        self.label_width = 384
        self.label_height = 240
    
    async def scan_printers(self, timeout: float = 10.0) -> list[dict]:
        """Scan for Niimbot printers via BLE."""
        devices = await BleakScanner.discover(timeout=timeout)
        
        niimbot_devices = []
        for device in devices:
            name = device.name or ""
            if name.startswith(("B1-", "D110", "D11-")):
                niimbot_devices.append({
                    "address": device.address,
                    "name": name,
                    "rssi": device.rssi
                })
        
        return niimbot_devices
    
    def set_printer(self, address: str):
        """Set the default printer address."""
        self.printer_address = address
    
    async def create_qr_label(
        self,
        qr_content: str,
        label_text: str = "",
        width: int = None,
        height: int = None
    ) -> Image.Image:
        """Create a label image with QR code and optional text."""
        width = width or self.label_width
        height = height or self.label_height
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,
            border=1,
        )
        qr.add_data(qr_content)
        qr.make(fit=True)
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Create label canvas
        label = Image.new('L', (width, height), 255)  # White background
        
        # Calculate QR position (centered horizontally, near top)
        qr_size = min(width, height) - 40
        qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        
        qr_x = (width - qr_size) // 2
        qr_y = 10
        
        # Paste QR code
        label.paste(qr_image, (qr_x, qr_y))
        
        # Add text below QR if provided
        if label_text:
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(label)
            
            # Try to use a system font, fall back to default
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
            except:
                font = ImageFont.load_default()
            
            text_bbox = draw.textbbox((0, 0), label_text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_x = (width - text_width) // 2
            text_y = qr_y + qr_size + 5
            
            draw.text((text_x, text_y), label_text, fill=0, font=font)
        
        return label
    
    async def print_qr_label(
        self,
        qr_content: str,
        label_text: str = "",
        quantity: int = 1
    ):
        """Generate and print a QR code label."""
        if not self.printer_address:
            raise ValueError("No printer configured. Call set_printer() first.")
        
        # Create label image
        label_image = await self.create_qr_label(qr_content, label_text)
        
        # Connect and print
        printer = NiimbotPrinter(self.printer_address)
        
        try:
            await printer.connect()
            await printer.print_image(label_image, quantity)
        finally:
            await printer.disconnect()
    
    async def print_item_label(self, item: dict):
        """Print a label for an inventory item."""
        qr_content = f"INV:{item.get('id')}:{item.get('sku', '')}"
        label_text = f"{item.get('name', 'Item')} - {item.get('sku', '')}"
        await self.print_qr_label(qr_content, label_text)
    
    async def print_location_label(self, location: dict):
        """Print a label for a location/bin."""
        qr_content = f"LOC:{location.get('id')}"
        label_text = f"{location.get('name', 'Location')}"
        await self.print_qr_label(qr_content, label_text)


# Singleton instance
printer_service = PrinterService()
```

#### FastAPI Router

Create `backend/app/routers/printer.py`:

```python
"""
Printer API endpoints for NesVentory.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..services.printer_service import printer_service
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/printer", tags=["Printer"])


class PrinterAddress(BaseModel):
    address: str


class QRLabelRequest(BaseModel):
    content: str
    label_text: Optional[str] = ""
    quantity: Optional[int] = 1


@router.get("/scan")
async def scan_printers(timeout: float = 10.0, user=Depends(get_current_user)):
    """Scan for available Niimbot printers via Bluetooth."""
    try:
        printers = await printer_service.scan_printers(timeout)
        return {"success": True, "printers": printers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-printer")
async def set_printer(request: PrinterAddress, user=Depends(get_current_user)):
    """Set the default printer address."""
    printer_service.set_printer(request.address)
    return {"success": True, "message": f"Printer set to {request.address}"}


@router.get("/status")
async def get_printer_status(user=Depends(get_current_user)):
    """Get current printer configuration."""
    return {
        "configured": printer_service.printer_address is not None,
        "address": printer_service.printer_address,
        "label_width": printer_service.label_width,
        "label_height": printer_service.label_height,
    }


@router.post("/print-qr")
async def print_qr_label(request: QRLabelRequest, user=Depends(get_current_user)):
    """Print a QR code label with optional text."""
    try:
        await printer_service.print_qr_label(
            request.content,
            request.label_text,
            request.quantity
        )
        return {"success": True, "message": "Label printed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/print-item/{item_id}")
async def print_item_label(item_id: int, user=Depends(get_current_user)):
    """Print a label for an inventory item."""
    # TODO: Fetch item from database
    # item = await get_item(item_id)
    item = {"id": item_id, "name": "Test Item", "sku": "SKU-001"}
    
    try:
        await printer_service.print_item_label(item)
        return {"success": True, "message": "Item label printed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/print-location/{location_id}")
async def print_location_label(location_id: int, user=Depends(get_current_user)):
    """Print a label for a location."""
    # TODO: Fetch location from database
    # location = await get_location(location_id)
    location = {"id": location_id, "name": "Storage Bin A1"}
    
    try:
        await printer_service.print_location_label(location)
        return {"success": True, "message": "Location label printed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### Register Router in main.py

Add to `backend/app/main.py`:

```python
from .routers import printer

# Add with other router includes
app.include_router(printer.router)
```

---

### Option 2: Use niimblue-node as a Sidecar Service

If you prefer to keep the printer logic in Node.js (which has better-tested libraries), you can run `niimblue-node` as a sidecar service:

```bash
# Install globally
npm install -g @mmote/niimblue-node

# Run as REST server
niimblue-cli server -d -h 0.0.0.0 -p 5001 --cors
```

Then call it from FastAPI:

```python
import httpx

async def print_via_sidecar(image_base64: str, printer_address: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:5001/print",
            json={
                "image": image_base64,
                "address": printer_address,
                "transport": "ble",
                "printTask": "B1",
            }
        )
        return response.json()
```

---

### Option 3: CLI Subprocess (Simplest)

Use the tested Node.js script as a subprocess:

```python
import subprocess
import base64
import tempfile

async def print_label_cli(image_bytes: bytes, printer_address: str):
    """Print using the niimblue CLI tool."""
    
    # Save image to temp file
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        f.write(image_bytes)
        temp_path = f.name
    
    try:
        result = subprocess.run([
            'node', '/path/to/print-test.mjs', 'print',
            printer_address,
            '--image', temp_path,
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            raise Exception(f"Print failed: {result.stderr}")
        
        return True
    finally:
        os.unlink(temp_path)
```

---

## System Requirements

### Linux Server Setup

```bash
# Install Bluetooth dependencies
sudo apt-get update
sudo apt-get install -y bluetooth bluez libbluetooth-dev

# Start Bluetooth service
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Grant Python Bluetooth permissions (to avoid running as root)
sudo setcap cap_net_raw+eip $(which python3)

# Or add user to bluetooth group
sudo usermod -a -G bluetooth $USER
```

### Docker Considerations

If NesVentory runs in Docker, you'll need to:

1. Pass through the Bluetooth adapter:
```yaml
# docker-compose.yml
services:
  nesventory:
    # ...
    volumes:
      - /var/run/dbus:/var/run/dbus
    devices:
      - /dev/bus/usb  # For USB Bluetooth adapter
    privileged: true  # Required for BLE access
    network_mode: host  # Required for BLE
```

2. Or run the printer service on the host and call it via API.

---

## Common Label Sizes

| Physical Size | Pixels (203 DPI) | Use Case |
|---------------|------------------|----------|
| 50x30mm | 384 x 240 | Standard QR labels |
| 40x30mm | 315 x 240 | Smaller QR labels |
| 30x20mm | 240 x 160 | Compact labels |
| 40x60mm | 315 x 472 | Larger labels |

---

## Troubleshooting

### "Timeout waiting for BLE connection"
- Run with elevated permissions: `sudo python ...`
- Or set capabilities: `sudo setcap cap_net_raw+eip $(which python3)`

### Printer not found in scan
- Ensure printer is ON and not connected to phone app
- Check Bluetooth: `hciconfig` (should show `UP RUNNING`)
- Bring up adapter: `sudo hciconfig hci0 up`

### Print quality issues
- Increase `density` (1-5)
- Adjust image threshold
- Ensure image contrast is high

---

## Files to Create

For NesVentory integration:

1. `backend/app/services/printer_service.py` - Printer service module
2. `backend/app/routers/printer.py` - API endpoints
3. Update `backend/requirements.txt` - Add `bleak`, `pillow`, `qrcode`
4. Update `backend/app/main.py` - Include printer router

---

## API Endpoints

Once integrated, NesVentory will have these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/printer/scan` | GET | Scan for Niimbot printers |
| `/api/printer/set-printer` | POST | Set default printer address |
| `/api/printer/status` | GET | Get printer configuration |
| `/api/printer/print-qr` | POST | Print QR code label |
| `/api/printer/print-item/{id}` | POST | Print item label |
| `/api/printer/print-location/{id}` | POST | Print location label |

---

## Tested Working Configuration

- **Printer:** Niimbot B1 at address `01:08:03:82:81:4d`
- **Server:** Ubuntu Linux with USB Bluetooth dongle
- **Protocol:** Successfully tested with Node.js implementation, Python implementation follows same protocol

---

## Resources

- [NiimBlue Project](https://github.com/MultiMote/niimblue) - Web UI
- [NiimBlueLib](https://github.com/MultiMote/niimbluelib) - Core protocol library
- [Niimblue-node](https://github.com/MultiMote/niimblue-node) - Node.js CLI
- [niimprint (Python)](https://github.com/kjy00302/niimprint) - Original Python implementation
- [Protocol Documentation](https://printers.niim.blue/interfacing/proto/) - Packet format details
- [Bleak](https://bleak.readthedocs.io/) - Python BLE library
