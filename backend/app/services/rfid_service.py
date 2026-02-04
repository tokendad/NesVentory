"""
RFID Detection Service for NIIMBOT Printers

Handles the workflow of connecting to a printer, querying RFID, and detecting the label profile.
"""

import logging
from typing import Optional, Dict, Any

from ..niimbot.printer import PrinterClient
from ..niimbot.profile_detector import ProfileDetector, RfidProfile
from ..printer_service import NiimbotPrinterService

logger = logging.getLogger(__name__)


class RfidDetectionService:
    """Service for detecting loaded label profiles via RFID."""

    @staticmethod
    def detect_loaded_label(printer_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect label loaded in printer via RFID and return matched profile.

        Args:
            printer_config: Printer configuration dict with keys:
                - enabled: bool
                - connection_type: str ("server", "bluetooth", "serial")
                - address: str (for bluetooth/serial)
                - bluetooth_type: str (optional, "ble" or "rfcomm")

        Returns:
            {
                "success": bool,
                "detected_profile": {
                    "name": str,
                    "model": str,
                    "width_mm": int,
                    "height_mm": int,
                    "dpi": int,
                    "confidence": float
                },
                "rfid_data": {
                    "width_mm": int,
                    "height_mm": int,
                    "type": int,
                    "raw_data": str (hex)
                },
                "confidence": float,
                "error": str (if failed)
            }
        """
        transport = None
        printer = None

        try:
            if not printer_config or not printer_config.get("enabled"):
                return {
                    "success": False,
                    "error": "NIIMBOT printer is not configured or enabled",
                }

            connection_type = printer_config.get("connection_type", "server")
            address = printer_config.get("address")
            bluetooth_type = printer_config.get("bluetooth_type", "auto")

            logger.info(f"RFID Detection: Starting for {connection_type} connection")

            # Resolve connection type (handles "auto" for bluetooth)
            actual_connection_type = NiimbotPrinterService.resolve_connection_type(
                connection_type, bluetooth_type
            )

            # Create transport
            transport = NiimbotPrinterService.create_transport(
                actual_connection_type, address
            )

            if not transport:
                return {
                    "success": False,
                    "error": f"Failed to create transport for {actual_connection_type}",
                }

            # Create printer client and connect
            printer = PrinterClient(transport)

            if not printer.connect():
                return {
                    "success": False,
                    "error": "Failed to connect to printer. Check printer is powered on.",
                }

            logger.info("RFID Detection: Connected to printer")

            # Query RFID
            rfid_data = printer.get_rfid()

            if not rfid_data:
                return {
                    "success": False,
                    "error": "No RFID tag detected. Ensure label roll is properly loaded.",
                }

            logger.info(f"RFID Detection: Got RFID data: {rfid_data}")

            # Detect profile
            profile: Optional[RfidProfile] = ProfileDetector.detect_profile(rfid_data)

            if not profile:
                return {
                    "success": False,
                    "rfid_data": rfid_data,
                    "error": f"Unknown label size: {rfid_data['width_mm']}x{rfid_data['height_mm']}mm. "
                    f"Please select a profile manually.",
                }

            logger.info(f"RFID Detection: Matched profile: {profile.name}")

            return {
                "success": True,
                "rfid_data": rfid_data,
                "detected_profile": {
                    "name": profile.name,
                    "model": profile.model,
                    "width_mm": profile.width_mm,
                    "height_mm": profile.height_mm,
                    "width_px": profile.width_px,
                    "height_px": profile.height_px,
                    "dpi": profile.dpi,
                    "print_direction": profile.print_direction,
                },
                "confidence": profile.confidence,
                "error": None,
            }

        except TimeoutError as e:
            logger.error(f"RFID Detection timeout: {e}")
            return {
                "success": False,
                "error": "Timeout querying printer RFID. Ensure printer is powered on and nearby.",
            }

        except ConnectionError as e:
            logger.error(f"RFID Detection connection error: {e}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}",
            }

        except Exception as e:
            logger.error(f"RFID Detection failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"RFID detection error: {str(e)}",
            }

        finally:
            # Cleanup
            if printer:
                try:
                    printer.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting printer: {e}")

            if transport:
                try:
                    transport.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting transport: {e}")
