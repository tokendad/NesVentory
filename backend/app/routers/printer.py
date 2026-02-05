"""
API endpoints for printer operations.
Supports both NIIMBOT thermal printers and system printers via CUPS.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import qrcode
import io
import logging

from ..deps import get_db
from ..auth import get_current_user
from .. import models
from ..printer_service import NiimbotPrinterService
from ..system_printer_service import SystemPrinterService
# DISABLED: RFID detection causing dimension issues with B1 printer
# from ..services.rfid_service import RfidDetectionService
from ..niimbot import PrinterClient
from ..niimbot.printer import InfoEnum
from ..config import settings

router = APIRouter(prefix="/api/printer", tags=["printer"])
logger = logging.getLogger(__name__)


class PrinterConfig(BaseModel):
    """Printer configuration model."""
    enabled: bool = False
    model: str = "d11_h"
    connection_type: str = "usb"
    bluetooth_type: Optional[str] = "auto"  # "auto", "ble", or "rfcomm" (only used if connection_type="bluetooth")
    address: Optional[str] = None
    density: int = 3
    label_width: Optional[int] = None
    label_height: Optional[int] = None
    print_direction: Optional[str] = "left"


class PrintLabelRequest(BaseModel):
    """Request model for printing a label."""
    location_id: str
    location_name: str
    is_container: bool = False
    # DISABLED: RFID detection causing dimension issues with B1 printer
    # label_width_mm: Optional[float] = None  # Detected label width in mm from RFID
    # label_height_mm: Optional[float] = None  # Detected label height in mm from RFID


class SystemPrinterInfo(BaseModel):
    """System printer information."""
    name: str
    info: str
    location: str
    make_model: str
    state: int
    state_message: str
    is_default: bool
    accepting_jobs: bool


class SystemPrintRequest(BaseModel):
    """Request model for printing to a system printer."""
    printer_name: str
    label_text: str
    qr_url: Optional[str] = None
    label_type: str = "location"  # "location" or "item"
    target_id: Optional[str] = None  # location_id or item_id


@router.get("/config")
def get_printer_config(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's NIIMBOT printer configuration.
    """
    config = current_user.niimbot_printer_config or {}
    return {
        "enabled": config.get("enabled", False),
        "model": config.get("model", "d11_h"),
        "connection_type": config.get("connection_type", "usb"),
        "bluetooth_type": config.get("bluetooth_type", "auto"),
        "address": config.get("address"),
        "density": config.get("density", 3),
        "label_width": config.get("label_width"),
        "label_height": config.get("label_height"),
        "print_direction": config.get("print_direction", "left"),
    }


@router.put("/config")
def update_printer_config(
    config: PrinterConfig,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's NIIMBOT printer configuration.
    """
    try:
        # Validate configuration if enabled
        if config.enabled:
            config_dict = config.model_dump()
            NiimbotPrinterService.validate_printer_config(config_dict)
        
        # Store configuration
        current_user.niimbot_printer_config = config.model_dump()
        db.commit()
        
        return {
            "success": True,
            "message": "Printer configuration updated successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update printer config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")


@router.post("/print-label")
def print_label(
    request: PrintLabelRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Print a QR code label for a location using the NIIMBOT printer.
    """
    try:
        # Get printer configuration
        config = current_user.niimbot_printer_config
        if not config or not config.get("enabled"):
            raise HTTPException(
                status_code=400,
                detail="NIIMBOT printer is not configured or enabled. Please configure in User Settings."
            )
        
        # Verify location exists and user has access
        location = db.query(models.Location).filter(
            models.Location.id == request.location_id
        ).first()
        
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Generate QR code using configured app URL
        location_url = f"{settings.APP_URL}/#/location/{request.location_id}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=0,
        )
        qr.add_data(location_url)
        qr.make(fit=True)
        
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        qr_image.save(img_byte_arr, format='PNG')
        qr_code_data = img_byte_arr.getvalue()

        # DISABLED: RFID detection causing dimension issues with B1 printer
        # Convert detected dimensions (mm) to pixels if provided
        # label_width_px = None
        # label_height_px = None
        # if request.label_width_mm and request.label_height_mm:
        #     model = config.get("model", "d11_h")
        #     model_specs = NiimbotPrinterService.get_model_specs(model)
        #     dpi = model_specs.get("dpi", 203)
        #     # Convert mm to inches to pixels: mm / 25.4 * dpi
        #     label_width_px = int((request.label_width_mm / 25.4) * dpi)
        #     label_height_px = int((request.label_height_mm / 25.4) * dpi)
        #     logger.info(f"Using detected dimensions: {request.label_width_mm}x{request.label_height_mm}mm → {label_width_px}x{label_height_px}px @ {dpi}DPI")

        # Print the label (using model specs, not RFID dimensions)
        result = NiimbotPrinterService.print_qr_label(
            qr_code_data=qr_code_data,
            location_name=request.location_name,
            printer_config=config,
            is_container=request.is_container,
            label_width=None,  # Use model specs
            label_height=None,  # Use model specs
        )
        
        if result["success"]:
            return result
        else:
            # Log the internal error message but return a generic error to the client
            logger.error(f"Printer service reported failure: {result.get('message')}")
            raise HTTPException(status_code=500, detail="Failed to print label")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to print label: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to print label")


