// Niimbot Printer Driver for Web (Bluetooth & USB/Serial)
// Based on reverse engineering and backend implementation
// Reference: https://github.com/MultiMote/niimbluelib

export const NIIMBOT_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
export const NIIMBOT_CHARACTERISTIC_UUID = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';

// Printer model specifications from niimbluelib
// printDirection: "left" = printhead on left side (image needs +90° rotation)
// printDirection: "top" = printhead on top (no rotation needed)
export type PrintDirection = 'left' | 'top';

export interface NiimbotModelSpec {
  model: string;
  label: string;
  dpi: number;
  printDirection: PrintDirection;
  printheadPixels: number;  // Print width in pixels
  densityMin: number;
  densityMax: number;
  densityDefault: number;
  defaultLabelLengthMm: number;  // Manufacturer default label length in mm
  maxLabelLengthMm: number;      // Manufacturer max label length in mm
}

// Common NIIMBOT models supported for direct printing
// Specs from: NIIMBOT manufacturer API (print.niimbot.com/api/hardware/list)
export const NIIMBOT_MODELS: NiimbotModelSpec[] = [
  // D-series (compact label printers) - printDirection: 'left' = 90° rotation
  { model: 'D11', label: 'D11 (12mm)', dpi: 203, printDirection: 'left', printheadPixels: 96, densityMin: 1, densityMax: 3, densityDefault: 2, defaultLabelLengthMm: 30, maxLabelLengthMm: 100 },
  { model: 'D11S', label: 'D11S (12mm)', dpi: 203, printDirection: 'left', printheadPixels: 96, densityMin: 1, densityMax: 3, densityDefault: 2, defaultLabelLengthMm: 30, maxLabelLengthMm: 75 },
  { model: 'D101', label: 'D101 (24mm)', dpi: 203, printDirection: 'left', printheadPixels: 192, densityMin: 1, densityMax: 3, densityDefault: 2, defaultLabelLengthMm: 30, maxLabelLengthMm: 100 },
  { model: 'D110', label: 'D110 (12mm)', dpi: 203, printDirection: 'left', printheadPixels: 96, densityMin: 1, densityMax: 3, densityDefault: 2, defaultLabelLengthMm: 30, maxLabelLengthMm: 100 },
  { model: 'D110_M', label: 'D110-M (12mm)', dpi: 203, printDirection: 'left', printheadPixels: 96, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 30, maxLabelLengthMm: 100 },
  { model: 'D11_H', label: 'D11-H (12mm HD)', dpi: 300, printDirection: 'left', printheadPixels: 142, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 40, maxLabelLengthMm: 200 },
  // B-series (wider label printers) - printDirection: 'top' = 0° rotation
  { model: 'B1', label: 'B1 (48mm)', dpi: 203, printDirection: 'top', printheadPixels: 384, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 30, maxLabelLengthMm: 200 },
  { model: 'B18', label: 'B18 (12mm)', dpi: 203, printDirection: 'left', printheadPixels: 96, densityMin: 1, densityMax: 3, densityDefault: 2, defaultLabelLengthMm: 30, maxLabelLengthMm: 120 },
  { model: 'B21', label: 'B21 (48mm)', dpi: 203, printDirection: 'top', printheadPixels: 384, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 30, maxLabelLengthMm: 200 },
  { model: 'B21_PRO', label: 'B21 Pro (50mm HD)', dpi: 300, printDirection: 'top', printheadPixels: 591, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 30, maxLabelLengthMm: 200 },
  { model: 'B21_C2B', label: 'B21-C2B (48mm)', dpi: 203, printDirection: 'top', printheadPixels: 384, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 30, maxLabelLengthMm: 200 },
  // Other models
  { model: 'M2_H', label: 'M2-H (48mm HD)', dpi: 300, printDirection: 'top', printheadPixels: 567, densityMin: 1, densityMax: 5, densityDefault: 3, defaultLabelLengthMm: 30, maxLabelLengthMm: 240 },
];

export const getModelSpec = (model: string): NiimbotModelSpec | undefined => {
  return NIIMBOT_MODELS.find(m => m.model === model);
};

export const getDefaultModel = (): NiimbotModelSpec => {
  return NIIMBOT_MODELS.find(m => m.model === 'D101') || NIIMBOT_MODELS[0];
};

