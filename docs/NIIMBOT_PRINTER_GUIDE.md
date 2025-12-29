# NIIMBOT Printer Support

## Overview

NesVentory now supports direct printing to NIIMBOT label printers for QR code labels. This feature allows you to print labels with location names and QR codes directly from the application without using the browser print dialog.

## Supported Printers

- **Niimbot B1** (max width: 384px)
- **Niimbot B18** (max width: 384px)
- **Niimbot B21** (max width: 384px)
- **Niimbot D11** (max width: 96px)
- **Niimbot D110** (max width: 96px)

## Setup Instructions

### 1. Connect Your Printer

**USB Connection (Recommended):**
- Connect your NIIMBOT printer via USB
- The system will auto-detect the serial port
- On Linux: typically `/dev/ttyACM0` or `/dev/ttyUSB0`
- On Windows: typically `COM3`, `COM4`, etc.

**Bluetooth Connection:**
- Pair your printer with your computer via Bluetooth
- Note the MAC address (e.g., `AA:BB:CC:DD:EE:FF`)
- Make sure you're connected to the correct Bluetooth address (see note below)

> **Note for Bluetooth:** NIIMBOT printers may have two Bluetooth addresses. Only one will work for printing. Use `bluetoothctl info <address>` to check - the correct address will show `UUID: Serial Port`.

### 2. Configure in User Settings

1. Click on your profile icon and select **User Settings**
2. Navigate to the **🖨️ Printer** tab
3. Check **Enable NIIMBOT Printer**
4. Select your **Printer Model** from the dropdown
5. Choose your **Connection Type** (USB or Bluetooth)
6. If using Bluetooth, enter the **MAC Address**
7. If using USB and auto-detection doesn't work, specify the serial port
8. Adjust **Print Density** (1-5, higher = darker)
9. Click **Test Connection** to verify setup
10. Click **Save Configuration**

### 3. Print Labels

1. Navigate to a location (or container)
2. Click the **Print Label: QR Code** option
3. Configure label options (size, holiday icon, etc.)
4. You'll see two print buttons:
   - **🖨️ Print to NIIMBOT** - Prints directly to your configured printer
   - **🖨️ Browser Print** - Opens browser print dialog for other printers

## Label Format

NIIMBOT labels include:
- **QR Code** - Links to the location page in NesVentory
- **Location Name** - Display name or location name
- **[BOX] Badge** - Shows if the location is a container

## Configuration Options

### Print Density
- Range: 1-5 (some models only support 1-3)
- Higher values produce darker prints
- Default: 3 (good for most labels)

### Connection Types

**USB (Recommended):**
- More reliable connection
- Faster printing
- Auto-detection available
- No pairing required

**Bluetooth:**
- Wireless printing
- Requires MAC address
- May need specific Bluetooth profile
- Slightly slower than USB

## Troubleshooting

### Connection Test Fails

**USB:**
- Verify the printer is connected and powered on
- Check if the correct port is specified
- On Linux, ensure your user has permission to access serial ports (add to `dialout` group)
- Try unplugging and reconnecting the printer

**Bluetooth:**
- Ensure the printer is paired with your computer
- Verify you're using the correct MAC address
- Check Bluetooth connection status
- Try disconnecting and reconnecting Bluetooth

### Print Quality Issues

- Adjust print density (try values 3-5)
- Ensure you're using the correct label size
- Check if labels are loaded correctly in the printer
- Verify the printer model is set correctly

### Label Not Printing

- Test the connection first using **Test Connection** button
- Verify the printer has labels loaded
- Check printer battery level (for battery-powered models)
- Ensure the printer is not in sleep mode
- Try restarting the printer

## Environment Configuration

For production deployments, set the application URL in your environment:

```bash
APP_URL=https://your-nesventory-domain.com
```

This ensures QR codes point to the correct URL.

## Technical Details

The NIIMBOT printer integration uses:
- **Backend:** FastAPI endpoints at `/api/printer/`
- **Library:** niimprint (Python library for NIIMBOT printers)
- **Communication:** Serial (USB) or Bluetooth RFCOMM
- **Resolution:** 8 pixels per mm (~203 dpi)

## API Endpoints

- `GET /api/printer/config` - Get printer configuration
- `PUT /api/printer/config` - Update printer configuration  
- `POST /api/printer/print-label` - Print a QR label
- `POST /api/printer/test-connection` - Test printer connection
- `GET /api/printer/models` - List supported printer models

## Requirements

### Backend Dependencies
- pillow >= 10.3.0 (for image processing)
- pyserial == 3.5 (for USB communication)
- qrcode == 7.4.2 (for QR code generation)
- click == 8.1.7 (for CLI support)

### System Requirements
- USB port (for USB connection) or Bluetooth adapter (for Bluetooth)
- Appropriate drivers (usually auto-installed on modern systems)
- For Linux: User must have permissions to access serial ports

## Credits

NIIMBOT printer support is based on:
- [niimprint](https://github.com/AndBondStyle/niimprint) by AndBondStyle
- [NiimPrintX](https://github.com/labbots/NiimPrintX)
- [niimbot-d110-api](https://github.com/datumbrain/niimbot-d110-api)