@router.post("/print-test-label")
def print_test_label(
    current_user: models.User = Depends(get_current_user),
):
    """
    Print a test label with a QR code and a few lines of text.
    """
    try:
        # Get printer configuration
        config = current_user.niimbot_printer_config
        if not config or not config.get("enabled"):
            raise HTTPException(
                status_code=400,
                detail="NIIMBOT printer is not configured or enabled. Please configure in User Settings."
            )
        
        # Generate test QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=0,
        )
        qr.add_data(f"{settings.APP_URL} (Test Print)")
        qr.make(fit=True)
        
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        qr_image.save(img_byte_arr, format='PNG')
        qr_code_data = img_byte_arr.getvalue()
        
        # Print the label
        # We'll use the location_name field for multiple lines of text
        test_text = "TEST PRINT\nNESVENTORY\nSUCCESSFUL"
        
        result = NiimbotPrinterService.print_qr_label(
            qr_code_data=qr_code_data,
            location_name=test_text,
            printer_config=config,
        )
        
        if result["success"]:
            return result
        else:
            logger.error(f"Printer service reported failure: {result.get('message')}")
            raise HTTPException(status_code=500, detail="Failed to print test label")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to print test label: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to print test label")


@router.post("/test-connection")
def test_connection(
    config: PrinterConfig = Body(...),
    current_user: models.User = Depends(get_current_user),
):
    """
    Test the connection to a NIIMBOT printer with the given configuration.
    """
    try:
        if not config.enabled:
            raise HTTPException(status_code=400, detail="Printer must be enabled to test connection")
        
        config_dict = config.model_dump()
        
        # Validate configuration
        validated_config = NiimbotPrinterService.validate_printer_config(config_dict)

        # Resolve the actual connection type based on bluetooth_type
        actual_connection_type = NiimbotPrinterService.resolve_connection_type(
            validated_config["connection_type"],
            validated_config.get("bluetooth_type")
        )

        # Try to create transport to verify connection
        transport = NiimbotPrinterService.create_transport(
            actual_connection_type,
            validated_config.get("address")
        )
        
        # Create printer client and try to get device info
        printer = PrinterClient(transport)
        try:
            if not printer.connect():
                raise ValueError("Protocol handshake failed (no response to CONNECT packet)")
            
            # If we get here, connection is successful
            return {
                "success": True,
                "message": "Successfully connected to printer"
            }
        finally:
            printer.disconnect()
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return {
            "success": False,
            "message": "Connection failed while testing printer connection. Please verify the configuration and try again."
        }


