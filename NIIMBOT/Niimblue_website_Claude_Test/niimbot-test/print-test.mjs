#!/usr/bin/env node
/**
 * Niimbot B1 Test Print Script
 * 
 * This script connects to a Niimbot B1 printer via Bluetooth and prints a test
 * label with a QR code.
 * 
 * Usage:
 *   node print-test.mjs scan              - Scan for nearby Niimbot printers
 *   node print-test.mjs print <address>   - Print test label to specified printer
 *   node print-test.mjs print <address> --text "Custom text"
 * 
 * Example:
 *   node print-test.mjs scan
 *   node print-test.mjs print "B1-ABCD1234"
 *   node print-test.mjs print "27:03:07:17:6e:82" --text "https://example.com"
 */

import { NiimbotHeadlessBleClient, ImageEncoder, initClient, printImage } from '@mmote/niimblue-node';
import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Configuration - adjust these for your B1 printer and label size
const CONFIG = {
  // B1 label dimensions (in pixels) - adjust for your label size
  // Common B1 label sizes:
  // 50x30mm (384x240 @ 203dpi)
  // 40x30mm (315x240 @ 203dpi)  
  labelWidth: 384,
  labelHeight: 240,
  
  // Print settings
  density: 3,        // 1-5, higher = darker
  quantity: 1,       // Number of copies
  labelType: 1,      // 1 = with gaps, 2 = continuous
  threshold: 128,    // Black/white threshold (0-255)
  
  // Print direction: 'top' or 'left' - B1 typically uses 'top'
  printDirection: 'top',
  
  // Print task - 'B1' for B1 printer
  printTask: 'B1',
  
  // Scan timeout in ms
  scanTimeout: 10000,
};

/**
 * Scan for nearby Niimbot printers via Bluetooth
 */
async function scanForPrinters() {
  console.log('🔍 Scanning for Niimbot printers via Bluetooth...');
  console.log(`   (Timeout: ${CONFIG.scanTimeout / 1000} seconds)\n`);
  
  try {
    const devices = await NiimbotHeadlessBleClient.scan(CONFIG.scanTimeout);
    
    if (devices.length === 0) {
      console.log('❌ No Niimbot printers found.');
      console.log('\nTroubleshooting:');
      console.log('  - Make sure the printer is powered on');
      console.log('  - Ensure Bluetooth is enabled on your server');
      console.log('  - Check that the printer is not connected to another device');
      console.log('  - Try moving the printer closer to the Bluetooth dongle');
      return;
    }
    
    console.log(`✅ Found ${devices.length} device(s):\n`);
    console.log('┌─────────────────────────────────┬───────────────────────┐');
    console.log('│ Device Name                     │ Address               │');
    console.log('├─────────────────────────────────┼───────────────────────┤');
    
    for (const device of devices) {
      const name = (device.name || 'Unknown').padEnd(31);
      const addr = device.address.padEnd(21);
      console.log(`│ ${name} │ ${addr} │`);
    }
    
    console.log('└─────────────────────────────────┴───────────────────────┘');
    console.log('\nTo print a test label, run:');
    console.log(`  node print-test.mjs print "${devices[0].address}"\n`);
    
  } catch (error) {
    console.error('❌ Error scanning for devices:', error.message);
    
    if (error.message.includes('noble')) {
      console.log('\n⚠️  Bluetooth library (noble) may not be properly installed.');
      console.log('   Try: npm rebuild @abandonware/noble');
    }
  }
}

/**
 * Generate a QR code image
 */
async function generateQRCode(text, size = 200) {
  console.log(`📱 Generating QR code for: "${text}"`);
  
  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(text, {
    type: 'png',
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  });
  
  return qrBuffer;
}

/**
 * Create a label image with QR code and text
 */
