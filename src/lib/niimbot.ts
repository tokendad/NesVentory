// UUIDs for Niimbot D11
const SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
const CHARACTERISTIC_UUID = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';

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
    // Footer check might need handling for split packets, but assuming atomic for now or checking end
    // Logic: find 0xAA 0xAA at end?
    
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
}

export class NiimbotClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect() {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });

    if (!this.device.gatt) throw new Error("Device does not support GATT");

    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    // Setup notifications if needed, though D11 mainly listens
    // await this.characteristic.startNotifications();
    // this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotification);
  }

  async disconnect() {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
  }

  private async send(packet: NiimbotPacket) {
    if (!this.characteristic) throw new Error("Not connected");
    const data = packet.toBytes();
    // BLE packet size limit is often 20 bytes, but modern Android/Chips handle larger.
    // However, it's safer to chunk if large. D11 usually handles ~200 bytes fine in one write if MTU negotiated.
    // For safety with simple implementation, we assume writeValue handles it or MTU is sufficient.
    // If it fails, we might need to chunk.
    await this.characteristic.writeValue(data as BufferSource);
    
    // Very basic rate limiting
    await new Promise(r => setTimeout(r, 20)); 
  }

  // Simplified transaction (send only, or send and wait blindly) because reading responses via WebBLE 
  // requires setting up the listener and promise racing, which is complex. 
  // For printing, mostly we just send commands.
  
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
      if (!this.characteristic) throw new Error("Not connected");

      await this.setLabelDensity(density);
      await this.setLabelType(1);
      await this.startPrint();
      await this.startPagePrint();
      await this.setDimension(imageData.height, imageData.width);
      await this.setQuantity(1);

      // Encode image
      // Convert to 1-bit monochrome
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      
      for (let y = 0; y < height; y++) {
          // Construct line data
          // Each pixel is 0 or 1.
          // Pack into bytes.
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
          // Header: y (2 bytes big endian) + 1 (1 byte) + 1 (1 byte) + 1 (1 byte) + 1 (1 byte) ??
          // Python: header = struct.pack(">H3BB", y, *counts, 1) where counts=(0,0,0)
          // >H3BB means:
          // H: unsigned short (2 bytes) -> y
          // 3B: 3 unsigned bytes -> 0, 0, 0
          // B: 1 unsigned byte -> 1
          
          const header = new Uint8Array(2 + 3 + 1);
          const view = new DataView(header.buffer);
          view.setUint16(0, y, false); // Big endian y
          header[2] = 0;
          header[3] = 0;
          header[4] = 0;
          header[5] = 1;

          const packetData = new Uint8Array(header.length + rowBytes.length);
          packetData.set(header, 0);
          packetData.set(rowBytes, header.length);

          const packet = new NiimbotPacket(RequestCode.PRINT_BITMAP_ROW, packetData);
          await this.send(packet);
          
          // Small delay to prevent buffer overflow on printer
          if (y % 10 === 0) await new Promise(r => setTimeout(r, 5));
      }

      await this.endPagePrint();
      
      // Wait for print to finish (blind wait)
      await new Promise(r => setTimeout(r, 500));
      
      await this.endPrint();
  }
}