@router.get("/status")
def get_printer_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed status of the connected printer including RFID info.
    """
    try:
        # Get printer configuration
        config = current_user.niimbot_printer_config
        if not config or not config.get("enabled"):
             raise HTTPException(
                status_code=400,
                detail="Printer is not enabled"
            )

        # Resolve the actual connection type based on bluetooth_type
        actual_connection_type = NiimbotPrinterService.resolve_connection_type(
            config.get("connection_type", "usb"),
            config.get("bluetooth_type")
        )

        # Connect
        transport = NiimbotPrinterService.create_transport(
            actual_connection_type,
            config.get("address")
        )
        printer = PrinterClient(transport)
        try:
            if not printer.connect():
                 raise ValueError("Protocol handshake failed")
            
            # Fetch Info
            info = {
                "serial": printer.get_info(InfoEnum.DEVICESERIAL),
                "soft_version": printer.get_info(InfoEnum.SOFTVERSION),
                "hard_version": printer.get_info(InfoEnum.HARDVERSION),
                "rfid": printer.get_rfid()
            }
            
            return info
        finally:
            printer.disconnect()

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get printer status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get printer status: {str(e)}")


@router.get("/models")
def get_printer_models():
    """
    Get the list of supported NIIMBOT printer models.
    Model specs from: https://printers.niim.blue/hardware/models/
    """
    return {
        "models": [
            {"value": "d11_h", "label": "Niimbot D11-H (300dpi)", "max_width": 136, "dpi": 300},
            {"value": "d101", "label": "Niimbot D101 (203dpi)", "max_width": 192, "dpi": 203},
            {"value": "d110", "label": "Niimbot D110 (203dpi)", "max_width": 96, "dpi": 203},
            {"value": "d110_m", "label": "Niimbot D110-M (203dpi)", "max_width": 96, "dpi": 203},
            {"value": "b1", "label": "Niimbot B1 (203dpi)", "max_width": 384, "dpi": 203},
            {"value": "b21", "label": "Niimbot B21 (203dpi)", "max_width": 384, "dpi": 203},
            {"value": "b21_pro", "label": "Niimbot B21 Pro (300dpi)", "max_width": 591, "dpi": 300},
            {"value": "b21_c2b", "label": "Niimbot B21-C2B (203dpi)", "max_width": 384, "dpi": 203},
            {"value": "m2_h", "label": "Niimbot M2-H (300dpi)", "max_width": 591, "dpi": 300},
        ]
    }


# ============================================================================
# System Printer (CUPS) Endpoints
# ============================================================================

@router.get("/system/available")
def check_system_printers_available():
    """
    Check if system printer integration (CUPS) is available.
    """
    return {
        "available": SystemPrinterService.is_available(),
        "message": "CUPS printing available" if SystemPrinterService.is_available()
                   else "CUPS printing not available. Ensure CUPS is running and the socket is mounted."
    }


@router.get("/system/printers", response_model=List[SystemPrinterInfo])
def get_system_printers(
    current_user: models.User = Depends(get_current_user),
):
    """
    Get list of available system printers (via CUPS).
    Requires CUPS to be running and accessible.
    """
    if not SystemPrinterService.is_available():
        raise HTTPException(
            status_code=503,
            detail="System printing not available. Ensure CUPS is running and the socket is mounted."
        )

    printers = SystemPrinterService.get_printers()
    return printers


@router.post("/system/print")
def print_to_system_printer(
    request: SystemPrintRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Print a label to a system printer (via CUPS).

    This creates a standard label image and sends it to the specified
    CUPS printer. Works with any printer that supports image printing.
    """
    if not SystemPrinterService.is_available():
        raise HTTPException(
            status_code=503,
            detail="System printing not available. Ensure CUPS is running and the socket is mounted."
        )

    try:
        # Generate QR code if URL provided
        qr_code_data = None
        if request.qr_url:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_H,
                box_size=10,
                border=1,
            )
            qr.add_data(request.qr_url)
            qr.make(fit=True)

            qr_image = qr.make_image(fill_color="black", back_color="white")

            img_byte_arr = io.BytesIO()
            qr_image.save(img_byte_arr, format='PNG')
            qr_code_data = img_byte_arr.getvalue()

        # Create label image
        if qr_code_data:
            label_image = SystemPrinterService.create_label_image(
                qr_code_data=qr_code_data,
                label_text=request.label_text,
            )
        else:
            # Create text-only label
            from PIL import Image, ImageDraw, ImageFont
            label_image = Image.new("RGB", (384, 192), color="white")
            draw = ImageDraw.Draw(label_image)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
            except OSError:
                font = ImageFont.load_default()
            draw.text((20, 80), request.label_text, fill="black", font=font)

        # Print to the system printer
        result = SystemPrinterService.print_image(
            printer_name=request.printer_name,
            image=label_image,
            title=f"NesVentory - {request.label_text}",
        )

        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to print to system printer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to print label. Please try again.")


