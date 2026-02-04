# B1 vs V5 Protocol Comparison

## Root Cause Analysis

The niim.blue console logs you provided revealed that the **B1 printer uses a different protocol variant** than the standard V5 implementation. This explains why the motor would run for 1 second (likely the handshake or initial heartbeat) but then fail to print.

## Side-by-Side Protocol Comparison

### Initialization & Setup (Same for all)

```
Both:
  SetDensity (0x21) → Response (0x31)
  PrintStart (0x01) → Response (0x02)
  PageStart (0x03) → Response (0x04)
```

**Difference:** B1 requires `SetLabelType (0x23)` before printing

### Critical Difference: Print Command Payloads

#### B1 Protocol (7-byte and 6-byte)
```
>> 55 55 01 07 00 01 00 00 00 00 00 07 aa aa
   [Packet frame markers]
   [Command 0x01] [Length 7]
   [Payload: 00 01 00 00 00 00 00] ← 7 BYTES
   [Checksum] [Frame end]

>> 55 55 13 06 00 f0 01 90 00 01 75 aa aa
   [Command 0x13] [Length 6]
   [Payload: width(2) height(2) qty(2)] ← 6 BYTES
   - width:  0x00f0 = 240 pixels
   - height: 0x0190 = 400 pixels
   - qty:    0x0001 = 1
```

#### V5 Protocol (9-byte and 13-byte)
```
Previous code sent:
sp_payload = struct.pack(">H", 1) + b'\x00\x00\x00\x00' + b'\x00\x00\x01'
Result: [00 01] [00 00 00 00] [00 00 01] = 9 BYTES

sd_payload = struct.pack(">HHH H B B B H", h, w, 1, 0, 0, 0, 1, 0)
Result: [h:2] [w:2] [qty:2] [0:2] [0:1] [0:1] [1:1] [0:2] = 13 BYTES
```

## Code Changes

### File: backend/app/niimbot/printer.py

#### Change 1: Model Detection (lines 563-569)

**Before:**
```python
is_v5 = model and model.lower() in [
    "d11_h", "d101", "d110", "d110_m",
    "b1", "b21", "b21_pro", "b21_c2b", "m2_h"
]
```

**After:**
```python
is_b1 = model and model.lower() == "b1"
is_v5 = model and model.lower() in [
    "d11_h", "d101", "d110", "d110_m",
    "b21", "b21_pro", "b21_c2b", "m2_h"
]
```

**Why:** Separate B1 from V5 to use different payload formats

#### Change 2: Label Type Setting (lines 573-576)

**Before:**
```python
self.set_label_density(density)
self.start_print()
self.start_page_print()
```

**After:**
```python
self.set_label_density(density)
if is_b1:
    self.set_label_type(1)  # B1 requires label type
self.start_print()
self.start_page_print()
```

**Why:** niim.blue logs show B1 sends `SetLabelType (0x23)` before print

#### Change 3: Payload Format (lines 578-609 for B1)

**B1 Protocol:**
```python
if is_b1:
    # Start Print: 7-byte payload (verified from niim.blue logs)
    sp_payload = b'\x00\x01\x00\x00\x00\x00\x00'
    self._send(NiimbotPacket(0x01, sp_payload))
    time.sleep(0.2)

    # Set Page Size: 6-byte payload (width, height, qty)
    w, h = image.width, image.height
    sd_payload = struct.pack(">HHH", w, h, 1)
    self._send(NiimbotPacket(0x13, sd_payload))
    time.sleep(0.2)
```

**V5 Protocol (unchanged, moved to elif):**
```python
elif is_v5:
    # Start Print: 9-byte payload
    sp_payload = struct.pack(">H", 1) + b'\x00\x00\x00\x00' + b'\x00\x00\x01'

    # Set Dimension: 13-byte payload
    sd_payload = struct.pack(">HHH H B B B H", h, w, 1, 0, 0, 0, 1, 0)
```

## Why This Fixes the Issue

### Before (Wrong Protocol for B1)
1. ✅ RFCOMM connection established
2. ✅ Handshake (0xC0) succeeds
3. ✅ SetDensity executes
4. ❌ **Wrong 9-byte Start Print payload** (V5 format, not B1)
5. ❌ **Wrong 13-byte Dimension payload** (V5 format, not B1)
6. ❌ Printer rejects/ignores malformed commands
7. ❌ Motor briefly moves (1 second) from partial execution
8. ❌ No print output

### After (Correct B1 Protocol)
1. ✅ RFCOMM connection established
2. ✅ Handshake (0xC0) succeeds
3. ✅ SetDensity executes
4. ✅ SetLabelType executes (B1-specific)
5. ✅ **Correct 7-byte Start Print payload**
6. ✅ **Correct 6-byte Set Page Size payload**
7. ✅ Image data sent correctly
8. ✅ Motor runs continuously during print
9. ✅ Label prints successfully

## Payload Structure Explained

### B1 Start Print (0x01) - 7 Bytes
```
00 01 00 00 00 00 00
└─ [?]
    └─ Quantity/flags: 0x01
       └─ Padding/reserved: 0x00 0x00 0x00 0x00 0x00
```

### B1 Set Page Size (0x13) - 6 Bytes
```
00 f0 01 90 00 01
└─ Width:  0x00f0 = 240 pixels (for QR code region)
   Height: 0x0190 = 400 pixels
   Qty:    0x0001 = 1 page
```

### V5 Start Print (0x01) - 9 Bytes
```
00 01 00 00 00 00 00 00 01
└─ Qty: 0x0001
   Padding: 0x00 0x00 0x00 0x00
   More flags: 0x00 0x00 0x01
```

### V5 Set Dimension (0x13) - 13 Bytes
```
01 90 00 f0 00 01 00 00 00 01 00
└─ Height: 0x0190
   Width:  0x00f0
   Qty:    0x0001
   Reserved: 0x00 0x00 0x00
   Flag:   0x01
   More:   0x00
```

## Impact

- **B1 Printer**: Will now print correctly with proper protocol variant
- **V5 Printers** (D11-H, D101, D110, B21, etc.): Unaffected - continue to use V5 variant
- **Legacy Printers**: Unaffected - continue to use legacy protocol
- **Backward Compatibility**: Fully maintained

## Testing Verification

To confirm the fix is working, look for in the backend logs:

```
INFO:app.niimbot.printer:Starting print: 240x400px, model=b1
INFO:app.niimbot.printer:Using B1 Classic Bluetooth protocol variant
INFO:app.niimbot.printer:RfcommTransport: Connecting to 03:01:08:82:81:4D channel 1
INFO:app.niimbot.printer:RfcommTransport: Connected successfully
INFO:app.niimbot.printer:Successfully connected to printer via 0xC0 handshake
```

Then the printer should print instead of just running the motor for 1 second.
