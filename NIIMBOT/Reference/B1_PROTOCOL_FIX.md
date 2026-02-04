# B1 Printer Protocol Fix - Verified Against niim.blue

## Problem Identified

The B1 printer uses a **different protocol variant** than the standard V5 protocol we were using. This was discovered by analyzing the successful protocol logs from niim.blue.

### Protocol Differences

**Our Previous V5 Implementation (WRONG for B1):**
- Start Print (0x01): 9-byte payload
- Set Dimension (0x13): 13-byte payload

**Correct B1 Protocol (from niim.blue logs):**
- Start Print (0x01): 7-byte payload `00 01 00 00 00 00 00`
- Set Dimension (0x13): 6-byte payload (width, height, quantity - 2 bytes each)
- Set Label Type (0x23): Required before printing

## Changes Made

Updated `/data/NesVentory/backend/app/niimbot/printer.py` to:

1. **Detect B1 specifically** - Use correct protocol variant
2. **B1-specific payload formats:**
   ```python
   # Start Print: 7 bytes
   sp_payload = b'\x00\x01\x00\x00\x00\x00\x00'

   # Set Page Size: 6 bytes (width, height, quantity)
   sd_payload = struct.pack(">HHH", width, height, 1)
   ```

3. **Keep V5 for other models** - D11-H, D101, D110, D110-M, B21, B21 Pro, B21 C2B, M2-H
4. **Legacy path** for older printers

## Implementation Details

The code now:
1. Calls `set_label_type(1)` for B1 (niim.blue shows: `55 55 23 01 01 23`)
2. Sends B1-specific 7-byte Start Print payload
3. Sends B1-specific 6-byte Set Page Size payload (width, height, qty)
4. Sends image data rows in same format
5. Uses proper handshake sequence: SetDensity → SetLabelType → PrintStart → PageStart → SetPageSize → ImageData

## Testing Steps

### Step 1: Rebuild the backend container

The code changes only affect the backend. You need to rebuild:

```bash
cd /data/NesVentory
# Rebuild the backend image
docker-compose build backend

# Restart the service
docker-compose restart backend
```

Or force a complete rebuild:
```bash
docker-compose down
docker rm -f $(docker ps -aq)  # Remove all containers
docker-compose up -d backend
```

### Step 2: Verify the fix

Once the backend is rebuilt and running, test printing:

1. **Via API:**
   ```bash
   curl -X POST http://localhost:5151/api/printer/test-connection \
     -H "Cookie: access_token=YOUR_TOKEN"
   ```

2. **Via Web UI:**
   - Go to User Settings → NIIMBOT Printer
   - Click "Test Connection"
   - Expected: Connection successful

3. **Print a test label:**
   - Go to any Location
   - Click "Print Label"
   - Expected: Motor runs continuously, label prints and ejects

### Step 3: Expected Behavior Change

**Before Fix:**
- Motor runs for ~1 second then stops
- No output from printer
- Handshake completes but print fails

**After Fix:**
- Motor runs continuously during label printing (~5-10 seconds)
- Label prints successfully with QR code
- Label ejects from printer

## Troubleshooting

### Still No Output?

If the motor still runs for 1 second and stops, possible causes:

1. **Wrong MAC Address**
   - Try the reversed address: `01:08:03:82:81:4D`
   - Or run: `bluetoothctl devices` to find the correct address

2. **Connection Type Still Set to BLE**
   - Verify printer config has `connection_type: "bluetooth_rfcomm"` or `"bluetooth"`
   - If using `"bluetooth"`, ensure auto-detection selects RFCOMM

3. **Image Encoding Issue**
   - Check the QR code is being generated correctly
   - Try printing with different density (1-5)

4. **Heartbeat Interruption**
   - The 1-second motor burst might be from a heartbeat (0xDC) response
   - This suggests handshake is working but print commands aren't

### Check Backend Logs

```bash
# View backend logs
docker logs -f nesventory_backend

# Look for these messages:
# "Using B1 Classic Bluetooth protocol variant"  # Confirms B1 protocol is active
# "RfcommTransport: Connected successfully"      # Confirms RFCOMM connection
# "Successfully connected to printer"             # Confirms 0xC0 handshake
```

### Run Manual Debug Test

```bash
cd /data/NesVentory
python testing/debug_b1_printer.py --address 03:01:08:82:81:4D --try-reversed
```

This will log every packet and show exactly what's being sent/received.

## Protocol Sequence Verification

The successful niim.blue sequence (from your logs):

```
>> SetDensity (0x21)
<< Response (0x31)
>> SetLabelType (0x23)
<< Response (0x33)
>> PrintStart (0x01) - 7 bytes
<< Response (0x02)
>> PageStart (0x03)
<< Response (0x04)
>> SetPageSize (0x13) - 6 bytes
<< Response (0x14)
>> PrintEmptyRow (0x84)
>> PrintBitmapRow (0x85) × N rows
>> PageEnd (0xE3)
<< Response (0xE4)
>> PrintStatus (0xA3) × Multiple queries
<< Status responses (0xB3)
>> PrintEnd (0xF3)
<< Response (0xF4)
```

Your B1 printer should follow this exact sequence with our updated code.

## Success Indicators

✅ Printer connects (RFCOMM socket established)
✅ Handshake succeeds (0xC0 response received)
✅ Set commands execute (SetDensity, SetLabelType response)
✅ Motor runs continuously during print (not just 1 second)
✅ Label ejects with image

## If Still Having Issues

1. **Verify the model is "b1"** in printer configuration
2. **Check for error logs** - `docker logs nesventory_backend | grep -i error`
3. **Test with both MAC addresses** - use `test_b1_addresses.py`
4. **Verify image generation** - check QR code is created correctly
5. **Check density setting** - should be 1-5, default 3

## References

- niim.blue console logs (provided): Shows exact working protocol sequence
- B1 Printer Specs:
  - DPI: 203
  - Printhead: 384 pixels
  - Density: 1-5 (default 3)
  - Paper types: WithGaps, Black, Transparent