@router.post("/system/print-location")
def print_location_to_system_printer(
    printer_name: str = Body(...),
    location_id: str = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Print a location label to a system printer.
    Generates QR code pointing to the location page.
    """
    if not SystemPrinterService.is_available():
        raise HTTPException(
            status_code=503,
            detail="System printing not available. Ensure CUPS is running and the socket is mounted."
        )

    # Get location
    location = db.query(models.Location).filter(
        models.Location.id == location_id
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    try:
        # Generate QR code
        location_url = f"{settings.APP_URL}/#/location/{location_id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=1,
        )
        qr.add_data(location_url)
        qr.make(fit=True)

        qr_image = qr.make_image(fill_color="black", back_color="white")

        img_byte_arr = io.BytesIO()
        qr_image.save(img_byte_arr, format='PNG')
        qr_code_data = img_byte_arr.getvalue()

        # Create label
        label_text = location.friendly_name or location.name
        label_image = SystemPrinterService.create_label_image(
            qr_code_data=qr_code_data,
            label_text=label_text,
        )

        # Print
        result = SystemPrinterService.print_image(
            printer_name=printer_name,
            image=label_image,
            title=f"NesVentory - {label_text}",
        )

        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to print location label: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to print label. Please try again.")


@router.post("/system/print-item")
def print_item_to_system_printer(
    printer_name: str = Body(...),
    item_id: str = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Print an item label to a system printer.
    Generates QR code pointing to the item details page.
    """
    if not SystemPrinterService.is_available():
        raise HTTPException(
            status_code=503,
            detail="System printing not available. Ensure CUPS is running and the socket is mounted."
        )

    # Get item
    item = db.query(models.Item).filter(
        models.Item.id == item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        # Generate QR code
        item_url = f"{settings.APP_URL}/#/item/{item_id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=1,
        )
        qr.add_data(item_url)
        qr.make(fit=True)

        qr_image = qr.make_image(fill_color="black", back_color="white")

        img_byte_arr = io.BytesIO()
        qr_image.save(img_byte_arr, format='PNG')
        qr_code_data = img_byte_arr.getvalue()

        # Create label
        label_text = item.name
        label_image = SystemPrinterService.create_label_image(
            qr_code_data=qr_code_data,
            label_text=label_text,
        )

        # Print
        result = SystemPrinterService.print_image(
            printer_name=printer_name,
            image=label_image,
            title=f"NesVentory - {label_text}",
        )

        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to print item label: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to print label. Please try again.")


# DISABLED: RFID detection causing dimension issues with B1 printer
@router.post("/detect-rfid")
def detect_rfid(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detect loaded label via RFID and return matched profile.

    TEMPORARILY DISABLED: RFID dimension detection causing issues with B1 printer.
    Using fixed model specs instead.
    """
    return {
        "success": False,
        "error": "RFID detection temporarily disabled. Using fixed model specs for label dimensions."
    }
    # Original implementation commented out below:
    # try:
    #     # Get printer config from user
    #     if not current_user.niimbot_printer_config:
    #         raise HTTPException(
    #             status_code=400,
    #             detail="NIIMBOT printer is not configured"
    #         )
    #
    #     printer_config = current_user.niimbot_printer_config
    #
    #     if not printer_config.get("enabled"):
    #         raise HTTPException(
    #             status_code=400,
    #             detail="NIIMBOT printer is not enabled"
    #         )
    #
    #     # Detect label via RFID
    #     result = RfidDetectionService.detect_loaded_label(printer_config)
    #
    #     return result
    #
    # except HTTPException:
    #     raise
    # except Exception as e:
    #     logger.error(f"RFID detection error: {e}", exc_info=True)
    #     return {
    #         "success": False,
    #         "error": f"RFID detection failed: {str(e)}"
    #     }
