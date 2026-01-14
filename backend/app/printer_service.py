"""
NIIMBOT printer service for 12x40mm (300DPI) labels.
Optimized for D11_H V5 Protocol with full API compatibility.
"""
import io
import logging
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

from .niimbot import BleakTransport, PrinterClient, SerialTransport

logger = logging.getLogger(__name__)

class NiimbotPrinterService:
    """Service for printing labels using NIIMBOT printers."""

    # D11-H: 12x40mm @ 300DPI = 136px width x 472px length
    # Currently supported: D11-H. Future models coming soon.
    PRINTER_MODELS = {
        "d11_h": 136,
    }

    # Density limits for specific models
    DENSITY_LIMITS = {
        "d11_h": 3,
    }

    @staticmethod
    def validate_printer_config(config: dict) -> dict:
        """
        Validates printer configuration.
        Required by the application's connection test.
        """
        model = config.get("model", "d11_h").lower()
        if model not in NiimbotPrinterService.PRINTER_MODELS:
            model = "d11_h"

        connection_type = config.get("connection_type", "usb").lower()
        density = config.get("density", 3)
        max_density = NiimbotPrinterService.DENSITY_LIMITS.get(model, 3)

        if density > max_density:
            density = max_density

        return {
            "model": model,
            "connection_type": connection_type,
            "address": config.get("address"),
            "density": density,
            "label_width": config.get("label_width"),
            "label_height": config.get("label_height"),
            "print_direction": config.get("print_direction", "left"),
        }

    @staticmethod
    def create_transport(connection_type: str, address: Optional[str] = None):
        """Creates transport; auto-detects USB if address is missing."""
        if connection_type == "bluetooth":
            return BleakTransport(address)
        return SerialTransport(port=address if address else "auto")

    @staticmethod
    def create_qr_label_image(
        qr_code_data: bytes,
        location_name: str,
        label_width: int = 136,
        label_height: int = 472,
        print_direction: str = "left",
    ) -> Image.Image:
        """
        Maps 12x40mm label: Width=12mm side, Height=40mm side.
        """
        label = Image.new("L", (label_width, label_height), color=0)

        # 1. QR Code: Position matches testusb.py (6, 5)
        try:
            qr_image = Image.open(io.BytesIO(qr_code_data)).convert("L")
            # No inversion - matches testusb.py which pastes QR directly
            qr_image = qr_image.resize((124, 124), Image.NEAREST)
            label.paste(qr_image, (6, 5))
        except Exception as e:
            logger.error(f"QR Error: {e}")

        # 2. Text: Maximize use of available label space
        # Label: 136x472, QR: 124x124 at (6,5) ends at y=129
        # Available for text: y=132 to y=468 = 336px length, full width ~130px
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        except OSError:
            font = ImageFont.load_default()

        # Maximize text area: 336px length x 124px height (matches QR width)
        # After -90 rotation: 124x336, fitting nicely below QR
        txt_img = Image.new("L", (336, 124), color=0)
        draw_txt = ImageDraw.Draw(txt_img)
        # Center text vertically in the 124px height
        draw_txt.text((5, 44), location_name, fill=255, font=font)

        if print_direction == "left":
            rotated_txt = txt_img.rotate(-90, expand=True)
            # After rotation: 124x336, position at x=6 (align with QR), y=132
            label.paste(rotated_txt, (6, 132))
        else:
            # Top (Standard Landscape on Strip) - No rotation
            label.paste(txt_img, (6, 132))

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

            target_w = label_width or config.get("label_width") or NiimbotPrinterService.PRINTER_MODELS.get(model, 136)
            target_h = label_height or config.get("label_height") or 472
            p_dir = config.get("print_direction", "left")

            label_image = NiimbotPrinterService.create_qr_label_image(
                qr_code_data, location_name, target_w, target_h, p_dir
            )

            transport = NiimbotPrinterService.create_transport(
                config["connection_type"], config.get("address")
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
            return {"success": False, "message": error_msg}
