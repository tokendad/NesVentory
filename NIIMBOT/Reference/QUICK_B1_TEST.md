# Quick B1 Test - Motor Runs But No Print Output

## The Issue
- Motor runs for 1 second when printing
- No label output
- You mentioned niim.blue successfully used: `01:08:03:82:81:4D` instead of `03:01:08:82:81:4D`

## Quick Fix to Try First

Since you discovered that niim.blue uses the reversed address, **try updating the printer configuration to use the reversed MAC address**:

### Via API
```bash
# Update printer config with reversed address
curl -X PUT http://localhost:5151/api/printer/config \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{
    "enabled": true,
    "model": "b1",
    "connection_type": "bluetooth",
    "bluetooth_type": "auto",
    "address": "01:08:03:82:81:4D",
    "density": 3
  }'
```

### Via Web UI
1. Go to **User Settings** → **NIIMBOT Printer**
2. Change the **Bluetooth Address** from `03:01:08:82:81:4D` to `01:08:03:82:81:4D`
3. Click **Save**
4. Test printing

## If That Doesn't Work

Run the automated address tester:

```bash
cd /data/NesVentory
python testing/test_b1_addresses.py
```

This will automatically test both addresses and tell you which one works.

## Expected Motor Behavior

**Current (Broken)**: Motor runs for ~1 second, then stops (no output)

**Expected (Fixed)**: Motor should run for several seconds while the label is being printed

## Why the Address Difference?

The B1 appears to advertise its Bluetooth address in a way that creates byte-order ambiguity:
- What's reported as: `03:01:08:82:81:4D`
- What actually works: `01:08:03:82:81:4D`

This could be due to how the B1's Bluetooth chipset advertises itself, or how bluetoothctl reports it. Different systems may interpret the bytes differently.

## After You Fix It

Once printing works:
1. The motor should run continuously while printing
2. A label should be ejected from the printer
3. The label should contain the QR code
4. No further motor movement after printing completes

## Need More Help?

If the reversed address doesn't work, run the detailed debug script:

```bash
python testing/debug_b1_printer.py --address 01:08:03:82:81:4D --try-reversed
```

This will show every packet being sent/received and help identify exactly where the communication breaks down.
