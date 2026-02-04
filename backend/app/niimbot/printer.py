import abc
import asyncio
import enum
import logging
import math
import os
import socket
import struct
import threading
import time

import serial
from bleak import BleakClient
from PIL import Image, ImageOps
from serial.tools.list_ports import comports as list_comports

from .packet import NiimbotPacket

class InfoEnum(enum.IntEnum):
    DENSITY = 1
    PRINTSPEED = 2
    LABELTYPE = 3
    LANGUAGETYPE = 6
    AUTOSHUTDOWNTIME = 7
    DEVICETYPE = 8
    SOFTVERSION = 9
    BATTERY = 10
    DEVICESERIAL = 11
    HARDVERSION = 12

class RequestCodeEnum(enum.IntEnum):
    GET_INFO = 64  # 0x40
    GET_RFID = 26  # 0x1A
    HEARTBEAT = 220  # 0xDC
    SET_LABEL_TYPE = 35  # 0x23
    SET_LABEL_DENSITY = 33  # 0x21
    START_PRINT = 1  # 0x01
    END_PRINT = 243  # 0xF3
    START_PAGE_PRINT = 3  # 0x03
    END_PAGE_PRINT = 227  # 0xE3
    ALLOW_PRINT_CLEAR = 32  # 0x20
    SET_DIMENSION = 19  # 0x13
    SET_QUANTITY = 21  # 0x15
    GET_PRINT_STATUS = 163  # 0xA3
    CONNECT = 192  # 0xC0

def _packet_to_int(x):
    return int.from_bytes(x.data, "big")

