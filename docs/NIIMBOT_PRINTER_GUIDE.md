# NIIMBOT Printer Support

## Overview

NesVentory supports high-resolution printing to NIIMBOT label printers. This integration is specifically optimized for the **Niimbot D11-H** (300 DPI) using **12x40mm** labels.

## Supported Models

- **Niimbot D11-H** (300 DPI)
- **Label Size:** 12x40mm (Standard)

*Note: Support for additional models (B21, D110, etc.) and custom label sizes is planned for future updates.*

## Connection Methods

NesVentory offers two ways to connect your printer:

### 1. Server-Side Printing (Recommended) 🖨️
The printer is connected directly to the server running NesVentory. This is the most reliable method and works from any device, including **mobile phones**.

- **Server Bluetooth:** The server connects to the printer via its own Bluetooth adapter.
- **Server USB:** The printer is plugged into a USB port on the server.

### 2. Direct USB Printing (Web API) 🔌
The printer is plugged into your local computer (Desktop/Laptop).
- Requires a browser with **Web Serial** support (Chrome, Edge, or Opera).
- Not supported on mobile devices.

---

## Setup Instructions (Server-Side)

### 1. Connect to Server

**USB:**
- Plug the printer into the server.
- The system will attempt to auto-detect the port (e.g., `/dev/ttyACM0` on Linux).

**Bluetooth:**
- Pair the printer with your server's OS.
- Find the MAC address (e.g., `AA:BB:CC:DD:EE:FF`).
- **Linux Tip:** If the connection times out, try running `bluetoothctl disconnect <MAC>` to clear any stale sessions.

### 2. Configure in User Settings

1. Click on your profile icon and select **User Settings**.
2. Navigate to the **🖨️ Printer** tab.
3. Check **Enable NIIMBOT Printer**.
4. Set **Printer Model** to `Niimbot D11-H (300dpi)`.
5. Choose **Connection Type**: `USB` or `Bluetooth`.
6. For Bluetooth, enter the **MAC Address**.
7. Click **Test Connection** to verify.
8. Click **Save Configuration**.

### 3. Print Labels

1. Navigate to a location.
2. Click **Print Label**.
3. Select **Connection Method**: `Server Printer (Recommended)`.
4. Click **Send to Server**.

---

## Troubleshooting

### "BLE connection timed out" or "Device not found"
1. **Restart Bluetooth:** On the server, run `service bluetooth restart`.
2. **Clear Stale Connection:** Run `bluetoothctl disconnect <MAC>`. NIIMBOT printers often only support one active connection at a time.
3. **Power:** Ensure the printer is turned on and not in sleep mode.

### Blank Labels
- Ensure the labels are loaded correctly (thermal side facing the print head).
- Verify you are using **12x40mm** labels.
- Check that **Printer Model** is set to `D11-H` in settings.

### Permissions (Linux)
- The user running NesVentory must be in the `dialout` and `lp` groups to access USB/Bluetooth hardware.
- If using Docker, ensure the container is running in `privileged` mode with `/dev` and `/var/run/dbus` mounted (this is standard in the provided `docker-compose.yml`).

---

## Technical Details

- **Protocol:** NIIMBOT V5 Protocol (Optimized "Magic Sequence").
- **Resolution:** 300 DPI (136px x 472px for 12x40mm).
- **Backend:** Custom driver located in `backend/app/niimbot/`.
- **API:** Standardized REST endpoints at `/api/printer/`.

## Credits

Based on reverse-engineering of the Niimbot protocol and inspired by:
- [niimblue](https://github.com/kallanreed/niimblue)
- [hass-niimbot](https://github.com/custom-components/niimbot)