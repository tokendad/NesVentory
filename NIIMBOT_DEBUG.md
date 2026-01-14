# Niimbot Printer Debugging Guide

## Changes Made

### 1. Fixed Image Encoding (`backend/app/niimbot/printer.py`)

**Issues Fixed:**
- Removed incorrect `ImageOps.invert()` that was inverting the image colors
- Changed from big-endian to little-endian byte order for row numbers
- Updated packet header to use zero count bytes (per protocol specification)
- Changed bit encoding: black pixels (0) → bit "1", white pixels (255) → bit "0"

**Key Change:**
```python
# OLD (incorrect):
img = ImageOps.invert(image.convert("L")).convert("1")
header = struct.pack(">H3BB", y, *counts, 1)  # Big-endian

# NEW (correct):
img = image.convert("L").convert("1")
header = struct.pack("<H3BB", y, 0, 0, 0, 1)  # Little-endian, zero counts
```

### 2. Added Debug Logging

- Added logging to `print_image()` method to track progress
- Added logging to `_send()` method to see all packets being sent
- Added timeout protection for `end_print()` loop

## Testing Steps

### Option 1: Test from Command Line

Run the test script directly:

```bash
cd /data/NesVentory
python3 test_niimbot_print.py <YOUR_BLUETOOTH_MAC_ADDRESS>

# Example:
python3 test_niimbot_print.py AA:BB:CC:DD:EE:FF
```

This will:
- Create a simple test image with text and shapes
- Connect to your printer via Bluetooth
- Send the print job with detailed debug logging
- Show all packets being sent/received

### Option 2: Test from Web App

1. **Restart the backend** to load the changes:
   ```bash
   docker compose restart backend
   # OR if not using Docker:
   cd backend
   pkill -f "uvicorn"
   uvicorn app.main:app --reload
   ```

2. **Check logs** while testing:
   ```bash
   docker compose logs -f backend
   # Look for lines containing:
   # - "Starting print"
   # - "send: 55:55:85:..."
   # - "Sent X image rows"
   ```

3. **Try printing a location label** from the web interface

## What to Look For

### If nothing prints:
- Check logs for "Starting print" message - confirms the function was called
- Check for "send: 55:55:85..." messages - confirms image packets are being sent
- Check for errors or exceptions in the logs
- Verify printer has paper loaded and is powered on

### If printing blank labels:
- May indicate the bit encoding is still inverted
- Check if printer feeds paper but prints nothing

### If printing inverted (black background, white content):
- Bit encoding needs to be flipped

## Protocol Reference

### 0x85 PrintBitmapRow Packet Structure

```
55 55 85 [LEN] [ROW_L] [ROW_H] 00 00 00 01 [PIXELS...] [CHK] AA AA
│  │  │   │     └─────┬──────┘ └───┬───┘ │  └────┬────┘  │    │  │
│  │  │   │           │             │     │       │       │    │  └─ Tail
│  │  │   │           │             │     │       │       │    └─ Tail
│  │  │   │           │             │     │       │       └─ Checksum (XOR)
│  │  │   │           │             │     │       └─ Pixel bitmap data
│  │  │   │           │             │     └─ Repeat count (1)
│  │  │   │           │             └─ Count bytes (usually zeros)
│  │  │   │           └─ Row number (little-endian)
│  │  │   └─ Data length
│  │  └─ Command (PrintBitmapRow)
│  └─ Header
└─ Header
```

### Key Points:
- Row number is **little-endian** (0x0005 = 05 00)
- Count bytes can be all zeros per protocol docs
- Bit value 1 = black pixel, 0 = white pixel
- Pixel data is packed 8 pixels per byte

## Sources

- [NIIMBOT Community Wiki - Protocol](https://printers.niim.blue/interfacing/proto/)
- [MultiMote/niimbluelib](https://github.com/MultiMote/niimbluelib)
- [AndBondStyle/niimprint](https://github.com/AndBondStyle/niimprint)

## Troubleshooting

### Connection Issues
- Verify Bluetooth MAC address is correct
- Check printer is in pairing mode
- Try connecting with official app first to verify printer works

### Docker Issues
- Make sure backend container has access to Bluetooth device
- May need `--network host` or bluetooth device passthrough

### Still Not Working?
- Try different density settings (1-5)
- Check your specific printer model's quirks
- Some models may need different command sequences
