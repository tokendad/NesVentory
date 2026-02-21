from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
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
from ..logging_config import get_logger

settings = get_settings()
logger = get_logger(__name__)

router = APIRouter()


def perform_password_login(db: Session, username: str, password: str) -> dict:
    """
    Shared authentication logic for password-based login.

    Args:
        db: Database session
        username: User's email address
        password: User's password

    Returns:
        Dict with access_token, token_type, and must_change_password flag

    Raises:
        HTTPException: If authentication fails or user is not approved
    """
    user = authenticate_user(db, email=username, password=password)
    if not user:
        logger.warning(f"Failed login attempt for: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is approved
    if not user.is_approved:
        logger.warning(f"Login blocked (not approved): {username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by an administrator",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    logger.info(f"User logged in: {username} (id={user.id})")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "must_change_password": user.must_change_password
    }


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


class RegistrationStatus(BaseModel):
    """Response model for registration status."""
    enabled: bool


@router.get("/auth/registration/status", response_model=RegistrationStatus)
async def registration_status():
    """
    Check if new user registration is enabled.
    
    Returns whether self-registration is allowed. This endpoint is public
    (no authentication required) so the login page can determine whether
    to show the registration option.
    
    Registration is disabled when DISABLE_SIGNUPS=true is set in environment.
    """
    return {
        "enabled": not settings.DISABLE_SIGNUPS
    }


@router.get("/auth/google/status", response_model=GoogleOAuthStatus)
async def google_oauth_status(db: Session = Depends(get_db)):
    """Check if Google OAuth is enabled (configured via env or database)."""
    client_id, client_secret = get_effective_google_oauth(db)
    is_enabled = bool(client_id and client_secret)
    return {
        "enabled": is_enabled,
        "client_id": client_id if is_enabled else None
    }


@router.post("/auth/google")
async def google_auth(
    request: GoogleAuthRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate or register a user with Google OAuth.

    If the Google account is already linked to a user, sets HttpOnly cookie with token.
    If the email exists but is not linked to Google, links the accounts.
    If the email doesn't exist, creates a new user with Google OAuth.
    """
    client_id, client_secret = get_effective_google_oauth(db)
    if not client_id or not client_secret:
        logger.warning("Google OAuth login attempted but not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Configure it via environment variables or the admin panel."
        )

    # Verify the Google token
    google_info = verify_google_token(request.credential)
    if not google_info:
        logger.warning("Invalid Google OAuth token received")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    if not google_info.get('email_verified'):
        logger.warning(f"Google OAuth: unverified email attempted login")
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
            logger.info(f"Google OAuth: linked existing account {email} (id={user.id})")
        else:
            # Check if new user registration is disabled
            if settings.DISABLE_SIGNUPS:
                logger.warning(f"Google OAuth: registration blocked for {email} (signups disabled)")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="New user registration is disabled"
                )
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
            logger.info(f"Google OAuth: new user registered {email} (id={user.id})")

    # Check if user is approved (for existing users or linked accounts)
    if not user.is_approved:
        logger.warning(f"Google OAuth: login blocked (not approved) for {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by an administrator",
        )

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    logger.info(f"Google OAuth: user logged in {email} (id={user.id})")

    # Create response with HttpOnly cookie
    response = JSONResponse(content={
        "token_type": "bearer",
        "is_new_user": is_new_user
    })

    # Set HttpOnly secure cookie with auth token
    is_https = (
        http_request.headers.get("x-forwarded-proto", "").lower() == "https"
        or http_request.url.scheme == "https"
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_https,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return response


@router.post("/auth/logout")
async def logout(request: Request):
    """Clear the auth cookie and log the user out."""
    response = JSONResponse(content={"message": "Logged out"})
    is_https = (
        request.headers.get("x-forwarded-proto", "").lower() == "https"
        or request.url.scheme == "https"
    )
    response.delete_cookie(key="access_token", httponly=True, samesite="lax", secure=is_https)
    return response


@router.post("/token")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login endpoint.
    Accepts username (email) and password, sets HttpOnly cookie with token.
    Unapproved users are blocked from logging in.
    """
    result = perform_password_login(db, form_data.username, form_data.password)

    # Create response with HttpOnly cookie
    response = JSONResponse(content={
        "token_type": result["token_type"],
        "must_change_password": result.get("must_change_password", False)
    })

    # Set HttpOnly secure cookie with auth token
    is_https = (
        request.headers.get("x-forwarded-proto", "").lower() == "https"
        or request.url.scheme == "https"
    )
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=is_https,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return response