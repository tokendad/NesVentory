"""
NIIMBOT printer service for thermal label printing.
Supports multiple NIIMBOT printer models with V5 protocol.
Model specs from: https://printers.niim.blue/
"""
import io
import logging
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

from .niimbot import BleakTransport, PrinterClient, SerialTransport

logger = logging.getLogger(__name__)

class NiimbotPrinterService:
    """Service for printing labels using NIIMBOT printers."""

    # Printer model specifications: width, height (pixels), DPI, print direction
    # Source: https://printers.niim.blue/hardware/models/
    PRINTER_MODELS = {
        "d11_h": {"width": 136, "height": 472, "dpi": 300, "direction": "left"},
        "d101": {"width": 192, "height": 180, "dpi": 203, "direction": "left"},
        "d110": {"width": 96, "height": 96, "dpi": 203, "direction": "left"},
        "d110_m": {"width": 96, "height": 96, "dpi": 203, "direction": "left"},
        "b1": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},
        "b21": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},
        "b21_pro": {"width": 591, "height": 240, "dpi": 300, "direction": "top"},
        "b21_c2b": {"width": 384, "height": 240, "dpi": 203, "direction": "top"},
        "m2_h": {"width": 591, "height": 240, "dpi": 300, "direction": "top"},
    }

    # Density limits for specific models (D-series: 1-3, B-series: 1-5)
    DENSITY_LIMITS = {
        "d11_h": 3,
        "d101": 3,
        "d110": 3,
        "d110_m": 3,
        "b1": 5,
        "b21": 5,
        "b21_pro": 5,
        "b21_c2b": 5,
        "m2_h": 5,
    }

    @staticmethod
    def get_model_specs(model: str) -> dict:
        """Get specifications for a printer model."""
        return NiimbotPrinterService.PRINTER_MODELS.get(
            model.lower(),
            NiimbotPrinterService.PRINTER_MODELS["d11_h"]
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
            "address": config.get("address"),
            "density": density,
            "label_width": config.get("label_width") or model_specs["width"],
            "label_height": config.get("label_height") or model_specs["height"],
            "print_direction": config.get("print_direction") or model_specs["direction"],
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
        
        # Support multiline text (e.g. for test prints)
        lines = location_name.split('\n')
        line_count = len(lines)
        
        if line_count > 1:
            # For multiline, use smaller font if needed and draw multiline
            try:
                small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
            except OSError:
                small_font = ImageFont.load_default()
            
            # Draw multiline text centered
            draw_txt.multiline_text((5, 10), location_name, fill=255, font=small_font, spacing=4)
        else:
            # Center single line text vertically in the 124px height
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

            model_specs = NiimbotPrinterService.get_model_specs(model)
            target_w = label_width or config.get("label_width") or model_specs["width"]
            target_h = label_height or config.get("label_height") or model_specs["height"]
            p_dir = config.get("print_direction") or model_specs["direction"]

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
            # Return a generic error message to avoid exposing internal details
            return {"success": False, "message": "Failed to print label"}
