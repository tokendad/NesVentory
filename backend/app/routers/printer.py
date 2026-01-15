"""
API endpoints for NIIMBOT printer operations.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import qrcode
import io
import logging

from ..deps import get_db
from ..auth import get_current_user
from .. import models
from ..printer_service import NiimbotPrinterService
from ..niimbot import PrinterClient
from ..niimbot.printer import InfoEnum
from ..config import settings

router = APIRouter(prefix="/api/printer", tags=["printer"])
logger = logging.getLogger(__name__)


class PrinterConfig(BaseModel):
    """Printer configuration model. Currently supported: D11-H."""
    enabled: bool = False
    model: str = "d11_h"
    connection_type: str = "usb"
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
    label_width: Optional[int] = None
    label_height: Optional[int] = None


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
        
        # Print the label
        result = NiimbotPrinterService.print_qr_label(
            qr_code_data=qr_code_data,
            location_name=request.location_name,
            printer_config=config,
            is_container=request.is_container,
            label_width=request.label_width,
            label_height=request.label_height,
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
        
        # Try to create transport to verify connection
        transport = NiimbotPrinterService.create_transport(
            validated_config["connection_type"],
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
            "message": f"Connection failed: {str(e)}"
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

        # Connect
        transport = NiimbotPrinterService.create_transport(
            config.get("connection_type", "usb"),
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
    Currently supported: D11-H. Future models coming soon.
    """
    return {
        "models": [
            {"value": "d11_h", "label": "Niimbot D11-H (300dpi)", "max_width": 136},
        ]
    }
