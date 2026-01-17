from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas
from ..deps import get_db
from ..auth import get_current_user
from ..logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


def get_current_active_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """
    Check if the current user is an active admin.
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )
    return current_user


def get_or_create_settings(db: Session) -> models.SystemSettings:
    """Get the system settings row, or create it if it doesn't exist."""
    settings_obj = db.query(models.SystemSettings).first()
    if not settings_obj:
        settings_obj = models.SystemSettings(id=1)
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj


@router.get("/", response_model=schemas.SystemSettings)
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    """
    Get system settings.
    Requires admin privileges.
    """
    return get_or_create_settings(db)


@router.put("/", response_model=schemas.SystemSettings)
def update_settings(
    payload: schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_admin)
):
    """
    Update system settings.
    Requires admin privileges.
    """
    settings_obj = get_or_create_settings(db)
    
    # Update fields if provided
    update_data = payload.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(settings_obj, key, value)
    
    db.commit()
    db.refresh(settings_obj)
    logger.info(f"System settings updated by {current_user.email}")
    return settings_obj


@router.get("/location-categories", response_model=List[str])
def get_location_categories(db: Session = Depends(get_db)):
    """
    Get the list of location categories.
    Returns custom categories if configured, otherwise returns default categories.
    Public endpoint (authenticated users can read).
    """
    settings_obj = get_or_create_settings(db)
    
    if settings_obj.custom_location_categories:
        return settings_obj.custom_location_categories
        
    # Default categories if none configured
    return [
        "Primary",
        "Out-building",
        "Room",
        "Floor",
        "Exterior",
        "Garage",
        "Shed",
        "Container"
    ]
