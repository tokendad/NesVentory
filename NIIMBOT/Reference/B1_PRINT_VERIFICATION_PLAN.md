# B1 Print Output Verification - Investigation Plan

**Status**: Black bar output - Image not rendering correctly
**Date**: February 3, 2026
**Goal**: Get full QR code + text printing on B1 labels

---

## Current Symptoms

- ✅ Motor runs continuously (full print duration)
- ✅ Full label prints (all 240 pixels height)
- ❌ Output: Only a black bar along edge
- ❌ No QR code visible
- ❌ No text visible

---

## Root Cause Analysis

Three most likely causes (in order of probability):

### 1. **Image Dimensions Are Swapped** (50% likelihood)

**Current Code:**
```python
w, h = image.width, image.height  # 384, 240
sd_payload = struct.pack(">HHH", w, h, 1)  # width=384, height=240
```

**Issue:** B1 might expect dimensions in different order

**Test 1a: Try height-first order**
```python
sd_payload = struct.pack(">HHH", h, w, 1)  # height=240, width=384
```

**Test 1b: Try smaller known dimensions**
- Instead of 384×240, try 240×240 (square)
- If it prints a square black bar, dimensions are being interpreted wrong
- If it prints correctly, issue is aspect ratio

**Evidence to look for:**
- If black bar is now wide instead of narrow → dimensions were swapped
- If output is still the same → different issue

---

### 2. **Image Needs 90° Rotation** (30% likelihood)

**Current:** Image is 384×240 (landscape)

**Hypothesis:** B1 "top" direction might expect image rotated

**Test 2: Rotate image before sending**
```python
# In printer.py, before sending image data:
image = image.rotate(90, expand=False)
# Then send: width=240, height=384
```

**Evidence to look for:**
- Blurry or distorted output → rotation is being applied twice somewhere
- No change → not the issue
- Better output with rotated dimensions → this is likely the fix

---

### 3. **Image Width/Height Parameters Wrong** (20% likelihood)

**Current:** Sending raw image width/height

**Hypothesis:** B1 protocol might expect pixel count in different units or format

**Reference Data:**
```
niim.blue successful example:
- Width: 0x00f0 = 240 pixels
- Height: 0x0190 = 400 pixels
- For a 240×400 label

Our B1 specs:
- Width: 384 pixels (full printhead)
- Height: 240 pixels (label height)
```

**Test 3: Check if our dimensions need scaling**
```python
# Maybe dimensions need adjustment?
# Try: 384 → 400, 240 → 256?
# Or maybe it's about DPI scaling?

# Current DPI: 203
# If niim.blue was different DPI, scale accordingly
scaled_w = int(image.width * (target_dpi / 203))
scaled_h = int(image.height * (target_dpi / 203))
```

---

## Testing Strategy

### Phase 1: Quick Tests (5-10 minutes)

Run these tests sequentially and document output for each:

**Test 1A: Dimension Order (most likely)**
```python
# Edit backend/app/niimbot/printer.py, line 593:
# BEFORE:
sd_payload = struct.pack(">HHH", w, h, 1)

# AFTER (Test 1A):
sd_payload = struct.pack(">HHH", h, w, 1)

# Rebuild and test print
```

**Test 1B: Square Dimensions**
```python
# BEFORE:
w, h = image.width, image.height

# AFTER (Test 1B):
w, h = 240, 240  # Force square to test interpretation

# Rebuild and test print
```

---

### Phase 2: Image Rotation Tests (if Phase 1 fails)

**Test 2: Image Rotation**
```python
# In printer.py, around line 598:
# AFTER image loading:
if is_b1:
    image = image.rotate(90, expand=False)
    w, h = image.height, image.width  # Swap dimensions for rotated image

# Rebuild and test
```

---

### Phase 3: Detailed Logging (if needed)

Add detailed logging to diagnose:

