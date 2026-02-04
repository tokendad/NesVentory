# B1 Printer - Quick Restart Guide

**Current Status:** Motor runs, full label prints, but shows only a black bar

---

## What's Working ✅
- RFCOMM Bluetooth connection
- B1 protocol variant (7-byte + 6-byte payloads)
- Label size (full label prints, not partial)
- Motor runs continuously
- Handshake successful

## What's Not Working ⚠️
- Image rendering (shows black bar instead of QR/text)
- Likely: image dimensions, rotation, or parameters

---

## Quick Diagnostic Tests (Do These First)

### Test 1: Verify Connection Still Works (5 minutes)
```bash
cd /data/NesVentory
python3 testing/debug_b1_printer.py --address 03:01:08:82:81:4D
```

**Expected:** "Print sequence completed successfully"
**If fails:** Printer not responding - check power/pairing

---

### Test 2: Try Swapping Image Dimensions (10 minutes)

**File:** `/data/NesVentory/backend/app/niimbot/printer.py`

**Current code (lines ~591-593):**
```python
w, h = image.width, image.height
sd_payload = struct.pack(">HHH", w, h, 1)
```

**Try changing to:**
```python
w, h = image.width, image.height
sd_payload = struct.pack(">HHH", h, w, 1)  # Swap h and w
```

Then rebuild and test:
```bash
docker-compose build backend
docker-compose restart backend
```

Wait for startup, then try printing. **If this works,** the issue was dimension order!

---

### Test 3: Try Rotating Image 90° (10 minutes)

**File:** `/data/NesVentory/backend/app/printer_service.py`

**In create_qr_label_image() function, near the end (before `return label`), add:**
```python
# For horizontal feed, try rotating
if is_horizontal_feed:
    label = label.rotate(90, expand=False)
```

Rebuild and test. **If this works,** the issue was orientation!

---

### Test 4: Compare Image File (15 minutes)

**Add this to create_qr_label_image() before return:**
```python
# Debug: save image for inspection
label.save("/tmp/b1_label_debug.png")
logging.info("Label image saved to /tmp/b1_label_debug.png")
```

Then:
1. Print a label via GUI
2. Check: `file /tmp/b1_label_debug.png`
3. Extract and view the image
4. Check if QR/text are visible in the PNG
5. Check if image looks rotated

---

## Most Likely Issues

### Issue 1: Dimension Order Wrong (60% likely)
- **Symptom:** Black bar along one edge
- **Fix:** Try swapping width/height in SetPageSize payload
- **Code:** Change `struct.pack(">HHH", w, h, 1)` to `struct.pack(">HHH", h, w, 1)`

### Issue 2: Image Needs Rotation (25% likely)
- **Symptom:** Image appears but in wrong orientation
- **Fix:** Rotate 90° before sending
- **Code:** Add `label = label.rotate(90, expand=False)`

### Issue 3: Image Dimensions Mismatch (10% likely)
- **Symptom:** Image smaller than label or scaled wrong
- **Fix:** Check that 384×240 matches actual print area
- **Code:** Verify image.width=384, image.height=240

### Issue 4: Pixel Encoding Still Wrong (5% likely)
- **Symptom:** Inverted colors or pattern
- **Fix:** Already applied but might need tweaking
- **Code:** Line with `"1" if pix < 128 else "0"`

---

## Step-by-Step Restart Procedure

### 1. Review Status (5 min)
```bash
cat /data/NesVentory/B1_CURRENT_STATUS.md
```

### 2. Check Code (5 min)
Review the B1 protocol code in:
- `/data/NesVentory/backend/app/niimbot/printer.py` (lines 565-650)
- `/data/NesVentory/backend/app/printer_service.py` (lines 225-312)

### 3. Quick Connection Test (5 min)
```bash
python3 /data/NesVentory/testing/debug_b1_printer.py --address 03:01:08:82:81:4D
```

### 4. Try Diagnostic Tests (30 min)
Start with Test 1 (dimension swap), then Test 2 (rotation), etc.

### 5. If None Work (30 min)
- Add image logging to save PNG file
- Print and inspect the PNG
- Compare with expected QR code layout
- Check dimensions match printer specs

---

## Files to Reference

**Main Code:**
- `/data/NesVentory/backend/app/niimbot/printer.py` (protocol & encoding)
- `/data/NesVentory/backend/app/printer_service.py` (image creation)

**Documentation:**
- `/data/NesVentory/B1_CURRENT_STATUS.md` (detailed status)
- `/data/NesVentory/B1_PROTOCOL_FIX.md` (protocol explanation)
- `/data/NesVentory/B1_IMAGE_FIX.md` (layout explanation)
- `/data/NesVentory/PROTOCOL_COMPARISON.md` (B1 vs V5)

**Test Scripts:**
- `/data/NesVentory/testing/debug_b1_printer.py`
- `/data/NesVentory/testing/test_b1_addresses.py`

---

## Command Reference

### Rebuild Backend
```bash
cd /data/NesVentory
docker-compose build backend
docker-compose restart backend
```

### Check Backend Logs
```bash
docker logs -f nesventory_backend | grep -i "b1\|protocol\|image"
```

### Test Connection
```bash
python3 /data/NesVentory/testing/debug_b1_printer.py --address 03:01:08:82:81:4D
```

### View Docker Image
```bash
docker-compose ps
docker logs nesventory_backend
```

---

## Success Indicators

When fixed, the output should show:
- ✅ Large QR code at top of label
- ✅ Location name readable below QR
- ✅ Proper spacing and margins
- ✅ Black on white (correct polarity)
- ✅ Professional appearance

---

## Contact Points

If changes needed, focus on:

1. **Protocol variant:** `/data/NesVentory/backend/app/niimbot/printer.py` lines 565-616
   - B1-specific 7-byte and 6-byte payloads
   - Pixel encoding (dark = 1, bright = 0)

2. **Image layout:** `/data/NesVentory/backend/app/printer_service.py` lines 225-312
   - QR placement for horizontal feed
   - Text placement below QR

3. **Dimension sending:** `/data/NesVentory/backend/app/niimbot/printer.py` line 593
   - SetPageSize payload order

---

## Expected Timeline

- **Dimension test:** 15 minutes (quick fix if correct)
- **Rotation test:** 15 minutes (quick fix if correct)
- **Image debugging:** 30 minutes (if above don't work)
- **Total worst case:** 1 hour to identify and fix

---

**Last Session Ended:** 2026-02-02 14:48
**Next Session Start:** Review this document + run diagnostic tests