class BaseTransport(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def read(self, length: int) -> bytes:
        raise NotImplementedError

    @abc.abstractmethod
    def write(self, data: bytes):
        raise NotImplementedError

    @abc.abstractmethod
    def disconnect(self):
        raise NotImplementedError

class BleakTransport(BaseTransport):
    SERVICE_UUID = "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
    CHAR_UUID = "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f"

    def __init__(self, address: str):
        self._address = address.upper()
        self._recv_buffer = bytearray()
        self._recv_lock = threading.Lock()
        self._client = None
        self._loop = None
        self._connected = threading.Event()
        self._connect_error = None
        self._stopping = False
        logging.info(f"BleakTransport: Connecting to {self._address}")
        self._thread = threading.Thread(target=self._run_ble_thread, daemon=True)
        self._thread.start()
        logging.info("BleakTransport: Waiting for connection thread...")
        if not self._connected.wait(timeout=30):
            logging.error("BleakTransport: Connection timeout reached in __init__")
            self.disconnect()
            raise TimeoutError("BLE connection timed out")
        if self._connect_error:
            logging.error(f"BleakTransport: Connection error reported: {self._connect_error}")
            self.disconnect()
            raise self._connect_error
        logging.info(f"BleakTransport: Connected successfully")

    def _run_ble_thread(self):
        logging.info("BleakTransport: BLE thread started")
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            logging.info("BleakTransport: Running async_connect in loop...")
            self._loop.run_until_complete(self._async_connect())
            logging.info("BleakTransport: async_connect completed")
            self._connected.set()
            self._loop.run_forever()
        except Exception as e:
            if not self._stopping:
                logging.error(f"BleakTransport: BLE thread error: {e}", exc_info=True)
                self._connect_error = e
            self._connected.set()
        finally:
            if self._loop.is_running():
                self._loop.stop()
            self._loop.close()
            logging.info("BleakTransport: BLE thread event loop closed")

    async def _async_connect(self):
        logging.info(f"BleakTransport: Creating BleakClient for {self._address}...")
        self._client = BleakClient(self._address)
        logging.info("BleakTransport: Calling client.connect()...")
        await self._client.connect()
        logging.info(f"BleakTransport: BLE connected, starting notifications on {self.CHAR_UUID}")
        await self._client.start_notify(self.CHAR_UUID, self._notification_handler)
        try:
            logging.info(f"BleakTransport: Negotiated MTU: {self._client.mtu_size}")
        except Exception as e:
            logging.warning(f"BleakTransport: Could not read MTU: {e}")
        logging.info("BleakTransport: Notifications started")

    async def _async_disconnect(self):
        if self._client and self._client.is_connected:
            logging.info("BleakTransport: Disconnecting client...")
            try:
                await self._client.stop_notify(self.CHAR_UUID)
            except Exception as e:
                logging.warning(f"BleakTransport: stop_notify failed: {e}")
            await self._client.disconnect()
            logging.info("BleakTransport: Client disconnected")

    def disconnect(self):
        self._stopping = True
        logging.info("BleakTransport: disconnect() called")
        if self._loop and self._loop.is_running():
            future = asyncio.run_coroutine_threadsafe(self._async_disconnect(), self._loop)
            try:
                future.result(timeout=5)
            except Exception as e:
                logging.error(f"BleakTransport: Error during async disconnect: {e}")
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
            logging.info("BleakTransport: Thread joined")

    def _notification_handler(self, sender, data):
        with self._recv_lock:
            self._recv_buffer.extend(data)
            logging.debug(f"BleakTransport: Received {len(data)} bytes")

    def read(self, length: int) -> bytes:
        for _ in range(50):
            with self._recv_lock:
                if len(self._recv_buffer) >= length:
                    data = bytes(self._recv_buffer[:length])
                    del self._recv_buffer[:length]
                    return data
                elif len(self._recv_buffer) > 0:
                    data = bytes(self._recv_buffer)
                    self._recv_buffer.clear()
                    return data
            time.sleep(0.1)
        logging.warning("BleakTransport: Read timeout, no data received")
        return bytes()

    def write(self, data: bytes):
        logging.debug(f"BleakTransport: Writing {len(data)} bytes")
        future = asyncio.run_coroutine_threadsafe(
            self._client.write_gatt_char(self.CHAR_UUID, data, response=False),
            self._loop
        )
        future.result(timeout=10)


class SerialTransport(BaseTransport):
    def __init__(self, port: str = "auto"):
        port = port if port != "auto" else self._detect_port()
        self._serial = serial.Serial(port=port, baudrate=115200, timeout=0.5, xonxoff=False, dsrdtr=True, rtscts=True)

    def _detect_port(self):
        all_ports = list(list_comports())
        if len(all_ports) == 0:
            raise RuntimeError("No serial ports detected on the server")
        if len(all_ports) > 1:
            msg = "Too many serial ports, please select specific one:"
            for port, desc, hwid in all_ports:
                msg += f"\n- {port} : {desc} [{hwid}]"
            raise RuntimeError(msg)
        return all_ports[0][0]

    def read(self, length: int) -> bytes:
        return self._serial.read(length)

    def write(self, data: bytes):
        return self._serial.write(data)

    def disconnect(self):
        if self._serial and self._serial.is_open:
            self._serial.close()


class RfcommTransport(BaseTransport):
    def __init__(self, address: str, channel: int = 1):
        self._address = address.upper()
        self._channel = channel
        self._sock = None
        logging.info(f"RfcommTransport: Connecting to {self._address} channel {self._channel}")
        try:
            self._sock = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM)
            self._sock.settimeout(30)
            self._sock.connect((self._address, self._channel))
            self._sock.settimeout(0.5)
            logging.info(f"RfcommTransport: Connected successfully")
        except socket.timeout:
            if self._sock:
                self._sock.close()
            raise ConnectionError(f"Connection timeout connecting to {self._address}.")
        except ConnectionRefusedError:
            if self._sock:
                self._sock.close()
            raise ConnectionError(f"Connection refused by {self._address}.")
        except OSError as e:
            if self._sock:
                self._sock.close()
            if e.errno == 112:
                raise ConnectionError(f"Device {self._address} is not responding.")
            elif e.errno == 113:
                raise ConnectionError(f"Device {self._address} is not reachable.")
            elif e.errno == 16:
                raise ConnectionError(f"Device {self._address} is busy.")
            else:
                raise ConnectionError(f"Failed to connect to {self._address}: {e}")
        except Exception as e:
            if self._sock:
                self._sock.close()
            raise ConnectionError(f"Failed to connect to {self._address}: {e}")

    def read(self, length: int) -> bytes:
        try:
            return self._sock.recv(length)
        except socket.timeout:
            return bytes()
        except Exception as e:
            logging.error(f"RfcommTransport: Read error: {e}")
            return bytes()

    def write(self, data: bytes):
        try:
            return self._sock.send(data)
        except Exception as e:
            logging.error(f"RfcommTransport: Write error: {e}")
            raise

    def disconnect(self):
        if self._sock:
            try:
                self._sock.close()
                logging.info("RfcommTransport: Socket closed")
            except Exception as e:
                logging.warning(f"RfcommTransport: Error closing socket: {e}")
            finally:
                self._sock = None