```python
# In printer.py, add before sending:
logging.info(f"B1 Print - Image: {image.width}x{image.height}")
logging.info(f"B1 Print - Sending dimensions: w={w}, h={h}")
logging.info(f"B1 Print - Payload hex: {sd_payload.hex()}")
logging.info(f"B1 Print - Image pixel range: min={min_pix}, max={max_pix}")
logging.info(f"B1 Print - First row bits (first 80): {line_bits_str[:80]}")
```

Then check logs: `docker logs nesventory_backend | grep "B1 Print"`

---

### Phase 4: Save Image to File (diagnostic)

Add image capture before printing:

```python
# In printer.py, before line 598:
import os
debug_path = f"/tmp/b1_debug_{datetime.now().isoformat()}.png"
image.save(debug_path)
logging.info(f"DEBUG: Saved image to {debug_path}")
```

Then check the saved PNG to see exactly what's being sent.

---

## Expected Results After Fix

**Currently:**
```
Black bar along edge, no QR/text
```

**After fixing dimensions:**
```
Should see:
- Large QR code (200×200 pixels) at top
- Location name in text below QR
- Proper spacing and margins
- Professional-looking label
```

---

## Implementation Steps

### Step 1: Try Dimension Swap (Most Likely)

1. Edit `/data/NesVentory/backend/app/niimbot/printer.py`, line 593
2. Change: `sd_payload = struct.pack(">HHH", w, h, 1)`
3. To: `sd_payload = struct.pack(">HHH", h, w, 1)`
4. Rebuild: `docker-compose build`
5. Restart: `docker-compose restart`
6. Test print a label
7. Document result in checklist

### Step 2: If Step 1 fails, try rotation

1. Edit printer.py around line 598
2. Add image rotation before encoding
3. Adjust width/height assignments
4. Rebuild and test
5. Document result

### Step 3: If still failing, add logging

1. Add comprehensive logging
2. Save debug image
3. Examine actual image being sent
4. Compare with expected QR code image

---

## Testing Checklist

For each test, document:
- [ ] Test applied (which change made)
- [ ] Docker rebuilt successfully
- [ ] Docker restarted
- [ ] Print command issued
- [ ] Result observed:
  - Black bar position (top/bottom/side/full)
  - Any visible text or QR
  - Any distortion or artifacts
- [ ] Next action

---

## Success Criteria

Test passes when:
1. QR code is visible and properly sized
2. Location text is readable below QR
3. Label prints cleanly without artifacts
4. Motor runs for full print duration

---

## Reference Data

### B1 Printer Specs
```
Model: B1
Label: 50×30mm (in inches)
Pixels: 384 wide × 240 tall @ 203 DPI
Protocol: V5 variant with 7-byte + 6-byte payloads
Bluetooth: Classic RFCOMM
```

### Image Encoding
- Format: Grayscale (L mode)
- Bits per pixel: 1 (bitmap)
- Byte order: Big-endian
- Bit encoding: 1=black, 0=white
- Pixels < 128 gray → 1 (ink)
- Pixels >= 128 gray → 0 (no ink)

### Working Reference
```
niim.blue logs showed successful B1 print:
- SetDensity ✓
- SetLabelType ✓
- PrintStart with 7-byte payload ✓
- PageStart ✓
- SetPageSize with 6-byte payload ✓
- Image rows (0x85) ✓
- PageEnd ✓
- PrintEnd ✓
```

---

## Next Actions

1. **Immediate**: Run Test 1A (dimension swap) - takes 5 minutes
2. **If fails**: Run Test 1B (square test) - another 5 minutes
3. **If fails**: Run Test 2 (rotation) - another 5 minutes
4. **If fails**: Add logging and debug - 10-15 minutes

Total estimated time: 20-30 minutes to fix

---

## Rollback Plan

If anything breaks:
```bash
# Revert to last working state
git checkout backend/app/niimbot/printer.py
docker-compose build
docker-compose restart
```

All changes are isolated to one method, easy to revert.

---

**Status**: Ready for testing phase
**Last Updated**: February 3, 2026
