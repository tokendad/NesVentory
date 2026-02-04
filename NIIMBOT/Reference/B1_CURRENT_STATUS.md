# B1 Printer Status - Session End Report
**Date:** 2026-02-02
**Status:** Motor runs, full label prints, but output shows only a black bar along edge

---

## Summary of Work Completed

### ✅ Protocol Fix - SUCCESSFUL
- **Issue:** B1 uses different protocol variant than standard V5
- **Root Cause:** Different payload sizes (7-byte vs 9-byte, 6-byte vs 13-byte)
- **Evidence:** niim.blue console logs showed exact working protocol
- **Fix Applied:** Updated `/data/NesVentory/backend/app/niimbot/printer.py` print_image() method
  - B1 now uses: 7-byte Start Print + 6-byte Set Page Size
  - V5 models still use: 9-byte Start Print + 13-byte Set Dimension
  - Also calls `set_label_type(1)` for B1
- **Result:** ✅ Motor now runs continuously, full label prints (not just 1 second)

### ✅ RFCOMM Transport - SUCCESSFUL
- **Issue:** B1 is Classic Bluetooth, not BLE
- **Fix:** Implemented RfcommTransport class using Python sockets with BTPROTO_RFCOMM
- **Connection:** Works reliably at address 03:01:08:82:81:4D
- **Result:** ✅ Device connects and responds to all commands

### ✅ Image Layout Direction - IMPLEMENTED
- **Issue:** B1 uses "top" direction (horizontal feed), code was for "left" (vertical feed)
- **Fix:** Updated create_qr_label_image() to detect direction and layout appropriately
  - Horizontal feed (B-series): QR at top, text below
  - Vertical feed (D-series): QR on left, text on right
- **Result:** ⚠️ Applied but output still incorrect (see current issue)

### ⚠️ Pixel Polarity - PARTIALLY FIXED
- **Issue:** Image was inverted (bright pixels = ink, dark pixels = no ink)
- **Fix Applied:** Changed pixel encoding from `"1" if pix > 128` to `"1" if pix < 128`
  - Fixed in: B1 protocol section, V5 protocol section, _encode_image_v5()
  - Now: Dark pixels (< 128) = 1 (ink), Bright pixels (>= 128) = 0 (no ink)
- **Result:** ⚠️ Image no longer completely garbled, but output is incorrect

---

## Current Issue

**Symptom:** Full label prints, but contains only a black bar along the edge (not text/QR)

**Possible Root Causes (in order of likelihood):**

### 1. Image Dimensions Are Wrong or Swapped
- **B1 Specs:** 384 pixels wide × 240 pixels tall
- **Current:** Sending correct 384×240 to printer
- **Possible Issue:** Image might need to be 240×384 (rotated 90°) or different aspect ratio
- **Evidence:** Black bar suggests partial image rendering

### 2. Image Needs Rotation
- **Current:** Image is created 384×240 (landscape)
- **Possible Issue:** B1 "top" direction might require rotation
- **Test:** Try rotating entire image 90° before sending

### 3. Image Width/Height Parameters Sent to Printer Wrong
- **Current B1 Code:**
  ```python
  w, h = image.width, image.height
  sd_payload = struct.pack(">HHH", w, h, 1)
  ```
- **Possible Issue:** Should be height first, then width?
- **Reference:** niim.blue sent `00 f0 01 90` (240, 400) but those dimensions might be different than what we're calculating

### 4. Padding/Offset Issues
- **Possible Issue:** Image might need padding around edges
- **Current:** QR code centered at top with text below
- **Possible:** Need margin/padding adjustments

### 5. Bit Order or Byte Order Problem
- **Current:** Using big-endian byte order, MSB first for bits
- **Possible Issue:** Might need LSB first or different byte ordering

---

## Files Modified in This Session

### 1. `/data/NesVentory/backend/app/niimbot/printer.py`
- **Lines 565-616:** B1 vs V5 protocol detection and payload sending
- **Lines 597-612:** B1 protocol image encoding with correct pixel polarity
- **Lines 614-647:** V5 protocol image encoding with correct pixel polarity
- **Lines 660-667:** _encode_image_v5() helper with correct pixel polarity
- **Key Changes:**
  - `is_b1 = model and model.lower() == "b1"` (separate from V5)
  - B1 payload: `b'\x00\x01\x00\x00\x00\x00\x00'` (7 bytes)
  - B1 dimension: `struct.pack(">HHH", w, h, 1)` (6 bytes)
  - Pixel encoding: `"1" if pix < 128 else "0"` (dark = ink)

