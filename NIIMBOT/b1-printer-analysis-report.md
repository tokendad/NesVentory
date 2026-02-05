# Niimbot B1 Printer QR Code Cutoff Issue - Analysis Report

## Executive Summary

After analyzing the working code (Node.js test script using `@mmote/niimblue-node`) against the broken code (NesVentory's Python `printer_service.py`), I have identified the root cause of why the QR code is being cut off during printing on the B1 printer.

**Root Cause: The image data encoding dimensions and rotation are incorrect, causing the printer to receive the wrong byte count per row and stop printing prematurely.**

---

## Problem Description

When printing to the Niimbot B1 printer via Bluetooth:
- The QR code label is being cut off (appears as a thin strip instead of the full label)
- The visual output suggests the printer stops after only ~10-20 rows instead of the full 240 (or 384) rows
- The printed portion appears to be in the correct orientation but incomplete

---

## Technical Analysis

### How the B1 Printer Protocol Works

The B1 printer with "top" print direction has these characteristics:
- **Printhead width**: 384 pixels (≈48mm at 203 DPI)
- **Label dimension for 50×30mm**: 384 × 240 pixels
- **Print direction "top"**: Paper feeds from top to bottom as rows are printed

The critical protocol sequence is:
```
1. SetDensity (0x21)
2. SetLabelType (0x23)
3. PrintStart (0x01)
4. PageStart (0x03)
5. SetPageSize (0x13) - CRITICAL: rows, cols, quantity
6. Send bitmap rows (0x85) - one packet per row
7. PageEnd (0xE3)
8. PrintEnd (0xF3)
```

### The Critical Issue: SetPageSize and Row Encoding Mismatch

**For the B1 with print direction "top", the niimbluelib library does the following:**

1. **Rotates the image 90° counter-clockwise** before encoding
2. Sets `SetPageSize` with the **rotated** dimensions
3. Sends rows based on the **rotated** image dimensions

#### Working Code Flow (niimblue-node / niimbluelib):

```javascript
// Input: 384×240 image (width × height for 50×30mm label)
// Step 1: Rotate 90° CCW
// Result: 240×384 image

// Step 2: SetPageSize command (0x13)
// Payload: rows=384, cols=240, qty=1
// Hex: struct.pack(">HHH", 384, 240, 1) = "0180 00F0 0001"

// Step 3: Send bitmap data
// 384 rows of 240 pixels each
// Bytes per row: 240 / 8 = 30 bytes
```

#### Broken Code Flow (NesVentory printer_service.py):

```python
# Input: 384×240 image
# NO rotation applied (or incorrect rotation)

# SetPageSize command (0x13)
# Payload: rows=240, cols=384, qty=1
# Hex: struct.pack(">HHH", 240, 384, 1) = "00F0 0180 0001"

# Send bitmap data
# 240 rows of 384 pixels each
# Bytes per row: 384 / 8 = 48 bytes
```

### Why the Printer Stops Early

When the broken code sends:
- `SetPageSize(rows=240, cols=384)` - telling printer to expect 240 rows of 384 pixels
- But if the image encoding doesn't match, the printer receives malformed data

The B1 uses a "split mode" header for each row (command 0x85):
```
Header: [row_index_high, row_index_low, count0, count1, count2, repeat]
```

If the bytes per row don't match what the printer expects, it:
1. Receives garbage in subsequent packet parsing
2. Interprets end-of-row data as commands
3. Stops printing prematurely

---

## Comparison: Working vs Broken Code

### Working Code Key Points (from our successful test):

```javascript
// Configuration that worked
const CONFIG = {
  labelWidth: 384,       // 50mm at 8px/mm
  labelHeight: 240,      // 30mm at 8px/mm
  printDirection: 'top', // CRITICAL
  printTask: 'B1',
  density: 3,
};

// Image encoding uses printDirection to rotate
const encoded = await ImageEncoder.encodeImage(image, CONFIG.printDirection);
// This internally rotates the image before encoding
```

The `ImageEncoder.encodeImage()` function in niimbluelib:
1. Takes the print direction into account
2. For "top" direction, rotates the image 90° CCW
3. Converts rotated image to 1-bit bitmap
4. Returns properly formatted row data

### Broken Code Key Points (from NesVentory printer.py):

```python
# From the conversation transcripts:
w, h = image.width, image.height  # 384, 240
sd_payload = struct.pack(">HHH", h, w, 1)  # rows=240, cols=384

# Then encoding without rotation:
for y in range(rows):  # 240 iterations
    line_pixels = [img_l.getpixel((x, y)) for x in range(cols)]  # 384 pixels
    # Creates 48 bytes per row
```

**The broken code:**
1. Does NOT rotate the image before encoding (or rotates incorrectly)
2. Sets wrong dimensions in SetPageSize
3. Sends wrong byte count per row

---

## The Fix

### Required Changes to NesVentory's printer.py:

#### 1. Rotate the Image Before B1 Encoding

```python
if is_b1:
    # B1 with "top" direction requires 90° CCW rotation before encoding
    image = image.transpose(Image.Transpose.ROTATE_270)
    logging.info(f"B1: Rotated image from 384x240 to {image.width}x{image.height}px")
```

#### 2. Use Rotated Dimensions in SetPageSize

```python
# After rotation, image is 240×384
w, h = image.width, image.height  # Now 240, 384
sd_payload = struct.pack(">HHH", h, w, 1)  # rows=384, cols=240
```

#### 3. Encode Rows Based on Rotated Image

```python
# Encoding after rotation:
cols = img_l.width   # 240
rows = img_l.height  # 384
bytes_per_row = cols // 8  # 30 bytes

for y in range(rows):  # 384 iterations
    line_pixels = [img_l.getpixel((x, y)) for x in range(cols)]  # 240 pixels per row
    # Creates 30 bytes per row - CORRECT!
```

---

## Summary of the Problem

| Aspect | Working Code | Broken Code |
|--------|-------------|-------------|
| Input Image | 384×240 | 384×240 |
| Rotation Applied | 90° CCW | None/Wrong |
| After Rotation | 240×384 | 384×240 |
| SetPageSize | rows=384, cols=240 | rows=240, cols=384 |
| Bytes Per Row | 30 | 48 |
| Rows Sent | 384 | 240 |
| Result | ✅ Full label | ❌ Cutoff |

---

## References

### Working Code Locations
- **Node.js Test Script**: Created in earlier conversation using `@mmote/niimblue-node`
- **Niimblue Website Test**: `/NIIMBOT/Niimblue_website_Claude_Test/` in NesVentory repo
- **Python Reference**: `/NIIMBOT/Python Code reference/` in NesVentory repo

### Key Libraries
- **niimbluelib**: https://github.com/MultiMote/niimbluelib (TypeScript)
- **niimblue-node**: https://github.com/MultiMote/niimblue-node (Node.js CLI)
- **niimblue**: https://github.com/MultiMote/niimblue (Web app)

### Verified Working Configuration
```
Printer: B1-H801031588
Address: 01:08:03:82:81:4d
Print Task: B1
Print Direction: top
Label Size: 384×240 pixels (50×30mm)
After Rotation: 240×384 pixels
Density: 3
Firmware: 5.22
```

---

## Recommended Implementation Steps

1. **Locate the B1 print section** in `backend/app/printer_service.py` (around line 576)

2. **Add image rotation** immediately after the B1 detection:
   ```python
   image = image.transpose(Image.Transpose.ROTATE_270)
   ```

3. **Verify SetPageSize** uses rotated dimensions (h, w order for rows, cols)

4. **Verify row encoding** loop iterates over the rotated image's height

5. **Test with debug logging** to confirm:
   - Image dimensions after rotation: 240×384
   - SetPageSize payload: `0180 00F0 0001` (rows=384, cols=240)
   - Bytes per row: 30
   - Total rows sent: 384

---

## Appendix: Protocol Reference

### SetPageSize (0x13) Packet Structure for B1
```
55 55 13 06 [rows_hi] [rows_lo] [cols_hi] [cols_lo] [qty_hi] [qty_lo] [checksum] AA AA
```

For 384 rows, 240 cols, qty 1:
```
55 55 13 06 01 80 00 F0 00 01 [checksum] AA AA
```

### Bitmap Row (0x85) Packet Structure for B1
```
55 55 85 [len] [row_hi] [row_lo] [count0] [count1] [count2] [repeat] [bitmap_data...] [checksum] AA AA
```

Where:
- `row_hi/lo`: 16-bit row index (0 to 383)
- `count0/1/2`: Black pixel counts in each third of the row (for split mode)
- `repeat`: Usually 1
- `bitmap_data`: 30 bytes (240 bits) of 1-bit pixel data

---

## Change History

### 2026-02-04 - Initial Fix Implementation

**Applied by:** Claude Opus 4.5 (via Claude Code CLI)

**File Modified:** `backend/app/niimbot/printer.py`

**Changes Made:**

1. **Added 90° CCW image rotation for B1 printers** (line ~382-390)

   Added rotation immediately after B1 detection in `print_image()` method:
   ```python
   # CRITICAL: B1 with "top" print direction requires 90° CCW rotation
   # Input: 384x240 (width x height) -> After rotation: 240x384
   # This matches niimbluelib's ImageEncoder behavior
   original_size = f"{image.width}x{image.height}"
   image = image.transpose(Image.Transpose.ROTATE_270)
   logging.info(f"B1: Rotated image 90° CCW from {original_size} to {image.width}x{image.height}px")
   ```

2. **Updated SetPageSize logging** to show correct parameter names:
   ```python
   logging.info(f"SetPageSize: rows={h}, cols={w}, bytes_per_row={w//8} -> payload={sd_payload.hex()}")
   ```

3. **Updated debug image save** to note the image is rotated:
   ```python
   logging.info(f"DEBUG IMAGE SAVED (rotated): {debug_path}")
   ```

4. **Updated encoding log message** for clarity:
   ```python
   logging.info(f"Encoding image data: rows={rows}, cols={cols}, bytes_per_row={bytes_per_row}")
   ```

**Expected Results After Fix:**
| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Input Image | 384×240 | 384×240 |
| After Rotation | N/A (no rotation) | 240×384 |
| SetPageSize payload | `00f0 0180 0001` | `0180 00f0 0001` |
| Rows sent | 240 | 384 |
| Bytes per row | 48 | 30 |
| Print result | Cutoff | Full label (expected) |

**Verification Steps:**
1. Check logs for "B1: Rotated image 90° CCW from 384x240 to 240x384px"
2. Verify SetPageSize payload shows `0180 00f0 0001`
3. Confirm 384 rows are sent with 30 bytes each
4. Visual confirmation of complete label print


**************Response to fix***********************
I can see the debug image and logs. The debug image looks correct - it shows "Master Bedroom" with a QR code, properly rotated. The data IS being sent (I can see rows processing with 0x85 Full Mode). But the output is blank.
I've identified several issues:

Issue #1: Wrong Image Dimensions
Expected: 384×240 (B1 model spec)
Actual: 399×239
Input image: 399x239px, mode=L, model=b1
The image dimensions don't match the B1's 384×240 spec. After rotation, you have 239×399 instead of 240×384. This dimension mismatch could cause the printer to misinterpret the data stream.
Root cause: Somewhere the RFID dimensions or label configuration is overriding the correct model specs.

Issue #2: ROTATE_270 vs ROTATE_90
The comment says "90° CCW" but ROTATE_270 is actually 90° clockwise (270° CCW = 90° CW).
According to PIL:

ROTATE_90 = 90° counter-clockwise
ROTATE_270 = 90° clockwise
       ***Developer notes***
            ### ROTATE_90   result Words to the right of qr Code "b1_print_1770234484.png"
            ### ROTATE_270  result words to the left of qr code  
            ### ROTATE_180  result words on top b1_print_1770234733.png"
            ### removing the rotation does set the image to the correct orientation,  and a label starts ### to print but it is cut off


The niimbluelib reference code uses counter-clockwise rotation for "top" direction.

Issue #3: Mismatch in bytes_per_row Logging
SetPageSize: rows=399, cols=239, bytes_per_row=29
Encoding image data: rows=399, cols=239, bytes_per_row=30
The SetPageSize logs w//8 = 29 but encoding uses (cols+7)//8 = 30. This is just a logging inconsistency, but it highlights that 239 pixels doesn't evenly divide into bytes.

Recommended Fixes
Fix 1: Force Correct Dimensions
In printer_service.py, change the B1 section to always use model specs:
pythonif model.lower() in ["b1", "b21", "b21_pro", "b21_c2b"]:
    # ALWAYS use model specs for B-series - RFID dimensions can be unreliable
    target_w = model_specs["width"]   # 384
    target_h = model_specs["height"]  # 240
Fix 2: Try ROTATE_90 Instead
In printer.py line 391, change:
python# FROM:
image = image.transpose(Image.Transpose.ROTATE_270)

   ***** Developer note-  Rotation change prodcued only a blank label

# TO:
image = image.transpose(Image.Transpose.ROTATE_90)
Fix 3: Simplify Encoding (Diagnostic Test)
Temporarily disable the compression/optimization to test basic printing. Replace the complex encoding loop (lines 448-558) with simple row-by-row encoding:
python# Simple encoding - no compression, no empty row skipping
img_l = image.convert("L")
cols = img_l.width
rows = img_l.height
bytes_per_row = (cols + 7) // 8

logging.info(f"Simple encoding: {rows} rows, {cols} cols, {bytes_per_row} bytes/row")

for y in range(rows):
    line_data = self._get_line_data(img_l, y, cols)

    # Simple header with no repeat, no split counts
    header = struct.pack(">H B B B B", y, 0, 0, 0, 1)
    self._send(NiimbotPacket(0x85, header + line_data))
    time.sleep(0.015)

    if y % 50 == 0:
        logging.info(f"Sent row {y}/{rows}")

logging.info(f"Sent all {rows} rows")

Testing Priority

First: Fix the dimensions to 384×240 - this is the most likely cause
Second: Try ROTATE_90 instead of ROTATE_270
Third: If still blank, use the simplified encoding to rule out compression issues

The blank output suggests the printer is receiving data but can't interpret it correctly - most likely due to the dimension mismatch (239 cols doesn't match B1's expected 240-pixel row width).