class BluetoothDeviceInfo:
    def __init__(self, address: str, name: str, device_type: str, uuids: list):
        self.address = address.upper()
        self.name = name
        self.device_type = device_type
        self.uuids = uuids

    def is_ble(self) -> bool:
        return self.device_type in ["ble", "dual"]

    def is_classic(self) -> bool:
        return self.device_type in ["classic", "dual"]

    def is_rfcomm_printer(self) -> bool:
        SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb"
        return SPP_UUID.lower() in [u.lower() for u in self.uuids]


async def detect_bluetooth_device_type(address: str) -> BluetoothDeviceInfo:
    import subprocess
    address_upper = address.upper()
    classic_info = await _check_classic_bluetooth(address_upper)
    if classic_info:
        if any(uuid.lower() == "00001101-0000-1000-8000-00805f9b34fb" for uuid in classic_info.get("uuids", [])):
            logging.info(f"Found Classic Bluetooth printer with SPP: {classic_info.get('name', 'Unknown')}")
            return BluetoothDeviceInfo(address_upper, classic_info.get("name", "Unknown"), "classic", classic_info.get("uuids", []))
    try:
        from bleak import BleakScanner
        logging.info(f"Scanning for BLE device: {address_upper}")
        devices = await BleakScanner.discover(timeout=10.0)
        for device in devices:
            if device.address.upper() == address_upper:
                logging.info(f"Found BLE device: {device.name} ({device.address})")
                ble_uuids = []
                try:
                    if hasattr(device, 'metadata') and device.metadata:
                        ble_uuids = list(device.metadata.get("uuids", []))
                except (AttributeError, TypeError):
                    pass
                if classic_info:
                    return BluetoothDeviceInfo(address_upper, device.name or classic_info.get("name", "Unknown"), "dual", ble_uuids + classic_info.get("uuids", []))
                return BluetoothDeviceInfo(address_upper, device.name or "Unknown", "ble", ble_uuids)
    except Exception as e:
        logging.warning(f"BLE scan failed: {e}")
    if classic_info:
        return BluetoothDeviceInfo(address_upper, classic_info.get("name", "Unknown"), "classic", classic_info.get("uuids", []))
    raise ValueError(f"Bluetooth device {address_upper} not found or not responding")


async def _check_classic_bluetooth(address: str) -> dict:
    import asyncio
    import subprocess
    try:
        proc = await asyncio.create_subprocess_exec("bluetoothctl", "info", address, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5.0)
        if proc.returncode != 0:
            return None
        output = stdout.decode('utf-8')
        name = None
        uuids = []
        for line in output.split('\n'):
            line = line.strip()
            if line.startswith("Name:"):
                name = line.split("Name:", 1)[1].strip()
            elif line.startswith("UUID:"):
                uuid_part = line.split("UUID:", 1)[1].strip()
                if "(" in uuid_part and ")" in uuid_part:
                    uuid = uuid_part.split("(")[1].split(")")[0].strip()
                    uuids.append(uuid)
        if name or uuids:
            return {"name": name, "uuids": uuids}
    except Exception as e:
        logging.debug(f"Classic Bluetooth check failed: {e}")
    return None