export enum RequestCode {
  GET_INFO = 64, // 0x40
  GET_RFID = 26, // 0x1A
  HEARTBEAT = 220, // 0xDC
  SET_LABEL_TYPE = 35, // 0x23
  SET_LABEL_DENSITY = 33, // 0x21
  START_PRINT = 1, // 0x01
  END_PRINT = 243, // 0xF3
  START_PAGE_PRINT = 3, // 0x03
  END_PAGE_PRINT = 227, // 0xE3
  ALLOW_PRINT_CLEAR = 32, // 0x20
  SET_DIMENSION = 19, // 0x13
  SET_QUANTITY = 21, // 0x15
  GET_PRINT_STATUS = 163, // 0xA3
  PRINT_BITMAP_ROW = 0x85, // 133
  PRINT_CLEAR = 0x20, // 32
}

export class NiimbotPacket {
  type: number;
  data: Uint8Array;

  constructor(type: number, data: Uint8Array) {
    this.type = type;
    this.data = data;
  }

  toBytes(): Uint8Array {
    const len = this.data.length;
    // Checksum: type ^ len ^ data[0] ^ ... ^ data[n]
    let checksum = this.type ^ len;
    for (const b of this.data) {
      checksum ^= b;
    }

    const packet = new Uint8Array(2 + 1 + 1 + len + 1 + 2); // Header(2) + Type(1) + Len(1) + Data(len) + Checksum(1) + Footer(2)
    packet[0] = 0x55;
    packet[1] = 0x55;
    packet[2] = this.type;
    packet[3] = len;
    packet.set(this.data, 4);
    packet[4 + len] = checksum;
    packet[4 + len + 1] = 0xaa;
    packet[4 + len + 2] = 0xaa;

    return packet;
  }

  static fromBytes(buffer: Uint8Array): NiimbotPacket | null {
    if (buffer.length < 7) return null;
    if (buffer[0] !== 0x55 || buffer[1] !== 0x55) return null;
    
    const type = buffer[2];
    const len = buffer[3];
    if (buffer.length < 4 + len + 3) return null; // Not enough data yet

    const data = buffer.slice(4, 4 + len);
    const receivedChecksum = buffer[4 + len];
    
    let checksum = type ^ len;
    for (const b of data) {
      checksum ^= b;
    }

    if (checksum !== receivedChecksum) {
        console.warn("Checksum mismatch");
        return null;
    }
    
    return new NiimbotPacket(type, data);
  }
}

export interface NiimbotTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  read(length: number): Promise<Uint8Array>; // Simplified read
  isConnected(): boolean;
}

// NIIMBOT printer name prefixes for Bluetooth discovery
// Derived from all known model names (A20, B1, B21, C1, D11, D101, etc.)
// See: https://github.com/MultiMote/niimbluelib
const NIIMBOT_NAME_PREFIXES = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K', 'M', 'N', 'P', 'S', 'T', 'Z'];

export class BluetoothTransport implements NiimbotTransport {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(): Promise<void> {
    // Use namePrefix filters for device discovery (required for most NIIMBOT printers)
    // Plus service UUID filter as fallback. Web Bluetooth needs at least one matching filter.
    // Reference: https://github.com/MultiMote/niimbluelib/blob/main/src/client/bluetooth_impl.ts
    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        ...NIIMBOT_NAME_PREFIXES.map(prefix => ({ namePrefix: prefix })),
        { services: [NIIMBOT_SERVICE_UUID] },
      ],
      optionalServices: [NIIMBOT_SERVICE_UUID],
    });

    if (!this.device.gatt) throw new Error("Device does not support GATT");

    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(NIIMBOT_SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(NIIMBOT_CHARACTERISTIC_UUID);
    
    // Attempt to start notifications for reading
    try {
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (e) => {
        // Handle incoming data if we implement full read/response loop
        // For now, we mainly write.
      });
    } catch (e) {
      console.warn("Could not start notifications", e);
    }
  }

  async disconnect(): Promise<void> {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error("Not connected");
    // Some devices prefer smaller chunks (MTU size), e.g. 20 bytes for older BLE
    // D11 usually handles 200+ bytes if MTU negotiated, but let's be safe or just write
    // Most browsers handle splitting automatically for writeValue
    try {
      await this.characteristic.writeValue(data as any);
    } catch (e) {
      // Fallback chunking if needed? 
      // For now assume standard WebBLE behavior works
      throw e;
    }
  }

  async read(length: number): Promise<Uint8Array> {
    // WebBluetooth read is async and notification based mostly.
    // Implementing synchronous read is tricky without a buffer queue.
    // For this simple print driver, we might skip reading for now or just return empty.
    return new Uint8Array(0);
  }
  
  isConnected(): boolean {
      return !!(this.server && this.server.connected);
  }
}