### 2. `/data/NesVentory/backend/app/printer_service.py`
- **Lines 225-312:** create_qr_label_image() function completely rewritten
- **Key Changes:**
  - Detects `is_horizontal_feed = print_direction != "left"`
  - For horizontal feed (B-series): QR at top, text below
  - For vertical feed (D-series): QR on left, text on right
  - Full width text area below QR for B-series

### 3. `/data/NesVentory/backend/app/niimbot/__init__.py`
- Added `BluetoothDeviceInfo`, `detect_bluetooth_device_type` to exports

### 4. `/data/NesVentory/backend/app/printer_service.py`
- resolve_connection_type() and validate_printer_config() updated for bluetooth_type field

---

## Key Test Results

### Debug Script Output (python3 /data/NesVentory/testing/debug_b1_printer.py)
```
✅ Device detected: B1-H801031588, type=classic
✅ Is RFCOMM printer: True
✅ RfcommTransport: Connected successfully
✅ Connection handshake successful (0xC0)
✅ Device info: type=4096, serial=H801031588
✅ Print sequence completed successfully
⚠️ But: No physical output (test script uses V5 protocol)
```

### GUI Print Output
```
✅ Motor runs continuously (full duration)
✅ Full label prints (not just 1-second burst)
⚠️ Output: Black bar along edge only (not text or QR)
```

### niim.blue Success Pattern (from user-provided logs)
```
✅ SetDensity (0x21)
✅ SetLabelType (0x23) ← B1 requires this
✅ PrintStart (0x01) with 7-byte payload
✅ PageStart (0x03)
✅ SetPageSize (0x13) with 6-byte payload
✅ Image rows (0x85) with proper encoding
✅ PageEnd (0xE3)
✅ PrintStatus queries (0xA3)
✅ PrintEnd (0xF3)
Result: Two labels printed successfully with QR codes
```

---

## Next Steps When Returning

### Immediate Tests (Quick Diagnostics)

1. **Check if image is rotated:**
   ```python
   # In create_qr_label_image(), after creating label:
   # Try: label = label.rotate(90)
   # Or try swapping dimensions: (240, 384) instead of (384, 240)
   ```

2. **Check if dimensions are sent in wrong order:**
   ```python
   # Current B1 code:
   sd_payload = struct.pack(">HHH", w, h, 1)  # width, height, qty

   # Try swapping:
   sd_payload = struct.pack(">HHH", h, w, 1)  # height, width, qty
   ```

3. **Compare with niim.blue reference:**
   - niim.blue sent width=240, height=400 for their QR label
   - Our B1 specs say 384×240
   - The 240×400 in niim.blue might be the actual label size they were printing
   - Check what size image we're actually creating

4. **Run with smaller/simpler test image:**
   - Create a small test image (e.g., 100×100 pixels)
   - See if the black bar scales accordingly
   - This helps diagnose if it's a dimension issue

### Medium-Term Investigation

1. **Add logging to image creation:**
   ```python
   logger.info(f"Creating image: {label_width}x{label_height}, direction={print_direction}")
   logger.info(f"Sending SetPageSize: width={w}, height={h}")
   logger.info(f"Image pixel data (first row): {line_data.hex()[:40]}...")
   ```

2. **Capture actual image being printed:**
   - Save the PIL image to a PNG file before sending
   - This shows exactly what's being encoded
   - Can compare with expected QR code image

3. **Test with reversed MAC address:**
   - Try `01:08:03:82:81:4D` (reversed from current `03:01:08:82:81:4D`)
   - User noted niim.blue used this variant
   - Might connect to different device service

### Hypothesis to Test

**Most Likely:** Image dimensions or orientation is wrong
- **Evidence:** Black bar suggests partial/edge rendering
- **Fix:** Try rotating image 90° or swapping width/height
- **Testing:** Create 100×100 red square test image, see where it prints

---

## Reference Information

### B1 Printer Specifications
```
Model: B1
DPI: 203
Printhead Width: 384 pixels
Label Height: 240 pixels
Density Range: 1-5 (default 3, max 5)
Paper Types: WithGaps, Black, Transparent
Protocol Version: 3 (V5 variant)
Bluetooth: Classic RFCOMM, Serial Port Profile (UUID 00001101)
MAC Address: 03:01:08:82:81:4D (or 01:08:03:82:81:4D reversed)
```

