"""
Phase 2D: Printer and Label Profile Management Endpoints

Handles creation, listing, and deletion of printer profiles and label profiles.
Also manages the active printer+label configuration for each user.
"""

import logging
from typing import Optional, List
from uuid import UUID as PyUUID

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_db
from ..auth import get_current_user
from ..printer_service import NiimbotPrinterService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/printer", tags=["printer"])


# ============================================================================
# PRINTER PROFILE ENDPOINTS
# ============================================================================

@router.get("/profiles/printer")
def get_printer_profiles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[schemas.PrinterProfileResponse]:
    """Get all printer profiles for the current user."""
    profiles = db.query(models.PrinterProfile).filter(
        models.PrinterProfile.user_id == current_user.id
    ).order_by(models.PrinterProfile.is_default.desc(), models.PrinterProfile.created_at).all()
    return profiles


@router.post("/profiles/printer", status_code=201)
def create_printer_profile(
    profile: schemas.PrinterProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> schemas.PrinterProfileResponse:
    """Create a new printer profile."""
    try:
        # Validate model exists
        if profile.model not in NiimbotPrinterService.PRINTER_MODELS:
            raise HTTPException(status_code=400, detail=f"Unknown model: {profile.model}")

        # Get specs from model
        specs = NiimbotPrinterService.get_model_specs(profile.model)
        max_w_mm, max_l_mm = NiimbotPrinterService.get_max_label_mm(profile.model)
        max_density = NiimbotPrinterService.DENSITY_LIMITS.get(profile.model, 3)

        # Clamp density to model max
        density = min(profile.default_density, max_density)

        # Create profile
        db_profile = models.PrinterProfile(
            user_id=current_user.id,
            name=profile.name,
            model=profile.model,
            connection_type=profile.connection_type,
            bluetooth_type=profile.bluetooth_type,
            address=profile.address,
            printhead_width_px=specs['width'],
            dpi=specs['dpi'],
            print_direction=specs['direction'],
            max_width_mm=max_w_mm,
            max_length_mm=max_l_mm,
            default_density=density,
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create printer profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create printer profile")


@router.delete("/profiles/printer/{profile_id}")
def delete_printer_profile(
    profile_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Delete a printer profile."""
    try:
        profile = db.query(models.PrinterProfile).filter(
            models.PrinterProfile.id == PyUUID(profile_id),
            models.PrinterProfile.user_id == current_user.id
        ).first()

        if not profile:
            raise HTTPException(status_code=404, detail="Printer profile not found")

        db.delete(profile)
        db.commit()
        return {"status": "deleted", "id": profile_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete printer profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete printer profile")


# ============================================================================
# LABEL PROFILE ENDPOINTS
# ============================================================================

@router.get("/profiles/label")
def get_label_profiles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[schemas.LabelProfileResponse]:
    """Get all label profiles for the current user."""
    profiles = db.query(models.LabelProfile).filter(
        models.LabelProfile.user_id == current_user.id
    ).order_by(models.LabelProfile.is_default.desc(), models.LabelProfile.created_at).all()
    return profiles


@router.post("/profiles/label", status_code=201)
def create_label_profile(
    profile: schemas.LabelProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> schemas.LabelProfileResponse:
    """Create a new label profile."""
    try:
        # Validate dimensions
        if profile.width_mm <= 0 or profile.length_mm <= 0:
            raise HTTPException(status_code=400, detail="Label dimensions must be positive")

        if not profile.name or not profile.name.strip():
            raise HTTPException(status_code=400, detail="Label profile name is required")

        db_profile = models.LabelProfile(
            user_id=current_user.id,
            name=profile.name,
            description=profile.description,
            width_mm=profile.width_mm,
            length_mm=profile.length_mm,
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create label profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create label profile")


@router.put("/profiles/label/{profile_id}")
def update_label_profile(
    profile_id: str,
    profile: schemas.LabelProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> schemas.LabelProfileResponse:
    """Update an existing label profile."""
    try:
        db_profile = db.query(models.LabelProfile).filter(
            models.LabelProfile.id == PyUUID(profile_id),
            models.LabelProfile.user_id == current_user.id
        ).first()

        if not db_profile:
            raise HTTPException(status_code=404, detail="Label profile not found")

        # Update only provided fields
        if profile.name is not None:
            if not profile.name.strip():
                raise HTTPException(status_code=400, detail="Label profile name cannot be empty")
            db_profile.name = profile.name

        if profile.description is not None:
            db_profile.description = profile.description

        if profile.width_mm is not None:
            if profile.width_mm <= 0:
                raise HTTPException(status_code=400, detail="Label width must be positive")
            db_profile.width_mm = profile.width_mm

        if profile.length_mm is not None:
            if profile.length_mm <= 0:
                raise HTTPException(status_code=400, detail="Label length must be positive")
            db_profile.length_mm = profile.length_mm

        db.commit()
        db.refresh(db_profile)
        return db_profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update label profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update label profile")


@router.delete("/profiles/label/{profile_id}")
def delete_label_profile(
    profile_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Delete a label profile."""
    try:
        profile = db.query(models.LabelProfile).filter(
            models.LabelProfile.id == PyUUID(profile_id),
            models.LabelProfile.user_id == current_user.id
        ).first()

        if not profile:
            raise HTTPException(status_code=404, detail="Label profile not found")

        db.delete(profile)
        db.commit()
        return {"status": "deleted", "id": profile_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete label profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete label profile")


# ============================================================================
# PRINTER CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/config/active")
def get_active_printer_config(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> schemas.UserPrinterConfigResponse:
    """Get the active printer+label configuration."""
    # Try new schema first
    user_config = db.query(models.UserPrinterConfig).filter(
        models.UserPrinterConfig.user_id == current_user.id,
        models.UserPrinterConfig.is_active == True
    ).first()

    if user_config:
        return user_config

    # Fall back to old schema
    if current_user.niimbot_printer_config:
        raise HTTPException(
            status_code=404,
            detail="Active configuration found but needs migration. Please configure printer in settings."
        )

    raise HTTPException(status_code=404, detail="No active printer configuration. Configure in Printer Settings.")


@router.post("/config/activate")
def activate_printer_config(
    printer_profile_id: str = Body(..., embed=True),
    label_profile_id: str = Body(..., embed=True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> schemas.UserPrinterConfigResponse:
    """Activate a printer+label combination."""
    try:
        # Validate both exist and belong to user
        printer = db.query(models.PrinterProfile).filter(
            models.PrinterProfile.id == PyUUID(printer_profile_id),
            models.PrinterProfile.user_id == current_user.id
        ).first()
        if not printer:
            raise HTTPException(status_code=404, detail="Printer profile not found")

        label = db.query(models.LabelProfile).filter(
            models.LabelProfile.id == PyUUID(label_profile_id),
            models.LabelProfile.user_id == current_user.id
        ).first()
        if not label:
            raise HTTPException(status_code=404, detail="Label profile not found")

        # Validate combination (label must fit printer)
        if label.width_mm > printer.max_width_mm:
            raise HTTPException(
                status_code=400,
                detail=f"Label width {label.width_mm}mm exceeds {printer.name} max {printer.max_width_mm}mm"
            )
        if label.length_mm > printer.max_length_mm:
            raise HTTPException(
                status_code=400,
                detail=f"Label length {label.length_mm}mm exceeds {printer.name} max {printer.max_length_mm}mm"
            )

        # Deactivate current active configs
        db.query(models.UserPrinterConfig).filter(
            models.UserPrinterConfig.user_id == current_user.id,
            models.UserPrinterConfig.is_active == True
        ).update({'is_active': False})

        # Check if this combo already exists
        existing = db.query(models.UserPrinterConfig).filter(
            models.UserPrinterConfig.user_id == current_user.id,
            models.UserPrinterConfig.printer_profile_id == PyUUID(printer_profile_id),
            models.UserPrinterConfig.label_profile_id == PyUUID(label_profile_id)
        ).first()

        if existing:
            existing.is_active = True
            config = existing
        else:
            config = models.UserPrinterConfig(
                user_id=current_user.id,
                printer_profile_id=PyUUID(printer_profile_id),
                label_profile_id=PyUUID(label_profile_id),
                density=printer.default_density,
                is_active=True,
            )
            db.add(config)

        db.commit()
        db.refresh(config)
        return config

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to activate printer config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to activate printer configuration")
