# B1 Printer Debugging Guide

## Problem
- Motor runs for 1 second when attempting to print
- No actual output (label doesn't print)
- Connected via Classic Bluetooth RFCOMM (not BLE)

## Key Finding
You mentioned that niim.blue successfully used the reversed MAC address `01:08:03:82:81:4D` instead of the one we've been using `03:01:08:82:81:4D`. This is a crucial clue that suggests the address order might be significant.

## Testing Steps

### Step 1: Quick Address Test (Recommended First)

Run the address test script to identify which MAC address works:

```bash
cd /data/NesVentory
python testing/test_b1_addresses.py
```

This will test:
- **Normal address**: `03:01:08:82:81:4D` (currently configured)
- **Reversed address**: `01:08:03:82:81:4D` (niim.blue used this)

**Expected output**: One of the addresses will show "SUCCESS" if it works.

### Step 2: If Reversed Address Works

If the reversed address works:

1. Update the printer configuration to use `01:08:03:82:81:4D`
2. You can do this via the API or through the UI settings
3. Test printing again

### Step 3: Detailed Protocol Debug (If Simple Test Doesn't Work)

If the simple address test doesn't work, run the detailed debug script:

```bash
python testing/debug_b1_printer.py --address 03:01:08:82:81:4D
```

This will:
- Log every packet sent and received
- Show the full protocol sequence
- Help identify where communication breaks down

Add `--try-reversed` flag to automatically test the reversed address if the first fails:

```bash
python testing/debug_b1_printer.py --address 03:01:08:82:81:4D --try-reversed
```

## Understanding the Protocol

For the B1 printer, the expected communication sequence should be:

1. **Handshake** (0xC0): Device responds with connection confirmation
2. **Set Density** (0x21): Configure print density
3. **Start Print** (0x01): Initiate print job
4. **Start Page** (0x03): Start printing a page
5. **V5 Protocol Packets**:
   - Start Print (0x01) with 9-byte payload
   - Set Dimension (0x13) with 13-byte payload
   - Image Data (0x85) - one packet per row
6. **End Page** (0xE3): Finish page
7. **End Print** (0xF3): Complete print job

If the motor runs for 1 second, it suggests packets are being received, but the image data or final command might not be correct.

## Common Issues and Solutions

### Issue: "Connection timeout" or "Connection refused"
- **Cause**: Wrong MAC address or device not in range
- **Solution**:
  - Verify device is powered on
  - Check: `bluetoothctl devices` to list paired devices
  - Try the reversed address

### Issue: Connection succeeds but motor doesn't run
- **Cause**: Handshake or protocol issue
- **Solution**:
  - Check debug output for 0xC0 response
  - Verify density and start commands are returning success

### Issue: Motor runs but nothing prints
- **Cause**: Image data format or V5 protocol issue
- **Solution**:
  - Check debug logs for all packets being sent
  - Verify image dimensions match printer specs
  - For B1: use V5 protocol (should be automatic)

## B1 Printer Specifications

From niim.blue database:
- **DPI**: 203
- **Printhead**: 384 pixels
- **Density**: 1-5 (default 3, max 5)
- **Protocol**: V5 (protocolVersion: 3)
- **Paper Types**: With Gaps, Black, Transparent

## Next Steps

1. **Run the address test** - this is the quickest way to identify the issue
2. **If reversed address works**: Update configuration and test printing
3. **If it doesn't work**: Run debug script to see what packets are being exchanged
4. **Share the debug output**: If you need further help, the detailed logs will help identify the exact issue

## References

The implementation references these GitHub repositories:
- https://github.com/MultiMote/niimbluelib - BLE protocol reference
- https://github.com/MultiMote/niimblue - Web interface for printer configuration

The B1 printer uses Classic Bluetooth RFCOMM (Serial Port Profile), not BLE like most modern NIImbot printers.