class PrinterClient:
    def __init__(self, transport):
        self._transport = transport
        self._packetbuf = bytearray()

    def disconnect(self):
        if self._transport:
            self._transport.disconnect()

    def connect(self):
        try:
            packet = self._transceive(RequestCodeEnum.CONNECT, b"\x01")
            if packet:
                logging.info("Successfully connected to printer via 0xC0 handshake")
                return True
            return False
        except Exception as e:
            logging.error(f"Connection handshake failed: {e}")
            return False

    def start_print_v5(self):
        payload = struct.pack(">H", 1) + b'\x00\x00\x00\x00' + b'\x00\x00\x01'
        packet = self._transceive(RequestCodeEnum.START_PRINT, payload)
        return bool(packet)

    def set_dimension_v5(self, w, h, qty=1):
        logging.info(f"Setting dimensions V5: width={w}, height={h}, qty={qty}")
        payload = struct.pack(">HHH H B B B H", h, w, qty, 0, 0, 0, 1, 0)
        packet = self._transceive(RequestCodeEnum.SET_DIMENSION, payload)
        return bool(packet)

    def print_image(self, image: Image, density: int = 3, model: str = None):
        """Print image to NIIMBOT printer."""
        logging.info(f"========== PRINT_IMAGE START ==========")
        logging.info(f"Input image: {image.width}x{image.height}px, mode={image.mode}, model={model}")

        is_b1 = model and model.lower() == "b1"
        is_v5 = model and model.lower() in ["d11_h", "d101", "d110", "d110_m", "b21", "b21_pro", "b21_c2b", "m2_h"]

        if is_b1:
            logging.info("Using B1 Classic Bluetooth protocol variant (Node.js verified)")

            # =====================================================
            # CRITICAL: B1 with "top" print direction requires 90° CCW rotation
            # Input: 384x240 (width x height) -> After rotation: 240x384
            # This matches niimbluelib's ImageEncoder behavior
            # =====================================================
            original_size = f"{image.width}x{image.height}"
            image = image.transpose(Image.Transpose.ROTATE_270)
            logging.info(f"B1: Rotated image 90° CCW from {original_size} to {image.width}x{image.height}px")

            # DEBUG: Save rotated image to /tmp
            try:
                ts = int(time.time())
                debug_path = f"/tmp/b1_print_{ts}.png"
                image.save(debug_path)
                logging.info(f"DEBUG IMAGE SAVED (rotated): {debug_path}")
            except Exception:
                pass

            # 1. SetDensity (0x21)
            self.set_label_density(density)

            # 2. SetLabelType (0x23) - Required for B1
            self.set_label_type(1)
            time.sleep(0.1)

            # 3. PrintStart (0x01) - 7-byte payload
            sp_payload = b'\x00\x01\x00\x00\x00\x00\x00'
            logging.info(f"PrintStart payload: {sp_payload.hex()}")
            self._send(NiimbotPacket(0x01, sp_payload))
            time.sleep(0.2)

            # 4. PageStart (0x03)
            self._send(NiimbotPacket(0x03, b'\x01'))
            time.sleep(0.1)

            # 5. SetPageSize (0x13) - 6-byte payload
            # After 90° CCW rotation: 384x240 becomes 240x384
            # SetPageSize expects: rows (height), cols (width), qty
            # For rotated image: rows=384, cols=240, qty=1
            # Payload: 01 80 (384) 00 f0 (240) 00 01 (1)
            w, h = image.width, image.height
            sd_payload = struct.pack(">HHH", h, w, 1)
            logging.info(f"SetPageSize: rows={h}, cols={w}, bytes_per_row={w//8} -> payload={sd_payload.hex()}")
            self._send(NiimbotPacket(0x13, sd_payload))
            time.sleep(0.2)

            # 6. Image Data (0x85) - SPLIT COUNT FORMAT WITH COMPRESSION
            # Node log strategy:
            # - Use 0x84 for empty rows (Row, Count)
            # - Use 0x85 with Rep count for identical rows (Row, C1, C2, C3, Rep, Data)
            
            img_l = image.convert("L")
            cols = img_l.width
            rows = img_l.height
            
            # Calculate chunk size for 3 splits
            bytes_per_row = (cols + 7) // 8
            chunk_size = bytes_per_row // 3
            if bytes_per_row % 3 > 0:
                chunk_size += 1
                
            logging.info(f"Encoding image data: rows={rows}, cols={cols}, bytes_per_row={bytes_per_row}")

            y = 0
            while y < rows:
                # 1. Check for Empty Rows
                # Scan ahead to count how many consecutive rows are empty
                empty_count = 0
                for scan_y in range(y, rows):
                    is_empty = True
                    for x in range(cols):
                        if img_l.getpixel((x, scan_y)) < 128:
                            is_empty = False
                            break
                    if is_empty:
                        empty_count += 1
                        if empty_count >= 255: # Max byte value
                            break
                    else:
                        break
                
                if empty_count > 0:
                    # Send 0x84 PrintEmptyRow
                    # Payload: Row(2), Count(1)
                    header = struct.pack(">H B", y, empty_count)
                    logging.info(f"Row {y}: Skipping {empty_count} empty rows (0x84)")
                    self._send(NiimbotPacket(0x84, header))
                    time.sleep(0.005)
                    y += empty_count
                    continue

                # 2. Process Non-Empty Row
                # Get data for current row
                current_line_data = self._get_line_data(img_l, y, cols)
                
                # Check for repetition (identical subsequent rows)
                repeat_count = 1
                for scan_y in range(y + 1, rows):
                    next_line_data = self._get_line_data(img_l, scan_y, cols)
                    if next_line_data == current_line_data:
                        repeat_count += 1
                        if repeat_count >= 255:
                            break
                    else:
                        break
                
                # Calculate Split Counts for the row
                c1 = 0
                c2 = 0
                c3 = 0
                
                # Check for 0x83 opportunity (Sparse row)
                # Count total black pixels to decide between 0x83 and 0x85
                total_pixels = 0
                for i, byte_val in enumerate(current_line_data):
                    bits = bin(byte_val).count('1')
                    total_pixels += bits
                    if i < chunk_size:
                        c1 += bits
                    elif i < chunk_size * 2:
                        c2 += bits
                    else:
                        c3 += bits

                # Header: Row(2), C1(1), C2(1), C3(1), Rep(1)
                header = struct.pack(">H B B B B", y, c1, c2, c3, repeat_count)
                
                use_indexed_mode = total_pixels <= 6
                
                if use_indexed_mode:
                    # 0x83 PrintBitmapRowIndexed
                    # Payload: Header + List of Pixel Indexes (2 bytes each, Big Endian)
                    pixel_indexes = bytearray()
                    # Re-scan line to find pixel positions
                    for x in range(cols):
                        # Optimization: check byte first
                        byte_idx = x // 8
                        if current_line_data[byte_idx] == 0:
                            x += 7 # Skip rest of byte (loop increments by 1, so skip 7 more)
                            continue
                            
                        # Check specific bit
                        if img_l.getpixel((x, y)) < 128:
                            pixel_indexes.extend(struct.pack(">H", x))
                    
                    if y % 50 == 0:
                        logging.info(f"Row {y}: Indexed Mode (0x83), {total_pixels} pixels, {repeat_count} repeats")
                        
                    self._send(NiimbotPacket(0x83, header + pixel_indexes))
                else:
                    # 0x85 PrintBitmapRow
                    # Payload: Header + Full Bitmap Data
                    if y % 50 == 0 or repeat_count > 1:
                        logging.info(f"Row {y}: Full Mode (0x85), {repeat_count} repeats")

                    self._send(NiimbotPacket(0x85, header + current_line_data))
                
                # Critical: Adaptive Flow Control
                # Optimized delay: 15ms per packet (matches ~5s total print time)
                delay = 0.015
                
                # Buffer Drain: Every 20 rows, pause slightly and read
                if y % 20 == 0:
                    delay = 0.05
                    try:
                        # Clear any pending responses from the printer
                        # This prevents the printer's TX buffer from filling up and blocking
                        self._transport.read(1024)
                    except:
                        pass
                
                time.sleep(delay)
                
                y += repeat_count

            logging.info(f"Sent all image data (compressed)")

        elif is_v5:
            logging.info("Using V5 protocol variant")
            self.set_label_density(density)
            self.start_print()
            self.start_page_print()

            sp_payload = struct.pack(">H", 1) + b'\x00\x00\x00\x00' + b'\x00\x00\x01'
            self._send(NiimbotPacket(0x01, sp_payload))
            time.sleep(0.2)

            w, h = image.width, image.height
            sd_payload = struct.pack(">HHH H B B B H", h, w, 1, 0, 0, 0, 1, 0)
            self._send(NiimbotPacket(0x13, sd_payload))
            time.sleep(0.2)

            img_l = image.convert("L")
            for y in range(img_l.height):
                line_pixels = [img_l.getpixel((x, y)) for x in range(img_l.width)]
                line_bits_str = "".join("1" if pix < 128 else "0" for pix in line_pixels)
                if len(line_bits_str) % 8 != 0:
                    line_bits_str += "0" * (8 - (len(line_bits_str) % 8))
                total_pixels = line_bits_str.count("1")
                line_data = int(line_bits_str, 2).to_bytes(len(line_bits_str) // 8, "big")
                t_l, t_h = total_pixels & 0xff, (total_pixels >> 8) & 0xff
                header = struct.pack(">H B B B B", y, 0, t_l, t_h, 1)
                self._send(NiimbotPacket(0x85, header + line_data))
                time.sleep(0.01)
        else:
            logging.info("Using legacy protocol variant")
            self.set_label_density(density)
            self.start_print()
            self.start_page_print()
            self.set_dimension(image.width, image.height)
            for pkt in self._encode_image(image):
                self._send(pkt)

        self.end_page_print()
        time.sleep(0.3)
        self.end_print()
        logging.info(f"========== PRINT_IMAGE END ==========")

    def _encode_image_v5(self, image: Image):
        img = image.convert("L")
        for y in range(img.height):
            line_pixels = [img.getpixel((x, y)) for x in range(img.width)]
            line_bits_str = "".join("1" if pix < 128 else "0" for pix in line_pixels)
            if len(line_bits_str) % 8 != 0:
                line_bits_str += "0" * (8 - (len(line_bits_str) % 8))
            total_pixels = line_bits_str.count("1")
            line_data = int(line_bits_str, 2).to_bytes(len(line_bits_str) // 8, "big")
            t_l, t_h = total_pixels & 0xff, (total_pixels >> 8) & 0xff
            header = struct.pack(">H B B B B", y, 0, t_l, t_h, 1)
            yield NiimbotPacket(0x85, header + line_data)

    def _encode_image(self, image: Image):
        img = image.convert("L").convert("1")
        for y in range(img.height):
            line_pixels = [img.getpixel((x, y)) for x in range(img.width)]
            line_bits = "".join("0" if pix == 0 else "1" for pix in line_pixels)
            line_bytes = int(line_bits, 2).to_bytes(math.ceil(img.width / 8), "big")
            header = struct.pack(">H3BB", y, 0, 0, 0, 1)
            yield NiimbotPacket(0x85, header + line_bytes)

    def _recv(self):
        packets = []
        self._packetbuf.extend(self._transport.read(1024))
        while len(self._packetbuf) > 4:
            pkt_len = self._packetbuf[3] + 7
            if len(self._packetbuf) >= pkt_len:
                packet = NiimbotPacket.from_bytes(self._packetbuf[:pkt_len])
                packets.append(packet)
                del self._packetbuf[:pkt_len]
        return packets

    def _send(self, packet):
        self._transport.write(packet.to_bytes())

    def _transceive(self, reqcode, data, respoffset=1):
        respcode = respoffset + reqcode
        self._send(NiimbotPacket(reqcode, data))
        for _ in range(6):
            for packet in self._recv():
                if packet.type == respcode or packet.type == 0:
                    return packet
            time.sleep(0.1)
        return None

    def get_info(self, key):
        if packet := self._transceive(RequestCodeEnum.GET_INFO, bytes((key,)), key):
            return _packet_to_int(packet)
        return None

    def heartbeat(self):
        packet = self._transceive(RequestCodeEnum.HEARTBEAT, b"\x01")
        return {"raw": packet.data.hex()} if packet else None

    def set_label_type(self, n):
        packet = self._transceive(RequestCodeEnum.SET_LABEL_TYPE, bytes((n,)), 16)
        return bool(packet.data[0]) if packet else False

    def set_label_density(self, n):
        packet = self._transceive(RequestCodeEnum.SET_LABEL_DENSITY, bytes((n,)), 16)
        return bool(packet.data[0]) if packet else False

    def start_print(self):
        packet = self._transceive(RequestCodeEnum.START_PRINT, b"\x01")
        return bool(packet.data[0]) if packet else False

    def end_print(self):
        packet = self._transceive(RequestCodeEnum.END_PRINT, b"\x01")
        return bool(packet.data[0]) if packet else False

    def start_page_print(self):
        packet = self._transceive(RequestCodeEnum.START_PAGE_PRINT, b"\x01")
        return bool(packet.data[0]) if packet else False

    def end_page_print(self):
        packet = self._transceive(RequestCodeEnum.END_PAGE_PRINT, b"\x01")
        return bool(packet.data[0]) if packet else False

    def allow_print_clear(self):
        packet = self._transceive(RequestCodeEnum.ALLOW_PRINT_CLEAR, b"\x01", 16)
        return bool(packet.data[0]) if packet else False

    def set_dimension(self, w, h):
        packet = self._transceive(RequestCodeEnum.SET_DIMENSION, struct.pack(">HH", w, h))
        return bool(packet.data[0]) if packet else False

    def set_quantity(self, n):
        packet = self._transceive(RequestCodeEnum.SET_QUANTITY, struct.pack(">H", n))
        return bool(packet.data[0]) if packet else False

    def get_rfid(self):
        packet = self._transceive(RequestCodeEnum.GET_RFID, b"\x01")
        if not packet or len(packet.data) < 4:
            logging.warning(f"RFID response too short or invalid: {packet.data.hex() if packet else 'None'}")
            return None
        try:
            raw_hex = packet.data.hex()
            logging.info(f"RFID raw response ({len(packet.data)} bytes): {raw_hex}")
            if packet.data[0] != 0x88:
                logging.warning(f"Unexpected RFID tag: 0x{packet.data[0]:02x} (expected 0x88)")
                return None
            data_length = packet.data[1]
            rfid_payload = packet.data[2:2+data_length]
            logging.info(f"RFID payload ({len(rfid_payload)} bytes): {rfid_payload.hex()}")
            product_code = ""
            try:
                ascii_portion = ""
                for byte in rfid_payload:
                    if 32 <= byte <= 126:
                        ascii_portion += chr(byte)
                    elif ascii_portion:
                        if len(ascii_portion) > 3:
                            product_code = ascii_portion
                            break
                        ascii_portion = ""
            except Exception as e:
                logging.debug(f"Could not extract ASCII product code: {e}")
            dimensions = self._detect_dimensions_from_rfid_response(packet.data, raw_hex)
            if dimensions:
                rfid_data = {
                    "width_mm": dimensions["width_mm"],
                    "height_mm": dimensions["height_mm"],
                    "type": 0,
                    "raw_data": raw_hex,
                    "product_code": product_code,
                    "response_signature": raw_hex[:8]
                }
                logging.info(f"RFID detected: {dimensions['width_mm']}x{dimensions['height_mm']}mm (signature: {raw_hex[:8]})")
                return rfid_data
            else:
                logging.warning(f"Could not determine dimensions from RFID response. Raw: {raw_hex}, Product code: {product_code}")
                return None
        except Exception as e:
            logging.error(f"Error parsing RFID data: {e}", exc_info=True)
            return None

    def _detect_dimensions_from_rfid_response(self, response_bytes: bytes, hex_string: str) -> dict | None:
        KNOWN_RFID_SIGNATURES = {
            "881d86286c121080": {"width_mm": 50, "height_mm": 30},
        }
        for signature, dimensions in KNOWN_RFID_SIGNATURES.items():
            if hex_string.startswith(signature):
                logging.info(f"Matched RFID signature: {signature}")
                return dimensions
        try:
            if len(response_bytes) > 17:
                width = response_bytes[16]
                height = response_bytes[17]
                if 10 <= width <= 200 and 10 <= height <= 200:
                    logging.info(f"Extracted dimensions from byte offsets: {width}x{height}mm")
                    return {"width_mm": width, "height_mm": height}
        except Exception as e:
            logging.debug(f"Could not extract dimensions from byte offsets: {e}")
        return None

    def _get_line_data(self, img_l, y, cols):
        """Helper to extract binary line data from image"""
        line_pixels = [img_l.getpixel((x, y)) for x in range(cols)]
        line_bits_str = "".join("1" if pix < 128 else "0" for pix in line_pixels)
        if len(line_bits_str) % 8 != 0:
            line_bits_str += "0" * (8 - (len(line_bits_str) % 8))
        return int(line_bits_str, 2).to_bytes(len(line_bits_str) // 8, "big")
