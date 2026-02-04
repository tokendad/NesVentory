# Niimbot B1 Bluetooth Test Print Script

A Node.js script to print test labels with QR codes to a Niimbot B1 printer via Bluetooth.

## Prerequisites

### System Requirements

Your server needs:

1. **Node.js 18+** 
2. **Bluetooth adapter** (USB dongle or built-in)
3. **Build tools** for native modules

### Linux Setup (Ubuntu/Debian)

```bash
# Install Bluetooth and build dependencies
sudo apt-get update
sudo apt-get install -y bluetooth bluez libbluetooth-dev libudev-dev build-essential

# Make sure Bluetooth service is running
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Give your user Bluetooth permissions (logout/login required after this)
sudo usermod -a -G bluetooth $USER

# Or run the script with sudo if permissions are an issue
```

### Check Bluetooth is working

```bash
# Check if Bluetooth adapter is detected
hciconfig

# Should show something like:
# hci0:   Type: Primary  Bus: USB
#         BD Address: XX:XX:XX:XX:XX:XX  ACL MTU: 1021:8  SCO MTU: 64:1
#         UP RUNNING

# If DOWN, bring it up:
sudo hciconfig hci0 up
```

## Installation

```bash
# Clone or copy this directory to your server
cd niimbot-test

# Install dependencies
npm install

# If noble fails to build, you may need:
npm rebuild @abandonware/noble
```

## Usage

### Step 1: Scan for your printer

First, turn on your Niimbot B1 printer, then scan for it:

```bash
node print-test.mjs scan
```

This will output something like:
```
✅ Found 1 device(s):

┌─────────────────────────────────┬───────────────────────┐
│ Device Name                     │ Address               │
├─────────────────────────────────┼───────────────────────┤
│ B1-ABCD1234                     │ 27:03:07:17:6e:82     │
└─────────────────────────────────┴───────────────────────┘
```

### Step 2: Print a test label

Use either the device name or MAC address:

```bash
# Using device name (recommended for macOS)
node print-test.mjs print "B1-ABCD1234"

# Using MAC address (recommended for Linux)
node print-test.mjs print "27:03:07:17:6e:82"

# With custom QR code content
node print-test.mjs print "27:03:07:17:6e:82" --text "https://example.com"

# With custom label text below QR code
node print-test.mjs print "27:03:07:17:6e:82" --text "https://example.com" --label "Scan Me!"
```

## Configuration

Edit the `CONFIG` object in `print-test.mjs` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `labelWidth` | 384 | Label width in pixels |
| `labelHeight` | 240 | Label height in pixels |
| `density` | 3 | Print darkness (1-5) |
| `quantity` | 1 | Number of copies |
| `labelType` | 1 | 1=with gaps, 2=continuous |
| `threshold` | 128 | B/W threshold (0-255) |
| `printDirection` | 'top' | 'top' or 'left' |
| `printTask` | 'B1' | Printer type |

### Common Label Sizes for B1

| Label Size | Pixels (203 DPI) |
|------------|------------------|
| 50x30mm | 384x240 |
| 40x30mm | 315x240 |
| 30x20mm | 240x160 |

## Troubleshooting

### "No Niimbot printers found"

1. Make sure printer is ON and not connected to another device
2. Check Bluetooth is enabled: `hciconfig`
3. Bring up Bluetooth if needed: `sudo hciconfig hci0 up`
4. Try running with sudo: `sudo node print-test.mjs scan`

### "noble" related errors

```bash
# Rebuild native modules
npm rebuild @abandonware/noble

# On Linux, you may need additional permissions
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

### Connection timeouts

- Move printer closer to Bluetooth dongle
- Make sure printer isn't connected to phone app
- Try power cycling the printer

### Print quality issues

- Adjust `density` (1-5, higher = darker)
- Adjust `threshold` (lower = more black pixels)
- Make sure label size matches actual labels

## Running as a Service

If you want to run this automatically, you can create a systemd service:

```bash
# /etc/systemd/system/niimbot-print.service
[Unit]
Description=Niimbot Print Service
After=bluetooth.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/niimbot-test
ExecStart=/usr/bin/node print-test.mjs print "YOUR-PRINTER-ADDRESS"
Restart=no

[Install]
WantedBy=multi-user.target
```

## License

MIT - Based on the excellent [niimblue](https://github.com/MultiMote/niimblue) project.