export class SerialTransport implements NiimbotTransport {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async connect(): Promise<void> {
    if (!navigator.serial) throw new Error("Web Serial API not supported");

    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 }); // Standard Niimbot baudrate

    if (this.port.writable) {
      this.writer = this.port.writable.getWriter();
    }
    if (this.port.readable) {
        this.reader = this.port.readable.getReader();
        // Start a background read loop if needed, or read on demand
    }
  }

  async disconnect(): Promise<void> {
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
    if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error("Not connected");
    await this.writer.write(data);
  }

  async read(length: number): Promise<Uint8Array> {
     // Simplified placeholder
     return new Uint8Array(0);
  }

  isConnected(): boolean {
      return !!this.port && !!this.port.writable;
  }
}

export class NiimbotClient {
  private transport: NiimbotTransport;

  constructor(transport: NiimbotTransport) {
      this.transport = transport;
  }

  async connect() {
    await this.transport.connect();
  }

  async disconnect() {
    await this.transport.disconnect();
  }

  private async send(packet: NiimbotPacket) {
    const data = packet.toBytes();
    await this.transport.write(data);
    
    // Very basic rate limiting
    await new Promise(r => setTimeout(r, 10)); 
  }

  // Simplified transaction (send only)
  
  async setLabelType(type: number) {
    await this.send(new NiimbotPacket(RequestCode.SET_LABEL_TYPE, new Uint8Array([type])));
  }

  async setLabelDensity(density: number) {
    await this.send(new NiimbotPacket(RequestCode.SET_LABEL_DENSITY, new Uint8Array([density])));
  }

  async startPrint() {
    await this.send(new NiimbotPacket(RequestCode.START_PRINT, new Uint8Array([0x01])));
  }

  async endPrint() {
    await this.send(new NiimbotPacket(RequestCode.END_PRINT, new Uint8Array([0x01])));
  }

  async startPagePrint() {
    await this.send(new NiimbotPacket(RequestCode.START_PAGE_PRINT, new Uint8Array([0x01])));
  }

  async endPagePrint() {
    await this.send(new NiimbotPacket(RequestCode.END_PAGE_PRINT, new Uint8Array([0x01])));
  }

  async setDimension(width: number, height: number) {
    const data = new Uint8Array(4);
    new DataView(data.buffer).setUint16(0, width, false); // Big endian
    new DataView(data.buffer).setUint16(2, height, false);
    await this.send(new NiimbotPacket(RequestCode.SET_DIMENSION, data));
  }
    
  async setQuantity(quantity: number) {
    const data = new Uint8Array(2);
    new DataView(data.buffer).setUint16(0, quantity, false);
    await this.send(new NiimbotPacket(RequestCode.SET_QUANTITY, data));
  }

  async printImage(imageData: ImageData, density: number = 3) {
      if (!this.transport.isConnected()) throw new Error("Not connected");

      await this.setLabelDensity(density);
      await this.setLabelType(1);
      await this.startPrint();
      
      // Some printers might need ALLOW_PRINT_CLEAR (0x20)
      // await this.send(new NiimbotPacket(RequestCode.ALLOW_PRINT_CLEAR, new Uint8Array([1])));

      await this.startPagePrint();
      await this.setDimension(imageData.height, imageData.width);
      // await this.setQuantity(1);

      // Encode image
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      
      for (let y = 0; y < height; y++) {
          // Construct line data (1-bit monochrome)
          const rowBytes = new Uint8Array(Math.ceil(width / 8));
          for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              // Simple threshold
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const avg = (r + g + b) / 3;
              const isBlack = avg < 128;
              
              if (isBlack) {
                  const byteIdx = Math.floor(x / 8);
                  const bitIdx = 7 - (x % 8);
                  rowBytes[byteIdx] |= (1 << bitIdx);
              }
          }
          
          // Construct packet for this row
          // Header: y (2 bytes big endian) + 1 (1 byte) + 1 (1 byte) + 1 (1 byte) + 1 (1 byte)
          // Matching backend: struct.pack(">H3BB", y, *counts, 1) where counts=(0,0,0)
          
          const header = new Uint8Array(6);
          const view = new DataView(header.buffer);
          view.setUint16(0, y, false); // Big endian y
          header[2] = 0; // count1
          header[3] = 0; // count2
          header[4] = 0; // count3
          header[5] = 1; // const

          const packetData = new Uint8Array(header.length + rowBytes.length);
          packetData.set(header, 0);
          packetData.set(rowBytes, header.length);

          const packet = new NiimbotPacket(RequestCode.PRINT_BITMAP_ROW, packetData);
          await this.send(packet);
          
          // Delay to prevent buffer overflow (crucial for D11/D110)
          if (y % 10 === 0) await new Promise(r => setTimeout(r, 5));
      }

      await this.endPagePrint();
      
      // Wait for print to finish (blind wait as we don't read status)
      await new Promise(r => setTimeout(r, 500));
      
      await this.endPrint();
  }
}