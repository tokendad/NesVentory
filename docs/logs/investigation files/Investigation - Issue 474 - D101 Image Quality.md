# Investigation: Issue #474 - D101 Image Quality and Layout

**Issue:** [#474 - Fix: Improve D101 image quality and layout for 25x50mm labels](https://github.com/tokendad/NesVentory/issues/474)

**Investigation Date:** February 1, 2026
**Last Updated:** February 6, 2026

**Status:** ROOT CAUSE IDENTIFIED - Fix Required

---

## Problem Statement

Testing the **D101 24mm thermal printer** with **25x50mm labels** shows:
- Image quality improved after Phase 1 (responsive sizing) - quality is now acceptable
- Print content is far too small - sized for ~12mm label on a 25mm-wide label
- Both D101 (24mm) and D110 (12mm) profiles produce ~50% size output
- Content is not aligned correctly on the label

**User Feedback (burner-, Feb 5-6 2026):**
> "D110 (12mm) profile does about 50% size qr and text. D101 (24mm) also does 50% qr and text so it is right size for 12mm label but just not aligned right."
> "Looks that I got more files at pull and I did rebuild but problem stays"

---

## Phase 1 Status: Responsive Sizing - COMPLETED (Partial Success)

**Commit:** `115993a` (Feb 2, 2026) - fix(printer): implement responsive QR and font sizing for D101 labels

### What Was Implemented
- Responsive QR sizing: 35% of min(width, height) dimension
- Responsive font sizing: 20% of available height after QR, DPI-adjusted
- Backend and frontend aligned on same responsive logic

### Result
- Image quality improved (QR codes are crisper)
- BUT content is too small because the **canvas dimensions are wrong**
- QR went from 124px (fixed) to ~60px (responsive) - made things worse for size

---

## Root Cause Analysis (CONFIRMED)

### PRIMARY ROOT CAUSE: Incorrect D101 Default Label Dimensions

The D101 model spec has a hardcoded `height: 180` which does not match any common label size:

**Backend** (`printer_service.py:28`):
```python
"d101": {"width": 192, "height": 180, "dpi": 203, "direction": "left"}
```

**What this means at 203 DPI:**
- width = 192px = **24mm** (correct - matches printhead)
- height = 180px = **22.5mm** (WRONG - does not match any standard label)

**What the dimensions SHOULD be for 25x50mm labels:**
- width = 192px (printhead constraint, correct)
- height = 50mm x (203/25.4) = **~400px**

**Result:** The backend generates a 192x180px image. When printed on a 50mm-long label, the content only fills ~45% of the label length, and the responsive sizing algorithm then makes QR/text proportional to this too-small canvas, compounding the problem.

| Dimension | Current Value | Correct (25x50mm) | Correct (25x40mm) |
|-----------|--------------|-------------------|-------------------|
| Width     | 192px (24mm) | 192px (24mm)      | 192px (24mm)      |
| Height    | 180px (22.5mm) | ~400px (50mm)   | ~320px (40mm)     |

### SECONDARY ROOT CAUSE: Frontend Hardcoded Label Length

**Frontend** (`QRLabelPrint.tsx:504`):
```typescript
const labelLengthMm = 40;  // Hardcoded for ALL models
const labelLengthPx = Math.round((labelLengthMm / 25.4) * dpi);
```

The frontend always generates labels assuming 40mm length regardless of model or actual label size. For D101 at 203 DPI this gives ~320px height, which is better than the backend's 180px but still doesn't match a 50mm label.

### TERTIARY ROOT CAUSE: No User-Configurable Label Size

Neither the backend nor frontend allows the user to specify their actual label dimensions. The system relies entirely on hardcoded model defaults, but label length varies by what the user has loaded in their printer. The `PrinterConfig` model has `label_width` and `label_height` fields, but:
- The frontend never sends these values for server prints (line 389: `// label_width_mm and label_height_mm removed`)
- The router passes `label_width=None, label_height=None` (line 188-189)
- Only the LABEL_SIZES array exists with a single entry: `12x40mm` (line 91)

### Why Responsive Sizing Made Things Worse

The responsive sizing algorithm is correct in principle but was applied to wrong canvas dimensions:

**Before Phase 1 (hardcoded):**
- D101 canvas: 192x180px
- QR: 124x124 (69% of height - overflows proportionally, but larger)
- Font: 32px

**After Phase 1 (responsive):**
- D101 canvas: still 192x180px
- QR: 60px (35% of min(192,180)=180 -> 63, rounded to 60)
- Font: 22px (20% of (180-60-10)=110)

The responsive algorithm correctly sizes elements for the 192x180 canvas - but that canvas is wrong for a 25x50mm label. With correct dimensions (192x400), the responsive sizing would produce:
- QR: ~67px (35% of min(192,400)=192 -> 67, rounded to 60)
- Font: larger, based on available space after QR

---

## Manufacturer Hardware Reference (Verified)

**Source:** `NIIMBOT/Reference/NIIMBOT_HARDWARE_REFERENCE.md` (from NIIMBOT API: `GET https://print.niimbot.com/api/hardware/list`)

### Complete Model Comparison: Manufacturer vs Our Code

| Model | Mfr DPI | Mfr Print Dir | Mfr Width Range | Mfr Default Label | Mfr Max (WxH) | Our width(px) | Our height(px) | Status |
|-------|---------|---------------|-----------------|-------------------|---------------|---------------|----------------|--------|
| D11_H | 300 | 90° | 12-12mm | 30x12mm | 15x200mm | 136 | 472 (40mm) | OK (larger than default) |
| **D101** | 203 | 90° | **12-24mm** | **30x25mm** | **25x100mm** | 192 | **180 (22.5mm)** | **WRONG** |
| **D110** | 203 | 90° | 12-12mm | **30x12mm** | 15x100mm | 96 | **96 (12mm)** | **WRONG** |
| **D110_M** | 203 | 90° | 12-12mm | **30x12mm** | 15x100mm | 96 | **96 (12mm)** | **WRONG** |
| B1 | 203 | 0° | 20-48mm | 50x30mm | 50x200mm | 384 | 240 (30mm) | OK |
| B21 | 203 | 0° | 20-48mm | 50x30mm | 50x200mm | 384 | 240 (30mm) | OK |
| B21_Pro | 300 | 0° | 20-50mm | 50x30mm | 50x200mm | 591 | 240 (20mm) | Low (should be ~354) |
| B21-C2B | 203 | 0° | 10-48mm | 50x30mm | 50x200mm | 384 | 240 (30mm) | OK |
| M2_H | 300 | 0° | 20-48mm | 50x30mm | 50x240mm | 591 | 240 (20mm) | Low (should be ~354) |

### Manufacturer Default Size Format
- D-series (90° rotation): format is **Length x Width** (e.g., D101 "30x25mm" = 30mm long x 25mm wide)
- B-series (0° rotation): format is **Width x Height** (e.g., B1 "50x30mm" = 50mm wide x 30mm tall)
- Max size column: always **Width x Height**

### D101 Manufacturer Specs (Key Details)
- **Model ID:** 44, **Codes:** [2560]
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Label:** 30x25mm (30mm long, 25mm wide)
- **Maximum Label:** 25mm wide x 100mm long
- **Width Range:** 12mm to 24mm (printhead = 24mm = 192px)
- **Density:** 1-3, default 2
- **RFID:** Type 1 (supported)
- **Paper Types:** Gap paper (1), Transparent (5)
- **Print Method:** Centered (code: 2)

### Correct Default Heights (from manufacturer defaults)

| Model | Default Label Length | DPI | Correct Default height(px) | Our Current | Delta |
|-------|---------------------|-----|---------------------------|-------------|-------|
| D11_H | 30mm (we use 40mm) | 300 | 354px (472px for 40mm) | 472px | OK |
| **D101** | **30mm** | 203 | **240px** | **180px** | **-60px (33% too small)** |
| **D110** | **30mm** | 203 | **240px** | **96px** | **-144px (60% too small)** |
| **D110_M** | **30mm** | 203 | **240px** | **96px** | **-144px (60% too small)** |
| B1 | 30mm | 203 | 240px | 240px | OK |
| B21 | 30mm | 203 | 240px | 240px | OK |
| B21_Pro | 30mm | 300 | 354px | 240px | -114px (caution) |
| B21-C2B | 30mm | 203 | 240px | 240px | OK |
| M2_H | 30mm | 300 | 354px | 240px | -114px (caution) |

### For burner-'s 25x50mm Labels on D101
- 50mm at 203 DPI = round(50 / 25.4 * 203) = **400px**
- This is well within the D101 max of 100mm (799px)
- Our current 180px generates only 22.5mm of content on a 50mm label = **45% utilization**

### Density Discrepancies Found

| Model | Mfr Density Range | Mfr Default | Our DENSITY_LIMITS | Our Backend Default |
|-------|-------------------|-------------|--------------------|--------------------|
| D11_H | 1-5 | 3 | 3 | 3 |
| D101 | 1-3 | 2 | 3 | 2 |
| D110 | 1-3 | 2 | 3 | 2 |
| D110_M | **1-5** | **3** | 3 | 2 |
| B1 | 1-5 | 3 | 5 | 3 |

Note: D11_H manufacturer says density range 1-5 but our code limits to 3. D110_M manufacturer says 1-5 but our code limits to 3.

---

## Current Code State (Feb 6, 2026)

### Backend Model Specs (`printer_service.py:26-36`)

```python
PRINTER_MODELS = {
    "d11_h":   {"width": 136, "height": 472, "dpi": 300, "direction": "left"},
    "d101":    {"width": 192, "height": 180, "dpi": 203, "direction": "left"},   # <-- height WRONG (should be 240-400)
    "d110":    {"width": 96,  "height": 96,  "dpi": 203, "direction": "left"},   # <-- height WRONG (should be 240)
    "d110_m":  {"width": 96,  "height": 96,  "dpi": 203, "direction": "left"},   # <-- height WRONG (should be 240)
    "b1":      {"width": 384, "height": 240, "dpi": 203, "direction": "top"},    # OK
    "b21":     {"width": 384, "height": 240, "dpi": 203, "direction": "top"},    # OK
    "b21_pro": {"width": 591, "height": 240, "dpi": 300, "direction": "top"},    # Low (should be ~354)
    "b21_c2b": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},   # OK
    "m2_h":    {"width": 591, "height": 240, "dpi": 300, "direction": "top"},    # Low (should be ~354)
}
```

**Note on model spec semantics:**
- `width` = printhead width in pixels (hardware-fixed, cannot exceed this)
- `height` = label length in feed direction (depends on user's label stock, NOT printer hardware)
- Manufacturer widths are all correct. Heights are wrong for D101, D110, D110_M and slightly low for B21_Pro, M2_H.

### Backend Responsive Sizing (`printer_service.py:180-222`)
- `calculate_responsive_qr_size()`: 35% of min dimension, min 50px, rounded to 10px
- `calculate_responsive_font_size()`: 20% of (height - qr_size - 10), DPI-adjusted (0.6-1.5x)
- Both functions work correctly but depend on correct label dimensions as input

### Backend Label Generation (`printer_service.py:225-345`)
- `create_qr_label_image()` creates canvas of `label_width x label_height`
- D-series ("left" direction): QR on left, text on right (rotated -90)
- B-series ("top" direction): QR on top, text below
- Now uses WHITE background (color=255) with BLACK text (fill=0)

### Frontend Label Drawing (`QRLabelPrint.tsx:499-603`)
- `drawLabelForModel()` creates canvas from model spec
- Label length hardcoded to 40mm for all models (line 504)
- D-series: canvas = labelLengthPx x printheadPixels, then +90 rotation before print
- Responsive sizing mirrors backend logic

### Server Print Flow (`routers/printer.py:124-203`)
- Frontend sends NO label dimensions (disabled/removed)
- Router passes `label_width=None, label_height=None`
- `print_qr_label()` falls back to model specs: `model_specs["width"]` and `model_specs["height"]`
- For D101: always uses 192x180 regardless of actual label

---

## Proposed Fix Plan

### Phase 2A: Correct Default Label Heights (HIGH PRIORITY)

**Problem:** Multiple D-series models have wrong default heights. Verified against manufacturer API.

**Immediate fix - Update PRINTER_MODELS heights to manufacturer defaults:**

```python
PRINTER_MODELS = {
    "d11_h":   {"width": 136, "height": 472, "dpi": 300, "direction": "left"},   # 40mm - keep (working)
    "d101":    {"width": 192, "height": 240, "dpi": 203, "direction": "left"},   # 30mm mfr default (was 180)
    "d110":    {"width": 96,  "height": 240, "dpi": 203, "direction": "left"},   # 30mm mfr default (was 96)
    "d110_m":  {"width": 96,  "height": 240, "dpi": 203, "direction": "left"},   # 30mm mfr default (was 96)
    "b1":      {"width": 384, "height": 240, "dpi": 203, "direction": "top"},    # OK
    "b21":     {"width": 384, "height": 240, "dpi": 203, "direction": "top"},    # OK
    "b21_pro": {"width": 591, "height": 354, "dpi": 300, "direction": "top"},    # 30mm @ 300 DPI (was 240)
    "b21_c2b": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},   # OK
    "m2_h":    {"width": 591, "height": 354, "dpi": 300, "direction": "top"},    # 30mm @ 300 DPI (was 240)
}
```

**Note:** This sets D101 to the manufacturer default 30mm label. burner-'s 50mm labels will still need Phase 2C (user-configurable label size) to get the full 400px height. However, 240px (30mm) is a massive improvement over the current 180px (22.5mm) and will produce a usable print on 50mm labels at ~60% utilization.

**Also update DENSITY_LIMITS to match manufacturer specs:**
```python
DENSITY_LIMITS = {
    "d11_h": 5,    # Mfr says 1-5 (was 3)
    "d101": 3,     # OK
    "d110": 3,     # OK
    "d110_m": 5,   # Mfr says 1-5 (was 3)
    "b1": 5,       # OK
    "b21": 5,      # OK
    "b21_pro": 5,  # OK
    "b21_c2b": 5,  # OK
    "m2_h": 5,     # OK
}
```

### Phase 2B: Frontend Label Length Per Model (HIGH PRIORITY)

**Problem:** `labelLengthMm = 40` is hardcoded for all models (line 504).

**Fix:** Add `defaultLabelLengthMm` to `NIIMBOT_MODELS` in `src/lib/niimbot.ts`:

```typescript
export interface NiimbotModelSpec {
  model: string;
  label: string;
  dpi: number;
  printDirection: PrintDirection;
  printheadPixels: number;
  densityMin: number;
  densityMax: number;
  densityDefault: number;
  defaultLabelLengthMm: number;   // NEW: manufacturer default label length
  maxLabelLengthMm: number;       // NEW: manufacturer max label length
}

export const NIIMBOT_MODELS: NiimbotModelSpec[] = [
  { model: 'D11',    ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 100 },
  { model: 'D11S',   ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 75 },
  { model: 'D101',   ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 100 },
  { model: 'D110',   ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 100 },
  { model: 'D110_M', ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 100 },
  { model: 'D11_H',  ..., defaultLabelLengthMm: 40,  maxLabelLengthMm: 200 },  // Keep 40 (working)
  { model: 'B1',     ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 200 },
  { model: 'B21',    ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 200 },
  { model: 'B21_PRO',..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 200 },
  { model: 'B21_C2B',..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 200 },
  { model: 'M2_H',   ..., defaultLabelLengthMm: 30,  maxLabelLengthMm: 240 },
];
```

Then update `drawLabelForModel()` to use model-specific length:
```typescript
// BEFORE (line 504):
const labelLengthMm = 40;

// AFTER:
const labelLengthMm = modelSpec.defaultLabelLengthMm;
```

This alone won't solve burner-'s 50mm label issue (needs Phase 2C for user override), but it ensures each model uses its manufacturer-recommended default instead of a hardcoded 40mm.

### Phase 2C: User-Configurable Label Size (MEDIUM PRIORITY)

**Problem:** Different users have different label stock. The system needs to support arbitrary label sizes within printer constraints.

**Approach:**
1. Add label size presets to the printer configuration UI (UserSettings)
2. Store selected label size in `niimbot_printer_config`
3. Pass label dimensions from frontend to backend for server prints
4. Use selected label size in frontend direct print canvas sizing
5. Re-enable the `label_width`/`label_height` path in the router (currently disabled)

**UI Concept:**
```
Printer Model: [D101 (24mm)]
Label Size:    [25x50mm ▼]  ← NEW dropdown with common sizes per model
               Options: 25x50mm, 25x40mm, 25x30mm, Custom...
```

### Phase 2D: Fix Responsive Sizing for D-Series Layout (MEDIUM PRIORITY)

With corrected canvas dimensions (e.g., 192x400 for D101 25x50mm), the current responsive sizing produces:
- QR: 35% of min(192, 400) = 35% of 192 = 67px (reasonable for 24mm width)
- But for "left" direction, the QR should size against the printhead width, not label length

**Proposed fix:** For D-series ("left" direction), QR should be ~80-90% of printhead width:
```python
if print_direction == "left":
    # QR sized to printhead width (the narrow dimension)
    qr_size = int(label_width * 0.85)  # ~163px for D101 = ~20mm QR
else:
    # B-series: QR sized relative to available space
    qr_size = current responsive logic
```

This would give D101 a QR of ~163px on a 192px-wide printhead, with text running along the 400px length - matching how users expect labels to look.

### Phase 3: D-Series Layout Rethink (LOW PRIORITY - after user testing)

For D-series with "left" direction, the natural label layout is:
- Short axis = printhead width (192px for D101)
- Long axis = feed direction (label length)
- QR code should fill most of the short axis width
- Text should run along the long axis below/beside QR

The current "QR left, text right (rotated)" layout may not be optimal for wider D-series printers. Consider alternative layouts for wider printheads.

---

## Updated Implementation Plan

### Immediate Fix (Phase 2A+2B) - PRIORITY
- [ ] Update backend PRINTER_MODELS heights (manufacturer-verified values):
  - D101: 180 -> 240 (30mm default)
  - D110: 96 -> 240 (30mm default)
  - D110_M: 96 -> 240 (30mm default)
  - B21_Pro: 240 -> 354 (30mm @ 300 DPI)
  - M2_H: 240 -> 354 (30mm @ 300 DPI)
  - D11_H: keep 472 (40mm, working)
- [ ] Update backend DENSITY_LIMITS: D11_H 3->5, D110_M 3->5
- [ ] Add `defaultLabelLengthMm` and `maxLabelLengthMm` to frontend NIIMBOT_MODELS
- [ ] Replace hardcoded `labelLengthMm = 40` with `modelSpec.defaultLabelLengthMm`
- [ ] Verify responsive sizing output with corrected dimensions
- [ ] Regression test D11-H with 12x40mm labels (must not change)
- [ ] Request burner- test D101 with 25x50mm labels

### Label Size Configuration (Phase 2C)
- [ ] Add common label size presets per model to both backend and frontend
- [ ] Add label size selector to printer configuration UI
- [ ] Store selected label size in user's printer config
- [ ] Re-enable label dimension passing from frontend to backend router
- [ ] Test server print path with user-specified dimensions

### Layout Refinement (Phase 2D)
- [ ] Adjust responsive QR sizing for D-series to use printhead width as primary constraint
- [ ] Test layout balance on D101 with corrected dimensions
- [ ] Get user feedback on QR size vs text space ratio

### Deferred from Original Plan
- Phase 3 (DPI-Aware Rendering): Not needed - quality is fine after Phase 1
- Phase 4 (Preview Validation): Low priority, defer to later
- Phase 5 (Full Test Matrix): Ongoing with each fix

---

## Test Results History

### Initial State (Pre-Feb 2)
- D101 24mm + 25x50mm: Poor quality, poor layout
- D101 24mm + D110 12mm profile: Acceptable

### After Phase 1 - Responsive Sizing (Feb 2, commit 115993a)
- D101 24mm + 25x50mm: Good quality, BUT too small (~50% of label)
- D110 12mm + D101 printer: Also ~50% size
- Root cause: correct responsive sizing applied to incorrect canvas dimensions

### After Latest Push (Feb 5-6, user tested)
- D101 24mm: Still 50% size, not aligned right
- Problem persists because canvas dimensions were not changed

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/printer_service.py` | 26-36 | PRINTER_MODELS specs (D101 height needs fix) |
| `backend/app/printer_service.py` | 180-222 | Responsive QR and font sizing functions |
| `backend/app/printer_service.py` | 225-345 | `create_qr_label_image()` label generation |
| `backend/app/printer_service.py` | 348-415 | `print_qr_label()` print dispatch |
| `backend/app/routers/printer.py` | 28-38 | PrinterConfig model (has label_width/height fields) |
| `backend/app/routers/printer.py` | 124-203 | print_label endpoint (currently passes None dims) |
| `src/components/QRLabelPrint.tsx` | 88-92 | LABEL_SIZES (only 12x40mm) |
| `src/components/QRLabelPrint.tsx` | 499-603 | drawLabelForModel (hardcoded 40mm length) |
| `src/components/QRLabelPrint.tsx` | 465-494 | Responsive QR/font sizing (frontend mirror) |
| `src/lib/niimbot.ts` | 26-42 | NIIMBOT_MODELS (frontend model specs) |

---

## Dimensional Reference Table (Manufacturer-Verified)

Width = printhead (hardware-fixed). Height = label length (label-stock dependent).
Default heights from NIIMBOT API `default_size`. Max heights from NIIMBOT API `max_size`.

### D-Series ("left" direction, 90° rotation)

| Model | Printhead | DPI | width(px) | Mfr Default Label | Default height(px) | Max height(px) | Our Current |
|-------|-----------|-----|-----------|-------------------|-------------------|----------------|-------------|
| D11-H | 12mm | 300 | 136 | 30x12mm | 354 (30mm) | 2362 (200mm) | 472 (40mm) OK |
| D101  | 24mm | 203 | 192 | 30x25mm | **240 (30mm)** | 799 (100mm) | **180 WRONG** |
| D110  | 12mm | 203 | 96  | 30x12mm | **240 (30mm)** | 799 (100mm) | **96 WRONG** |
| D110_M| 12mm | 203 | 96  | 30x12mm | **240 (30mm)** | 799 (100mm) | **96 WRONG** |

### B-Series ("top" direction, 0° rotation)

| Model | Printhead | DPI | width(px) | Mfr Default Label | Default height(px) | Max height(px) | Our Current |
|-------|-----------|-----|-----------|-------------------|-------------------|----------------|-------------|
| B1     | 48mm | 203 | 384 | 50x30mm | 240 (30mm) | 1598 (200mm) | 240 OK |
| B21    | 48mm | 203 | 384 | 50x30mm | 240 (30mm) | 1598 (200mm) | 240 OK |
| B21_Pro| 50mm | 300 | 591 | 50x30mm | **354 (30mm)** | 2362 (200mm) | **240 (20mm)** |
| B21-C2B| 48mm | 203 | 384 | 50x30mm | 240 (30mm) | 1598 (200mm) | 240 OK |
| M2_H   | 48mm | 300 | 591 | 50x30mm | **354 (30mm)** | 2835 (240mm) | **240 (20mm)** |

### For burner-'s Specific Case (D101 + 25x50mm labels)
- Default fix (30mm): height = 240px (fills 60% of 50mm label - usable)
- Ideal fix (50mm): height = 400px (fills 100% of label - requires user-configurable size)
- Maximum supported: 100mm = 799px

---

## References

- **Issue:** #474 (open)
- **Related:** #471 (testing feedback), #473 (label sizes)
- **Phase 1 Commit:** `115993a` - responsive QR and font sizing
- **B1 Fix Commit:** `d1ab992` - simple row encoding
- **Manufacturer Hardware Ref:** `NIIMBOT/Reference/NIIMBOT_HARDWARE_REFERENCE.md` (from NIIMBOT API)
- **Niimblue Hardware Ref:** https://printers.niim.blue/hardware/models/
- **User Feedback:** burner- comments on #474 (Feb 3, 5, 6 2026)

---

**Next Steps (Prioritized):**

1. **Phase 2A** - Update backend `PRINTER_MODELS` heights to manufacturer defaults:
   - D101: 180 -> 240, D110: 96 -> 240, D110_M: 96 -> 240
   - B21_Pro: 240 -> 354, M2_H: 240 -> 354
   - Update DENSITY_LIMITS: D11_H -> 5, D110_M -> 5
2. **Phase 2B** - Add `defaultLabelLengthMm` to frontend `NIIMBOT_MODELS`, replace hardcoded 40mm
3. **Test & Deploy** - Verify no regression on D11-H, request burner- test on D101
4. **Phase 2C** - Add user-configurable label size (for burner-'s 50mm labels and other non-default sizes)
5. **Phase 2D** - Refine responsive QR sizing for D-series (QR should fill ~80-85% of printhead width)