### B1 Protocol Variant Details
```
Start Print (0x01): 7 bytes
  Payload: 00 01 00 00 00 00 00

Set Page Size (0x13): 6 bytes
  Format: width(2) + height(2) + quantity(2)
  Big-endian, unsigned shorts

Image Row (0x85): variable
  Header: row(2) + reserved(1) + pixels_low(1) + pixels_high(1) + flag(1)
  Data: bitmap data (1 bit per pixel)
  Pixel convention: 1=black/ink, 0=white/no-ink
```

### Working niim.blue SetPageSize Example
```
Command: 0x13
Payload: 00 f0 01 90 00 01
  Width: 0x00f0 = 240 pixels
  Height: 0x0190 = 400 pixels
  Quantity: 0x0001 = 1 label
```

---

## Code Snippets for Reference

### Current B1 Protocol Implementation
```python
if is_b1:
    logging.info("Using B1 Classic Bluetooth protocol variant")

    # Start Print: 7-byte payload
    sp_payload = b'\x00\x01\x00\x00\x00\x00\x00'
    self._send(NiimbotPacket(0x01, sp_payload))
    time.sleep(0.2)

    # Set Page Size: 6-byte payload (width, height, qty)
    w, h = image.width, image.height
    sd_payload = struct.pack(">HHH", w, h, 1)
    self._send(NiimbotPacket(0x13, sd_payload))
    time.sleep(0.2)

    # Image rows with correct pixel polarity
    img_l = image.convert("L")
    for y in range(img_l.height):
        line_pixels = [img_l.getpixel((x, y)) for x in range(img_l.width)]
        line_bits_str = "".join("1" if pix < 128 else "0" for pix in line_pixels)
        # ... rest of encoding
```

### Current Image Layout for B1
```python
if is_horizontal_feed:  # B-series "top" direction
    # QR at top (centered)
    qr_x = max(5, (label_width - qr_size) // 2)
    qr_y = 5

    # Text below QR (full width)
    text_y = qr_y + qr_size + 5
    # Text is NOT rotated for horizontal feed
```

---

## Testing Scripts Available

1. **Debug Script:** `/data/NesVentory/testing/debug_b1_printer.py`
   - Shows every packet sent/received
   - Tests handshake and basic print sequence
   - Use: `python3 /data/NesVentory/testing/debug_b1_printer.py --address 03:01:08:82:81:4D`

2. **Address Tester:** `/data/NesVentory/testing/test_b1_addresses.py`
   - Tests both normal and reversed MAC addresses
   - Use: `python3 /data/NesVentory/testing/test_b1_addresses.py`

---

## Documentation Created

- `/data/NesVentory/B1_PROTOCOL_FIX.md` - Protocol variant details
- `/data/NesVentory/B1_IMAGE_FIX.md` - Image layout/direction fix
- `/data/NesVentory/PROTOCOL_COMPARISON.md` - B1 vs V5 comparison
- `/data/NesVentory/B1_CURRENT_STATUS.md` - This document

---

## Session Summary

**Progress Made:**
1. ✅ Identified B1 uses different protocol (via niim.blue logs analysis)
2. ✅ Implemented RFCOMM transport for Classic Bluetooth
3. ✅ Fixed B1 protocol payloads (7-byte + 6-byte)
4. ✅ Fixed image layout for horizontal feed direction
5. ✅ Fixed pixel polarity inversion
6. ✅ Motor now runs continuously (was 1 second)
7. ✅ Full label now prints (was motor-only)

**Remaining Issue:**
- Output shows only black bar, not text/QR image
- Likely dimension, rotation, or parameter issue
- Requires further investigation when user returns

**Blockers:**
- None - can continue troubleshooting when user resumes
- All fixes are in place, just need to adjust image dimensions/rotation

---

## Quick Restart Checklist When Returning

1. ☐ Review this document
2. ☐ Check `/data/NesVentory/backend/app/niimbot/printer.py` for current fixes
3. ☐ Verify B1 model specs in printer_service.py (384×240)
4. ☐ Check create_qr_label_image() for image layout logic
5. ☐ Run debug script to verify connection still works
6. ☐ Try image rotation test (rotate 90° before sending)
7. ☐ Try dimension swap test (height first, width second)
8. ☐ Capture image file to verify QR/text rendering
9. ☐ Review niim.blue reference dimensions (240×400)

---

**Last Working State:**
- Backend rebuilt with all fixes
- Printer connects via RFCOMM
- B1 protocol variant in use
- Full label prints with black bar only
- Next: Debug image dimensions/rotation
