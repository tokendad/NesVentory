from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..deps import get_db
from .. import models, schemas, auth

router = APIRouter()


@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user. Default role is 'viewer'.
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
    return user


@router.get("/users", response_model=List[schemas.UserRead])
def list_users(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """
    List all users (admin-only).
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    users = db.query(models.User).all()
    return users


@router.get("/users/me", response_model=schemas.UserRead)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    """
    Return profile for the currently authenticated user.
    """
    return current_user


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
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