async function createLabelImage(qrText, labelText) {
  const { labelWidth, labelHeight } = CONFIG;
  
  // Generate QR code
  const qrSize = Math.min(labelWidth, labelHeight) - 40; // Leave some margin
  const qrBuffer = await generateQRCode(qrText, qrSize);
  
  // Create the label with white background
  const labelImage = sharp({
    create: {
      width: labelWidth,
      height: labelHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  });
  
  // Calculate positions
  const qrX = Math.floor((labelWidth - qrSize) / 2);
  const qrY = 10;
  
  // Resize QR code to fit
  const resizedQR = await sharp(qrBuffer)
    .resize(qrSize, qrSize, { fit: 'contain', background: '#FFFFFF' })
    .toBuffer();
  
  // Create text label if provided
  let composites = [
    { input: resizedQR, left: qrX, top: qrY }
  ];
  
  if (labelText) {
    // Create a simple text overlay using SVG
    const textY = qrY + qrSize + 10;
    const textHeight = labelHeight - textY - 5;
    
    const svgText = `
      <svg width="${labelWidth}" height="${textHeight}">
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              font-family="Arial, sans-serif" font-size="14" fill="black">
          ${escapeXml(labelText)}
        </text>
      </svg>
    `;
    
    const textBuffer = Buffer.from(svgText);
    composites.push({ input: textBuffer, left: 0, top: textY });
  }
  
  // Composite everything together
  const finalImage = await labelImage
    .composite(composites)
    .png()
    .toBuffer();
  
  return finalImage;
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Print a label to the Niimbot B1 printer
 */
async function printLabel(address, qrText, labelText) {
  console.log('\n🖨️  Niimbot B1 Test Print');
  console.log('═'.repeat(50));
  console.log(`   Printer Address: ${address}`);
  console.log(`   QR Content: ${qrText}`);
  console.log(`   Label Size: ${CONFIG.labelWidth}x${CONFIG.labelHeight}px`);
  console.log(`   Density: ${CONFIG.density}`);
  console.log('═'.repeat(50));
  
  try {
    // Step 1: Generate the label image
    console.log('\n📝 Step 1: Creating label image...');
    const labelBuffer = await createLabelImage(qrText, labelText);
    
    // Save preview image
    const previewPath = path.join(process.cwd(), 'label-preview.png');
    fs.writeFileSync(previewPath, labelBuffer);
    console.log(`   ✅ Preview saved to: ${previewPath}`);
    
    // Step 2: Initialize the client
    console.log('\n🔌 Step 2: Connecting to printer...');
    const client = initClient('ble', address, true); // true = debug mode
    
    // Step 3: Connect
    await client.connect();
    console.log('   ✅ Connected to printer');
    
    // Get printer info
    const printerInfo = client.getPrinterInfo();
    console.log(`   📋 Printer Model: ${printerInfo?.modelId || 'Unknown'}`);
    console.log(`   📋 Firmware: ${printerInfo?.softwareVersion || 'Unknown'}`);
    
    // Step 4: Prepare the image for printing
    console.log('\n🔄 Step 3: Processing image...');
    let image = sharp(labelBuffer)
      .flatten({ background: '#fff' })
      .threshold(CONFIG.threshold);
    
    // Resize if needed
    image = image.resize(CONFIG.labelWidth, CONFIG.labelHeight, {
      kernel: sharp.kernel.nearest,
      fit: 'contain',
      position: 'centre',
      background: '#fff',
    });
    
    // Step 5: Encode the image
    console.log('\n📦 Step 4: Encoding image for printer...');
    const encoded = await ImageEncoder.encodeImage(image, CONFIG.printDirection);
    console.log(`   ✅ Encoded ${encoded.cols}x${encoded.rows} pixels`);
    
    // Step 6: Print
    console.log('\n🖨️  Step 5: Printing...');
    await printImage(client, CONFIG.printTask, encoded, {
      quantity: CONFIG.quantity,
      labelType: CONFIG.labelType,
      density: CONFIG.density,
    });
    
    console.log('\n✅ Print job completed successfully!');
    
    // Step 7: Disconnect
    await client.disconnect();
    console.log('🔌 Disconnected from printer\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('not found')) {
      console.log('\n⚠️  Printer not found. Try running scan first:');
      console.log('   node print-test.mjs scan');
    } else if (error.message.includes('timeout')) {
      console.log('\n⚠️  Connection timeout. Make sure the printer is:');
      console.log('   - Powered on');
      console.log('   - Not connected to another device');
      console.log('   - Within Bluetooth range');
    }
    
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Niimbot B1 Test Print Script
════════════════════════════

Usage:
  node print-test.mjs scan                         Scan for Niimbot printers
  node print-test.mjs print <address>              Print test QR code
  node print-test.mjs print <address> --text "X"   Print with custom QR content

Examples:
  node print-test.mjs scan
  node print-test.mjs print "B1-ABCD1234"
  node print-test.mjs print "27:03:07:17:6e:82" --text "https://mysite.com"

Options:
  --text, -t    Text/URL to encode in QR code (default: "Hello from Niimbot!")
  --label, -l   Text to display below QR code (optional)

Configuration (edit script to change):
  Label Size:   ${CONFIG.labelWidth}x${CONFIG.labelHeight}px
  Density:      ${CONFIG.density}/5
  Print Task:   ${CONFIG.printTask}
  Direction:    ${CONFIG.printDirection}
`);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }
  
  const command = args[0];
  const options = {
    address: null,
    qrText: 'Hello from Niimbot!',
    labelText: 'Test Print',
  };
  
  if (command === 'scan') {
    return { command: 'scan', options };
  }
  
  if (command === 'print') {
    if (!args[1]) {
      console.error('❌ Error: Printer address required for print command');
      console.log('   Run "node print-test.mjs scan" to find your printer\n');
      process.exit(1);
    }
    
    options.address = args[1];
    
    // Parse optional arguments
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--text' || args[i] === '-t') {
        options.qrText = args[++i] || options.qrText;
      } else if (args[i] === '--label' || args[i] === '-l') {
        options.labelText = args[++i] || options.labelText;
      }
    }
    
    return { command: 'print', options };
  }
  
  if (command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }
  
  console.error(`❌ Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

// Main entry point
async function main() {
  const { command, options } = parseArgs();
  
  if (command === 'scan') {
    await scanForPrinters();
  } else if (command === 'print') {
    await printLabel(options.address, options.qrText, options.labelText);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
