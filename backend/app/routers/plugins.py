"""
Plugin management router.

Provides CRUD operations for managing external LLM plugins.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from .. import models, schemas, auth
from ..deps import get_db
from ..plugin_service import test_plugin_connection

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("/", response_model=List[schemas.Plugin])
def list_plugins(
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """List all configured plugins."""
    plugins = db.query(models.Plugin).order_by(models.Plugin.priority).all()
    return plugins


@router.get("/{plugin_id}", response_model=schemas.Plugin)
def get_plugin(
    plugin_id: UUID,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a specific plugin by ID."""
    plugin = db.query(models.Plugin).filter(models.Plugin.id == plugin_id).first()
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    return plugin


@router.post("/", response_model=schemas.Plugin)
def create_plugin(
    plugin: schemas.PluginCreate,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new plugin."""
    db_plugin = models.Plugin(**plugin.model_dump())
    db.add(db_plugin)
    db.commit()
    db.refresh(db_plugin)
    return db_plugin


@router.put("/{plugin_id}", response_model=schemas.Plugin)
def update_plugin(
    plugin_id: UUID,
    plugin_update: schemas.PluginUpdate,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a plugin."""
    db_plugin = db.query(models.Plugin).filter(models.Plugin.id == plugin_id).first()
    if not db_plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    # Update only provided fields
    update_data = plugin_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plugin, key, value)
    
    db.commit()
    db.refresh(db_plugin)
    return db_plugin


@router.delete("/{plugin_id}")
def delete_plugin(
    plugin_id: UUID,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a plugin."""
    db_plugin = db.query(models.Plugin).filter(models.Plugin.id == plugin_id).first()
    if not db_plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    db.delete(db_plugin)
    db.commit()
    return {"message": "Plugin deleted successfully"}


@router.post("/{plugin_id}/test")
def test_plugin(
    plugin_id: UUID,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Test connection to a plugin."""
    plugin = db.query(models.Plugin).filter(models.Plugin.id == plugin_id).first()
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    result = test_plugin_connection(plugin)
    return result
