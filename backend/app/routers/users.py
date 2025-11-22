from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List
from uuid import UUID

from ..deps import get_db
from ..auth import get_current_user, get_password_hash, verify_password
from ..schemas import User, UserCreate, UserUpdate, UserPasswordUpdate
from .. import models

router = APIRouter()


@router.post("/register", response_model=User)
async def register_user(
    user_create: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Public endpoint for user registration.
    New users are created with 'viewer' role by default.
    """
    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == user_create.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use"
        )
    
    # Create new user with viewer role by default
    new_user = models.User(
        email=user_create.email,
        password_hash=get_password_hash(user_create.password),
        full_name=user_create.full_name,
        role=models.UserRole.VIEWER  # Default role for self-registered users
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Dependency that ensures the current user is an admin."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's profile information."""
    return current_user


@router.put("/me", response_model=User)
async def update_current_user(
    user_update: UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile information."""
    if user_update.email is not None:
        # Check if email is already taken by another user
        existing = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = user_update.email
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
async def update_current_user_password(
    password_update: UserPasswordUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's password."""
    # Verify current password
    if not verify_password(password_update.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update to new password
    current_user.password_hash = get_password_hash(password_update.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


# Admin-only endpoints

@router.get("/users", response_model=List[User])
async def list_users(
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users (admin only)."""
    users = db.query(models.User).all()
    return users


@router.post("/users", response_model=User)
async def create_user(
    user_create: UserCreate,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)."""
    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == user_create.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use"
        )
    
    new_user = models.User(
        email=user_create.email,
        password_hash=get_password_hash(user_create.password),
        full_name=user_create.full_name,
        role=user_create.role or models.UserRole.VIEWER
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a user's information (admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user_update.email is not None:
        # Check if email is already taken by another user
        existing = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = user_update.email
    
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    if user_update.role is not None:
        user.role = user_update.role
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)."""
    # Prevent deleting yourself
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting the last admin
    if user.role == models.UserRole.ADMIN:
        admin_count = db.query(models.User).filter(
            models.User.role == models.UserRole.ADMIN
        ).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin user"
            )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.get("/admin/health")
async def get_system_health(
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get system health information (admin only)."""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        database_status = "healthy"
    except Exception as e:
        database_status = f"unhealthy: {str(e)}"
    
    # Get counts
    user_count = db.query(models.User).count()
    item_count = db.query(models.Item).count()
    location_count = db.query(models.Location).count()
    
    return {
        "status": "healthy" if database_status == "healthy" else "degraded",
        "database": database_status,
        "counts": {
            "users": user_count,
            "items": item_count,
            "locations": location_count
        }
    }


@router.get("/admin/database-size")
async def get_database_size(
    admin_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get database size information (admin only)."""
    try:
        # Get table sizes (PostgreSQL specific)
        result = db.execute(text("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        """))
        
        tables = []
        total_bytes = 0
        for row in result:
            tables.append({
                "table": row[1],
                "size": row[2],
                "size_bytes": row[3]
            })
            total_bytes += row[3]
        
        # Get photo count and estimated size
        photo_count = db.query(models.Photo).count()
        document_count = db.query(models.Document).count()
        
        return {
            "total_size_bytes": total_bytes,
            "total_size_pretty": _format_bytes(total_bytes),
            "tables": tables,
            "media": {
                "photos": photo_count,
                "documents": document_count,
                "note": "Photo and document files are stored on disk, not included in database size"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving database size: {str(e)}"
        )


def _format_bytes(bytes_size: int) -> str:
    """Format bytes into human-readable size."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} PB"
