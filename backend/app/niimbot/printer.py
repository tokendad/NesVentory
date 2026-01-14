import abc
import asyncio
import enum
import logging
import math
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
    """BLE transport for NIIMBOT printers using GATT.

    Manages its own event loop in a background thread for BLE operations.
    """

    # NIIMBOT BLE GATT UUIDs
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

        # Start background thread that owns the event loop and BLE connection
        self._thread = threading.Thread(target=self._run_ble_thread, daemon=True)
        self._thread.start()

        # Wait for connection to complete
        logging.info("BleakTransport: Waiting for connection thread...")
        if not self._connected.wait(timeout=30):
            logging.error("BleakTransport: Connection timeout reached in __init__")
            self.disconnect() # Cleanup attempts
            raise TimeoutError("BLE connection timed out")
        
        if self._connect_error:
            logging.error(f"BleakTransport: Connection error reported: {self._connect_error}")
            self.disconnect() # Cleanup attempts
            raise self._connect_error

        logging.info(f"BleakTransport: Connected successfully")

    def _run_ble_thread(self):
        """Thread that owns the event loop and BLE connection."""
        logging.info("BleakTransport: BLE thread started")
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        try:
            logging.info("BleakTransport: Running async_connect in loop...")
            self._loop.run_until_complete(self._async_connect())
            logging.info("BleakTransport: async_connect completed")
            self._connected.set()
            # Keep the loop running for notifications until stopped
            self._loop.run_forever()
        except Exception as e:
            if not self._stopping:
                logging.error(f"BleakTransport: BLE thread error: {e}", exc_info=True)
                self._connect_error = e
            self._connected.set()
        finally:
            # Ensure cleanup happens if loop stops unexpectedly
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
        
        # Log MTU and other connection details
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
        """Gracefully disconnect and stop the thread."""
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
        # Wait briefly for data to arrive via notifications
        for _ in range(50):  # 5 second timeout
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
        # Enable robust flow control for USB stability
        self._serial = serial.Serial(
            port=port,
            baudrate=115200,
            timeout=0.5,
            xonxoff=False,
            dsrdtr=True,
            rtscts=True
        )

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

class PrinterClient:
    def __init__(self, transport):
        self._transport = transport
        self._packetbuf = bytearray()

    def disconnect(self):
        if self._transport:
            self._transport.disconnect()

    def connect(self):
        """Robust connection handshake."""
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
        """9-byte StartPrint for V5 protocol."""
        payload = struct.pack(">H", 1) + b'\x00\x00\x00\x00' + b'\x00\x00\x01'
        packet = self._transceive(RequestCodeEnum.START_PRINT, payload)
        return bool(packet)

    def set_dimension_v5(self, w, h, qty=1):
        """13-byte Dimension set for V5 protocol."""
        logging.info(f"Setting dimensions V5: width={w}, height={h}, qty={qty}")
        # H, W, Qty, 0, 0, 0, 1, 0
        payload = struct.pack(">HHH H B B B H", h, w, qty, 0, 0, 0, 1, 0)
        packet = self._transceive(RequestCodeEnum.SET_DIMENSION, payload)
        return bool(packet)

    def print_image(self, image: Image, density: int = 3, model: str = None):
        """Print method matching testusb.py's custom_print_image exactly.

        V5 Protocol sequence (from working testusb.py):
        1. set_label_density (transceive)
        2. start_print (transceive)
        3. start_page_print (transceive)
        4. V5 start print packet 0x01 with 9-byte payload (_send, no wait)
        5. V5 dimension packet 0x13 (_send, no wait)
        6. Image data rows 0x85 (_send, no wait)
        7. end_page_print (transceive)
        8. sleep 0.3s
        9. end_print (transceive)
        """
        logging.info(f"Starting print: {image.width}x{image.height}px, model={model}")

        is_v5 = model and model.lower() in ["d11_h", "d110_m", "b21_pro"]

        # Exactly match testusb.py sequence
        self.set_label_density(density)
        self.start_print()
        self.start_page_print()

        if is_v5:
            # V5: Use _send (fire-and-forget) NOT _transceive - matches testusb.py
            # 1. Start Print Command (0x01) with 9-byte payload
            sp_payload = struct.pack(">H", 1) + b'\x00\x00\x00\x00' + b'\x00\x00\x01'
            self._send(NiimbotPacket(0x01, sp_payload))
            time.sleep(0.2)  # Critical delay for BLE stability

            # 2. Set Dimension Command (0x13)
            w, h = image.width, image.height
            sd_payload = struct.pack(">HHH H B B B H", h, w, 1, 0, 0, 0, 1, 0)
            self._send(NiimbotPacket(0x13, sd_payload))
            time.sleep(0.2)  # Critical delay for BLE stability

            # 3. Image Data (0x85) - inline encoding exactly like testusb.py
            img_l = image.convert("L")
            for y in range(img_l.height):
                line_pixels = [img_l.getpixel((x, y)) for x in range(img_l.width)]
                line_bits_str = "".join("1" if pix > 128 else "0" for pix in line_pixels)

                if len(line_bits_str) % 8 != 0:
                    line_bits_str += "0" * (8 - (len(line_bits_str) % 8))

                total_pixels = line_bits_str.count("1")
                line_data = int(line_bits_str, 2).to_bytes(len(line_bits_str) // 8, "big")

                t_l, t_h = total_pixels & 0xff, (total_pixels >> 8) & 0xff
                header = struct.pack(">H B B B B", y, 0, t_l, t_h, 1)
                self._send(NiimbotPacket(0x85, header + line_data))

                # Slow down significantly for BLE (0.01s per line = ~4.7s total)
                time.sleep(0.01)
        else:
            # Legacy path for non-V5 printers
            self.set_dimension(image.width, image.height)
            for pkt in self._encode_image(image):
                self._send(pkt)

        self.end_page_print()
        time.sleep(0.3)
        self.end_print()

    def _encode_image_v5(self, image: Image):
        """Encodes image for V5 protocol with bit counts."""
        img = image.convert("L")
        for y in range(img.height):
            line_pixels = [img.getpixel((x, y)) for x in range(img.width)]
            line_bits_str = "".join("1" if pix > 128 else "0" for pix in line_pixels)

            if len(line_bits_str) % 8 != 0:
                line_bits_str += "0" * (8 - (len(line_bits_str) % 8))

            total_pixels = line_bits_str.count("1")
            line_data = int(line_bits_str, 2).to_bytes(len(line_bits_str) // 8, "big")

            t_l, t_h = total_pixels & 0xff, (total_pixels >> 8) & 0xff
            header = struct.pack(">H B B B B", y, 0, t_l, t_h, 1)
            yield NiimbotPacket(0x85, header + line_data)

    def _encode_image(self, image: Image):
        """Legacy image encoding."""
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
