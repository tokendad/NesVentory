from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional

from ..deps import get_db
from ..auth import authenticate_user, create_access_token, verify_google_token, get_user_by_google_id, get_user_by_email
from ..config import get_settings
from ..schemas import Token
from .. import models
from ..settings_service import get_effective_google_oauth

settings = get_settings()

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    """Request model for Google OAuth authentication."""
    credential: str


class GoogleAuthResponse(BaseModel):
    """Response model for Google OAuth authentication."""
    access_token: str
    token_type: str
    is_new_user: bool  # True if this is the user's first login/registration via Google OAuth


class GoogleOAuthStatus(BaseModel):
    """Response model for Google OAuth status."""
    enabled: bool
    client_id: Optional[str] = None


@router.get("/auth/google/status", response_model=GoogleOAuthStatus)
async def google_oauth_status(db: Session = Depends(get_db)):
    """Check if Google OAuth is enabled (configured via env or database)."""
    client_id, client_secret = get_effective_google_oauth(db)
    is_enabled = bool(client_id and client_secret)
    return {
        "enabled": is_enabled,
        "client_id": client_id if is_enabled else None
    }


@router.post("/auth/google", response_model=GoogleAuthResponse)
async def google_auth(
    request: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate or register a user with Google OAuth.
    
    If the Google account is already linked to a user, returns a token for that user.
    If the email exists but is not linked to Google, links the accounts.
    If the email doesn't exist, creates a new user with Google OAuth.
    """
    client_id, client_secret = get_effective_google_oauth(db)
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Configure it via environment variables or the admin panel."
        )
    
    # Verify the Google token
    google_info = verify_google_token(request.credential)
    if not google_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    
    if not google_info.get('email_verified'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google email not verified"
        )
    
    email = google_info.get('email')
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not have an email address"
        )
    
    google_id = google_info['google_id']
    name = google_info.get('name')
    
    is_new_user = False
    
    # Check if user with this Google ID already exists
    user = get_user_by_google_id(db, google_id)
    
    if not user:
        # Check if user with this email exists
        user = get_user_by_email(db, email)
        
        if user:
            # Link existing account to Google
            user.google_id = google_id
            if not user.full_name and name:
                user.full_name = name
            db.commit()
            db.refresh(user)
        else:
            # Create a new user with Google OAuth
            is_new_user = True
            user = models.User(
                email=email,
                full_name=name,
                google_id=google_id,
                password_hash=None,  # No password for Google OAuth users
                role=models.UserRole.VIEWER,
                is_approved=False,  # New users need admin approval
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    
    # Check if user is approved (for existing users or linked accounts)
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by an administrator",
        )
    
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_new_user": is_new_user
    }


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login endpoint.
    Accepts username (email) and password, returns access_token and token_type.
    Unapproved users are blocked from logging in.
    """
    user = authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is approved
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by an administrator",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}