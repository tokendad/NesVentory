"""
NIIMBOT printer service for thermal label printing.
Supports multiple NIIMBOT printer models with V5 protocol.
Model specs from: https://printers.niim.blue/
"""
import io
import logging
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

from .niimbot import (
    BleakTransport,
    PrinterClient,
    RfcommTransport,
    SerialTransport,
    detect_bluetooth_device_type,
)

logger = logging.getLogger(__name__)

class NiimbotPrinterService:
    """Service for printing labels using NIIMBOT printers."""

    # Printer model specifications: width, height (pixels), DPI, print direction
    # width = printhead width (hardware-fixed), height = default label length in feed direction
    # Source: NIIMBOT manufacturer API (print.niimbot.com/api/hardware/list)
    # Heights set to manufacturer default label lengths (30mm for most models)
    PRINTER_MODELS = {
        "d11_h": {"width": 136, "height": 472, "dpi": 300, "direction": "left"},    # 12mm head, 40mm label (tested/working)
        "d101": {"width": 192, "height": 240, "dpi": 203, "direction": "left"},     # 24mm head, 30mm default (mfr: 30x25mm)
        "d110": {"width": 96, "height": 240, "dpi": 203, "direction": "left"},      # 12mm head, 30mm default (mfr: 30x12mm)
        "d110_m": {"width": 96, "height": 240, "dpi": 203, "direction": "left"},    # 12mm head, 30mm default (mfr: 30x12mm)
        "b1": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},        # 48mm head, 30mm default (mfr: 50x30mm)
        "b21": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},       # 48mm head, 30mm default (mfr: 50x30mm)
        "b21_pro": {"width": 591, "height": 354, "dpi": 300, "direction": "top"},   # 50mm head, 30mm default (mfr: 50x30mm)
        "b21_c2b": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},   # 48mm head, 30mm default (mfr: 50x30mm)
        "m2_h": {"width": 591, "height": 354, "dpi": 300, "direction": "top"},      # 48mm head, 30mm default (mfr: 50x30mm)
    }

    # Maximum label dimensions (mm) per model - from manufacturer API
    # Format: (max_width_mm, max_length_mm)
    MAX_LABEL_MM = {
        "d11_h": (15, 200),
        "d101": (25, 100),
        "d110": (15, 100),
        "d110_m": (15, 100),
        "b1": (50, 200),
        "b21": (50, 200),
        "b21_pro": (50, 200),
        "b21_c2b": (50, 200),
        "m2_h": (50, 240),
    }

    # Density limits per model - from manufacturer API
    DENSITY_LIMITS = {
        "d11_h": 5,     # Mfr: 1-5, default 3
        "d101": 3,      # Mfr: 1-3, default 2
        "d110": 3,      # Mfr: 1-3, default 2
        "d110_m": 5,    # Mfr: 1-5, default 3
        "b1": 5,        # Mfr: 1-5, default 3
        "b21": 5,       # Mfr: 1-5, default 3
        "b21_pro": 5,   # Mfr: 1-5, default 3
        "b21_c2b": 5,   # Mfr: 1-5, default 3
        "m2_h": 5,      # Mfr: 1-5, default 3
    }

    @staticmethod
    def get_model_specs(model: str) -> dict:
        """Get specifications for a printer model."""
        return NiimbotPrinterService.PRINTER_MODELS.get(
            model.lower(),
            NiimbotPrinterService.PRINTER_MODELS["d11_h"]
        )

    @staticmethod
    def label_mm_to_pixels(length_mm: float, dpi: int) -> int:
        """Convert label dimension from mm to pixels at given DPI."""
        return round(length_mm / 25.4 * dpi)

    @staticmethod
    def get_max_label_mm(model: str) -> tuple:
        """Get maximum label dimensions (width_mm, length_mm) for a model."""
        return NiimbotPrinterService.MAX_LABEL_MM.get(
            model.lower(), (50, 200)
        )

    @staticmethod
    def validate_printer_config(config: dict) -> dict:
        """
        Validates printer configuration.
        Required by the application's connection test.
        """
        model = config.get("model", "d11_h").lower()
        if model not in NiimbotPrinterService.PRINTER_MODELS:
            model = "d11_h"

        model_specs = NiimbotPrinterService.get_model_specs(model)
        connection_type = config.get("connection_type", "usb").lower()
        density = config.get("density", 3)
        max_density = NiimbotPrinterService.DENSITY_LIMITS.get(model, 3)

        if density > max_density:
            density = max_density

        return {
            "model": model,
            "connection_type": connection_type,
            "bluetooth_type": config.get("bluetooth_type", "auto"),
            "address": config.get("address"),
            "density": density,
            "label_width": config.get("label_width") or model_specs["width"],
            "label_height": config.get("label_height") or model_specs["height"],
            "print_direction": config.get("print_direction") or model_specs["direction"],
        }

    @staticmethod
    def resolve_connection_type(connection_type: str, bluetooth_type: Optional[str] = None) -> str:
        """
        Resolve the actual connection type based on connection_type and bluetooth_type.

        Args:
            connection_type: "usb" or "bluetooth"
            bluetooth_type: "auto", "ble", or "rfcomm" (only used if connection_type="bluetooth")

        Returns:
            Resolved connection type: "usb", "bluetooth", "bluetooth_ble", or "bluetooth_rfcomm"
        """
        if connection_type != "bluetooth":
            return connection_type

        bluetooth_type = (bluetooth_type or "auto").lower()
        if bluetooth_type == "ble":
            return "bluetooth_ble"
        elif bluetooth_type == "rfcomm":
            return "bluetooth_rfcomm"
        else:  # "auto" or unknown
            return "bluetooth"

    @staticmethod
    def create_transport(connection_type: str, address: Optional[str] = None):
        """
        Creates transport based on connection type with auto-detection for Bluetooth.

        Args:
            connection_type: "usb", "bluetooth" (auto-detect BLE vs RFCOMM),
                           "bluetooth_ble" (force BLE), or "bluetooth_rfcomm" (force RFCOMM)
            address: Device address (MAC for Bluetooth, port for USB)

        Returns:
            Transport instance (BleakTransport, RfcommTransport, or SerialTransport)

        Raises:
            ValueError: Invalid configuration or device not found
        """
        if connection_type == "bluetooth":
            # Auto-detect whether device is BLE or Classic Bluetooth
            if not address:
                raise ValueError("Bluetooth address required for auto-detection")

            logger.info(f"Auto-detecting Bluetooth device type: {address}")

            # Run async detection in sync context
            import asyncio
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                device_info = loop.run_until_complete(
                    detect_bluetooth_device_type(address)
                )
                loop.close()
            except Exception as e:
                raise ValueError(f"Bluetooth device detection failed: {e}")

            logger.info(
                f"Detected device: {device_info.name} (type: {device_info.device_type})"
            )

            # Choose transport based on device type
            if device_info.is_rfcomm_printer():
                logger.info("Device has Serial Port Profile, using RFCOMM transport")
                return RfcommTransport(address)
            elif device_info.is_ble():
                logger.info("Device is BLE, using BleakTransport")
                return BleakTransport(address)
            else:
                raise ValueError(
                    f"Device {address} does not support printer protocols"
                )

        elif connection_type == "bluetooth_ble":
            # Explicit BLE (skip auto-detection)
            if not address:
                raise ValueError("Bluetooth address required")
            logger.info(f"Using explicit BLE transport for {address}")
            return BleakTransport(address)

        elif connection_type == "bluetooth_rfcomm":
            # Explicit RFCOMM (skip auto-detection)
            if not address:
                raise ValueError("Bluetooth address required")
            logger.info(f"Using explicit RFCOMM transport for {address}")
            return RfcommTransport(address)

        # USB or unknown type
        return SerialTransport(port=address if address else "auto")

    @staticmethod
    def calculate_responsive_qr_size(label_width_px: int, label_height_px: int, printhead_width: int) -> int:
        """
        Calculate optimal QR code size based on label dimensions.
        QR should take ~35-40% of the smallest dimension, leaving 60-65% for text.
        """
        # For "left" direction (vertical feed), height is printhead width and width is label length
        # For "top" direction, width is printhead width and height is label length
        # Use the smaller dimension for QR sizing
        min_dimension = min(label_width_px, label_height_px)

        # Target: 35-40% of available space
        max_qr = int(min_dimension * 0.35)

        # QR code must be reasonable size (minimum 50px, maximum bounded by dimensions)
        qr_size = max(50, min(max_qr, min_dimension - 10))

        # Round to nearest multiple of 10 for cleaner sizing
        return (qr_size // 10) * 10

    @staticmethod
    def calculate_responsive_font_size(label_height_px: int, dpi: int, label_width_px: int) -> int:
        """
        Calculate optimal font size based on DPI and label dimensions.
        Higher DPI = can use smaller font for same readability.
        Smaller label = smaller font needed.
        """
        # Base font size: 25% of available height (after QR)
        qr_size = NiimbotPrinterService.calculate_responsive_qr_size(label_width_px, label_height_px, label_height_px)
        available_height = label_height_px - qr_size - 10

        # For "left" direction: available width is around printhead width
        # Font should be ~20% of available height
        base_font = max(8, int(available_height * 0.2))

        # Adjust for DPI: normalize to 203 DPI baseline
        # 203 DPI = 1.0, 300 DPI = 1.48, lower DPI = smaller multiplier
        dpi_factor = dpi / 203.0

        # Apply DPI factor but with a reasonable range (0.6 to 1.5)
        dpi_adjusted = base_font * min(max(dpi_factor, 0.6), 1.5)

        # Ensure minimum readability (at least 8pt)
        return max(8, int(dpi_adjusted))

    @staticmethod
    def create_qr_label_image(
        qr_code_data: bytes,
        location_name: str,
        label_width: int = 136,
        label_height: int = 472,
        print_direction: str = "left",
        dpi: int = 203,
    ) -> Image.Image:
        """
        Creates a responsive QR label image that scales with label dimensions.
        Supports both "left" (vertical feed) and "top" (horizontal feed) directions.

        Args:
            qr_code_data: Binary QR code image data
            location_name: Text to display below QR
            label_width: Label width in pixels
            label_height: Label height in pixels
            print_direction: "left" for vertical feed, "top" for horizontal feed
            dpi: Printer DPI for font optimization
        """
        label = Image.new("L", (label_width, label_height), color=255)  # WHITE background

        # Determine layout based on print direction
        is_horizontal_feed = print_direction != "left"

        if is_horizontal_feed:
            # Horizontal feed (B-series: "top" direction)
            # Layout: QR on top, text below (stacked vertically)
            # Calculate QR size as percentage of width
            max_qr_size = int(label_width * 0.9)
            qr_size = min(max_qr_size, label_height - 60)  # Leave room for text
            qr_size = max(qr_size, 40)  # Minimum QR size

            # Center QR horizontally, place at top
            qr_x = max(5, (label_width - qr_size) // 2)
            qr_y = 5
        else:
            # Vertical feed (D-series: "left" direction)
            # Layout: QR on left, text on right
            qr_size = NiimbotPrinterService.calculate_responsive_qr_size(label_width, label_height, label_height)
            qr_x = 6
            qr_y = max(5, (label_height - qr_size) // 2)  # Center vertically

        # 1. QR Code placement
        try:
            qr_image = Image.open(io.BytesIO(qr_code_data)).convert("L")
            # Resize to calculated responsive size
            qr_image = qr_image.resize((qr_size, qr_size), Image.NEAREST)
            label.paste(qr_image, (qr_x, qr_y))
        except Exception as e:
            logger.error(f"QR Error: {e}")

        # 2. Calculate responsive font size
        font_size = NiimbotPrinterService.calculate_responsive_font_size(label_height, dpi, label_width)

        # 3. Text rendering with responsive sizing
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

        # 4. Prepare text image (WHITE background, BLACK text for thermal printing)
        if is_horizontal_feed:
            # Horizontal: full width text area below QR
            text_width = label_width - 10  # Leave padding
            text_height = label_height - qr_size - 15  # Space below QR
            txt_img = Image.new("L", (text_width, text_height), color=255)  # WHITE background
            draw_txt = ImageDraw.Draw(txt_img)

            # Support multiline text
            lines = location_name.split('\n')
            line_count = len(lines)

            if line_count > 1:
                # For multiline, scale down font slightly
                try:
                    small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(8, int(font_size * 0.75)))
                except OSError:
                    small_font = ImageFont.load_default()
                draw_txt.multiline_text((5, 5), location_name, fill=0, font=small_font, spacing=4)  # BLACK text
            else:
                # Center text horizontally in available space
                text_bbox = draw_txt.textbbox((0, 0), location_name, font=font)
                text_w = text_bbox[2] - text_bbox[0]
                text_x = max(5, (text_width - text_w) // 2)
                draw_txt.text((text_x, 5), location_name, fill=0, font=font)  # BLACK text

            # Place text below QR
            text_x = 5
            text_y = qr_y + qr_size + 5
            label.paste(txt_img, (text_x, text_y))
        else:
            # Vertical: text on right side, rotated -90
            text_width = label_width - qr_size - 18
            text_height = label_height - 10
            txt_img = Image.new("L", (text_width, text_height), color=255)  # WHITE background
            draw_txt = ImageDraw.Draw(txt_img)

            # Support multiline text
            lines = location_name.split('\n')
            line_count = len(lines)

            if line_count > 1:
                # For multiline, scale down font slightly
                try:
                    small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(8, int(font_size * 0.75)))
                except OSError:
                    small_font = ImageFont.load_default()
                draw_txt.multiline_text((5, 10), location_name, fill=0, font=small_font, spacing=4)  # BLACK text
            else:
                # Center single line text vertically
                text_y = max(0, (text_height - font_size) // 2)
                draw_txt.text((5, text_y), location_name, fill=0, font=font)  # BLACK text

            # Rotate and place text
            rotated_txt = txt_img.rotate(-90, expand=True)
            text_x = qr_x + qr_size + 6
            text_y = 5
            label.paste(rotated_txt, (text_x, text_y))

        return label

    @staticmethod
    def print_qr_label(
        qr_code_data: bytes,
        location_name: str,
        printer_config: dict,
        label_width: Optional[int] = None,
        label_height: Optional[int] = None,
        **kwargs,
    ) -> dict:
        """Main entry point for printing."""
        try:
            config = NiimbotPrinterService.validate_printer_config(printer_config)
            model = config["model"]

            model_specs = NiimbotPrinterService.get_model_specs(model)
            dpi = model_specs.get("dpi", 203)

            # Width is always the printhead width (hardware-fixed)
            target_w = model_specs["width"]

            # Height (label length): use user-configured value, then fallback to model default
            # User config stores label_length_mm which gets converted to pixels
            label_length_mm = config.get("label_length_mm")
            if label_length_mm:
                max_w_mm, max_l_mm = NiimbotPrinterService.get_max_label_mm(model)
                clamped_mm = min(float(label_length_mm), max_l_mm)
                target_h = NiimbotPrinterService.label_mm_to_pixels(clamped_mm, dpi)
                logger.info(f"Using user-configured label length: {clamped_mm}mm = {target_h}px")
            elif label_height:
                target_h = label_height
            else:
                target_h = config.get("label_height") or model_specs["height"]

            p_dir = model_specs["direction"]  # Always use model's direction

            logger.info(f"Print dimensions: model={model}, target_w={target_w}, target_h={target_h}, direction={p_dir}, dpi={dpi}")

            label_image = NiimbotPrinterService.create_qr_label_image(
                qr_code_data, location_name, target_w, target_h, p_dir, dpi
            )

            logger.info(f"Created label image: {label_image.width}x{label_image.height}px")

            # Resolve the actual connection type based on bluetooth_type
            actual_connection_type = NiimbotPrinterService.resolve_connection_type(
                config["connection_type"],
                config.get("bluetooth_type")
            )

            transport = NiimbotPrinterService.create_transport(
                actual_connection_type, config.get("address")
            )

            printer = PrinterClient(transport)

            try:
                if not printer.connect():
                    return {"success": False, "message": "Handshake failed"}

                # Execute V5 Print Sequence
                printer.print_image(label_image, density=config["density"], model=model)

                return {"success": True, "message": "Label Printed"}
            finally:
                printer.disconnect()

        except Exception as e:
            import traceback
            error_msg = str(e) or repr(e) or type(e).__name__
            logger.error(f"Print Failure: {error_msg}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Return a generic error message to avoid exposing internal details
            return {"success": False, "message": "Failed to print label"}
