from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
import uuid
import secrets

from ..deps import get_db
from .. import models, schemas, auth

router = APIRouter()

# API key length constant: 32 bytes = 64 hex characters
API_KEY_BYTES = 32


def generate_api_key() -> str:
    """Generate a secure API key (32 bytes, represented as 64 hex characters)."""
    return secrets.token_hex(API_KEY_BYTES)


def get_user_with_locations(user: models.User) -> dict:
    """Helper to serialize user with allowed_location_ids and api_key."""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "allowed_location_ids": [loc.id for loc in user.allowed_locations] if user.allowed_locations else [],
        "api_key": user.api_key
    }


@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user. Default role is 'viewer' for security.
    Note: The User model default is ADMIN for backwards compatibility with seeding,
    but registration explicitly sets VIEWER for new user registrations.
    """
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=auth.get_password_hash(user_in.password),
        role=models.UserRole.VIEWER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_user_with_locations(user)


@router.get("/users", response_model=List[schemas.UserRead])
def list_users(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """
    List all users (admin-only).
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    users = db.query(models.User).all()
    return [get_user_with_locations(u) for u in users]


@router.get("/users/me", response_model=schemas.UserRead)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    """
    Return profile for the currently authenticated user.
    """
    return get_user_with_locations(current_user)


@router.patch("/users/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: uuid.UUID,
    user_in: dict = Body(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's profile. Admins can update any user; non-admins can update themselves only.
    Accepts partial JSON with keys: full_name, password, role (role only applied by admin).
    """
    # allow admin or owner
    if current_user.role != models.UserRole.ADMIN and str(current_user.id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if "full_name" in user_in and user_in["full_name"] is not None:
        user.full_name = user_in["full_name"]

    if "password" in user_in and user_in["password"]:
        user.password_hash = auth.get_password_hash(user_in["password"])

    if "role" in user_in and user_in["role"] is not None and current_user.role == models.UserRole.ADMIN:
        try:
            user.role = models.UserRole(user_in["role"])
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    db.add(user)
    db.commit()
    db.refresh(user)
    return get_user_with_locations(user)


@router.put("/users/{user_id}/locations", response_model=schemas.UserRead)
def update_user_location_access(
    user_id: uuid.UUID,
    access: schemas.UserLocationAccess,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's location access (admin-only).
    Sets which locations the user can access. Empty list means access to all locations.
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get the locations from the provided IDs
    locations = []
    for loc_id in access.location_ids:
        loc = db.query(models.Location).filter(models.Location.id == loc_id).first()
        if not loc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Location {loc_id} not found"
            )
        locations.append(loc)

    # Update the user's allowed locations
    user.allowed_locations = locations
    db.commit()
    db.refresh(user)
    return get_user_with_locations(user)


@router.get("/users/{user_id}/locations", response_model=List[schemas.Location])
def get_user_location_access(
    user_id: uuid.UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a user's accessible locations (admin-only or self).
    Returns empty list if user has access to all locations.
    """
    if current_user.role != models.UserRole.ADMIN and str(current_user.id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user.allowed_locations or []


@router.post("/users/me/api-key", response_model=schemas.UserRead)
def generate_user_api_key(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate or regenerate the API key for the currently authenticated user.
    Returns the updated user with the new API key.
    """
    current_user.api_key = generate_api_key()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return get_user_with_locations(current_user)


@router.delete("/users/me/api-key", response_model=schemas.UserRead)
def revoke_user_api_key(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke the API key for the currently authenticated user.
    Returns the updated user with the API key removed.
    """
    current_user.api_key = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return get_user_with_locations(current_user)
