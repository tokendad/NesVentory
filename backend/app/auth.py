from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .config import get_settings
from . import models
from .deps import get_db

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)



def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password using bcrypt."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_api_key(db: Session, api_key: str) -> Optional[models.User]:
    """Look up a user by their API key."""
    return db.query(models.User).filter(models.User.api_key == api_key).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    user = get_user_by_email(db, email=email)
    if not user:
        return None
    # Google OAuth users without password cannot login with password
    if not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_user_by_google_id(db: Session, google_id: str) -> Optional[models.User]:
    """Look up a user by their Google ID."""
    return db.query(models.User).filter(models.User.google_id == google_id).first()


def verify_google_token(token: str) -> Optional[dict]:
    """
    Verify Google OAuth ID token and return user info.
    
    Args:
        token: The Google OAuth ID token (JWT) from the client
        
    Returns:
        A dictionary containing user info if verification succeeds:
        - google_id: Google's unique user ID (the 'sub' claim)
        - email: User's email address
        - email_verified: Whether the email has been verified by Google
        - name: User's display name (may be None)
        - picture: URL to user's profile picture (may be None)
        
        Returns None if verification fails.
    """
    if not settings.GOOGLE_CLIENT_ID:
        return None
    
    try:
        # Verify the token using Google's public keys
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return None
        
        return {
            'google_id': idinfo['sub'],
            'email': idinfo.get('email'),
            'email_verified': idinfo.get('email_verified', False),
            'name': idinfo.get('name'),
            'picture': idinfo.get('picture')
        }
    except ValueError:
        # Invalid token (expired, wrong audience, malformed, etc.)
        return None


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    api_key: Optional[str] = Depends(api_key_header),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # First, try API key authentication
    if api_key:
        user = get_user_by_api_key(db, api_key)
        if user:
            return user
        # If API key was provided but invalid, raise error
        raise credentials_exception
    
    # Fall back to JWT token authentication
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
