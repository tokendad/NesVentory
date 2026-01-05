"""
NIIMBOT printer service for printing QR code labels.
"""
import io
import logging
import re
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

from .niimbot import BluetoothTransport, PrinterClient, SerialTransport

logger = logging.getLogger(__name__)


class NiimbotPrinterService:
    """Service for printing labels using NIIMBOT printers."""

    # Supported printer models and their max widths (in pixels)
    PRINTER_MODELS = {
        "b1": 384,
        "b18": 384,
        "b21": 384,
        "d11": 96,
        "d110": 96,
    }

    # Density limits for specific models
    DENSITY_LIMITS = {
        "b18": 3,
        "d11": 3,
        "d110": 3,
    }

    @staticmethod
    def create_transport(connection_type: str, address: Optional[str] = None):
        """
        Create a transport instance for the printer.
        
        Args:
            connection_type: Either "usb" or "bluetooth"
            address: Bluetooth MAC address or serial port path. For USB, can be None for auto-detect.
            
        Returns:
            Transport instance
        """
        if connection_type == "bluetooth":
            if not address:
                raise ValueError("Bluetooth address is required for bluetooth connection")
            # Validate and normalize MAC address
            address = address.upper()
            return BluetoothTransport(address)
        elif connection_type == "usb":
            port = address if address else "auto"
            return SerialTransport(port=port)
        else:
            raise ValueError(f"Invalid connection type: {connection_type}")

    @staticmethod
    def validate_printer_config(config: dict) -> dict:
        """
        Validate and normalize printer configuration.
        
        Args:
            config: Printer configuration dictionary
            
        Returns:
            Validated configuration
            
        Raises:
            ValueError: If configuration is invalid
        """
        model = config.get("model", "b21").lower()
        if model not in NiimbotPrinterService.PRINTER_MODELS:
            raise ValueError(f"Unsupported printer model: {model}")

        connection_type = config.get("connection_type", "usb").lower()
        if connection_type not in ["usb", "bluetooth"]:
            raise ValueError(f"Invalid connection type: {connection_type}")

        density = config.get("density", 3)
        if not isinstance(density, int) or density < 1 or density > 5:
            raise ValueError("Density must be between 1 and 5")

        # Check density limits for specific models
        max_density = NiimbotPrinterService.DENSITY_LIMITS.get(model, 5)
        if density > max_density:
            logger.warning(f"Model {model} only supports density up to {max_density}, adjusting")
            density = max_density

        address = config.get("address")
        if connection_type == "bluetooth" and not address:
            raise ValueError("Bluetooth address is required for bluetooth connection")
        elif connection_type == "usb" and address:
            # Validate USB address to prevent path traversal or access to restricted devices
            # Allow:
            # - "auto"
            # - Windows: COM1, COM12
            # - Linux: /dev/ttyUSB*, /dev/ttyACM*, /dev/ttyS*, /dev/rfcomm*
            # - Mac: /dev/cu.*, /dev/tty.*
            if address != "auto" and not re.match(r'^(COM\d+|/dev/tty(USB|ACM|AMA|S)\d+|/dev/rfcomm\d+|/dev/cu\..+|/dev/tty\..+)$', address):
                 raise ValueError("Invalid USB printer address format. Must be a valid serial port (e.g., /dev/ttyUSB0, COM3).")

        return {
            "model": model,
            "connection_type": connection_type,
            "address": address,
            "density": density,
        }

    @staticmethod
    def create_qr_label_image(
        qr_code_data: bytes,
        location_name: str,
        label_width: int = 384,
        is_container: bool = False,
    ) -> Image.Image:
        """
        Create a label image with QR code and location name.
        
        Args:
            qr_code_data: QR code image data (PNG format)
            location_name: Name of the location to print
            label_width: Width of the label in pixels
            is_container: Whether this is a container location
            
        Returns:
            PIL Image object ready for printing
        """
        # Load QR code image
        qr_image = Image.open(io.BytesIO(qr_code_data)).convert("L")
        
        # Calculate dimensions (8 pixels per mm, ~203 dpi)
        # For a typical 30x15mm label (240x120 pixels) or 50x30mm label (400x240 pixels)
        qr_size = min(120, label_width - 40)  # Leave margin and space for text
        qr_image = qr_image.resize((qr_size, qr_size), Image.LANCZOS)
        
        # Calculate label height based on QR code size with margins
        label_height = qr_size + 20  # 10px margin top and bottom
        
        # Create label image (black on white)
        label = Image.new("L", (label_width, label_height), color=255)
        draw = ImageDraw.Draw(label)
        
        # Position QR code on the left
        qr_x = 10
        qr_y = 10
        label.paste(qr_image, (qr_x, qr_y))
        
        # Add text on the right side
        text_x = qr_x + qr_size + 10
        text_y = qr_y
        
        # Use a default font (PIL doesn't require external font files for basic text)
        try:
            # Try to use a TrueType font if available
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except (IOError, OSError):
            # Fall back to default bitmap font
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Draw location name
        max_text_width = label_width - text_x - 10
        
        # Wrap text if too long
        if len(location_name) > 20:
            location_name = location_name[:17] + "..."
        
        draw.text((text_x, text_y), location_name, fill=0, font=font_large)
        
        # Add container badge if applicable
        if is_container:
            badge_y = text_y + 20
            draw.text((text_x, badge_y), "[BOX]", fill=0, font=font_small)
        
        return label

    @staticmethod
    def print_qr_label(
        qr_code_data: bytes,
        location_name: str,
        printer_config: dict,
        is_container: bool = False,
    ) -> dict:
        """
        Print a QR code label to a NIIMBOT printer.
        
        Args:
            qr_code_data: QR code image data (PNG format)
            location_name: Name of the location to print
            printer_config: Printer configuration dictionary
            is_container: Whether this is a container location
            
        Returns:
            Dictionary with success status and message
        """
        try:
            # Validate configuration
            config = NiimbotPrinterService.validate_printer_config(printer_config)
            
            # Get printer specifications
            model = config["model"]
            max_width = NiimbotPrinterService.PRINTER_MODELS[model]
            
            # Create label image
            label_image = NiimbotPrinterService.create_qr_label_image(
                qr_code_data=qr_code_data,
                location_name=location_name,
                label_width=max_width,
                is_container=is_container,
            )
            
            # Check image width
            if label_image.width > max_width:
                raise ValueError(f"Image width {label_image.width}px exceeds printer maximum {max_width}px")
            
            # Create transport and printer client
            transport = NiimbotPrinterService.create_transport(
                config["connection_type"],
                config.get("address")
            )
            printer = PrinterClient(transport)
            
            # Print the image
            logger.info(f"Printing label for '{location_name}' to {model} printer")
            printer.print_image(label_image, density=config["density"])
            
            return {
                "success": True,
                "message": "Label printed successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to print label: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to print label: {str(e)}"
            }
