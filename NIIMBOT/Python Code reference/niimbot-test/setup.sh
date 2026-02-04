#!/bin/bash
# setup.sh - Setup script for Niimbot B1 Bluetooth printing on Linux

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Niimbot B1 Bluetooth Setup Script                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root for system package installation
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Note: Some commands may need sudo. Run with sudo if you get permission errors."
  echo ""
fi

# Detect package manager
if command -v apt-get &> /dev/null; then
  PKG_MGR="apt-get"
  INSTALL_CMD="apt-get install -y"
elif command -v dnf &> /dev/null; then
  PKG_MGR="dnf"
  INSTALL_CMD="dnf install -y"
elif command -v yum &> /dev/null; then
  PKG_MGR="yum"
  INSTALL_CMD="yum install -y"
else
  echo "❌ Could not detect package manager. Please install dependencies manually:"
  echo "   bluetooth bluez libbluetooth-dev libudev-dev build-essential"
  exit 1
fi

echo "📦 Step 1: Installing system dependencies..."
echo "   Package manager: $PKG_MGR"
echo ""

if [ "$PKG_MGR" = "apt-get" ]; then
  sudo apt-get update
  sudo $INSTALL_CMD bluetooth bluez libbluetooth-dev libudev-dev build-essential
elif [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
  sudo $INSTALL_CMD bluez bluez-libs-devel systemd-devel gcc-c++ make
fi

echo ""
echo "🔵 Step 2: Configuring Bluetooth..."

# Start Bluetooth service
sudo systemctl start bluetooth 2>/dev/null || true
sudo systemctl enable bluetooth 2>/dev/null || true

# Check Bluetooth adapter
echo "   Checking Bluetooth adapter..."
if hciconfig 2>/dev/null | grep -q "hci0"; then
  echo "   ✅ Bluetooth adapter found"
  
  # Bring it up if it's down
  if hciconfig 2>/dev/null | grep -q "DOWN"; then
    echo "   ⬆️  Bringing Bluetooth adapter up..."
    sudo hciconfig hci0 up
  fi
else
  echo "   ⚠️  No Bluetooth adapter found. Make sure your USB dongle is connected."
fi

echo ""
echo "📦 Step 3: Installing Node.js dependencies..."
npm install

echo ""
echo "🔑 Step 4: Setting up permissions..."

# Try to set capabilities on node to avoid needing sudo
NODE_PATH=$(which node)
if [ -n "$NODE_PATH" ]; then
  echo "   Setting raw socket capability on node..."
  sudo setcap cap_net_raw+eip "$NODE_PATH" 2>/dev/null || {
    echo "   ⚠️  Could not set capabilities. You may need to run with sudo."
  }
fi

# Add user to bluetooth group
CURRENT_USER=${SUDO_USER:-$USER}
if groups "$CURRENT_USER" 2>/dev/null | grep -q bluetooth; then
  echo "   ✅ User already in bluetooth group"
else
  echo "   Adding $CURRENT_USER to bluetooth group..."
  sudo usermod -a -G bluetooth "$CURRENT_USER" 2>/dev/null || true
  echo "   ⚠️  You may need to log out and back in for group changes to take effect"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Turn on your Niimbot B1 printer"
echo "  2. Run: node print-test.mjs scan"
echo "  3. Run: node print-test.mjs print \"<address>\""
echo ""
echo "If scan doesn't find your printer, try:"
echo "  sudo node print-test.mjs scan"
echo ""
