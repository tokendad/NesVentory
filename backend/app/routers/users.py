import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from ..deps import get_db
from ..auth import get_current_user
from ..models import User as UserModel
from ..schemas import User as UserSchema, UserUpdate
from .. import crud

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user: UserModel = Depends(get_current_user)
):
    """
    Get the current authenticated user's information.
    """
    return current_user


@router.patch("/me", response_model=UserSchema)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current authenticated user's settings.
    Allows updating full_name, locale, timezone, and currency.
    """
    # Update only the fields that are provided
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.locale is not None:
        current_user.locale = user_update.locale
    if user_update.timezone is not None:
        current_user.timezone = user_update.timezone
    if user_update.currency is not None:
        current_user.currency = user_update.currency
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/default-timezone")
async def get_default_timezone():
    """
    Get the default timezone from the TZ environment variable.
    This is used to pre-populate user settings based on the docker-compose TZ setting.
    """
    tz = os.getenv("TZ", "Etc/UTC")
    return {"timezone": tz}
