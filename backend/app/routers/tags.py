from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import models, schemas
from ..deps import get_db
from ..logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=List[schemas.Tag])
def list_tags(db: Session = Depends(get_db)):
    """List all tags."""
    return db.query(models.Tag).all()


@router.post("/", response_model=schemas.Tag, status_code=status.HTTP_201_CREATED)
def create_tag(payload: schemas.TagCreate, db: Session = Depends(get_db)):
    """Create a new custom tag."""
    # Check if tag already exists
    existing = db.query(models.Tag).filter(models.Tag.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    tag = models.Tag(**payload.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.get("/{tag_id}", response_model=schemas.Tag)
def get_tag(tag_id: UUID, db: Session = Depends(get_db)):
    """Get a specific tag by ID."""
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: UUID, db: Session = Depends(get_db)):
    """Delete a tag (only custom tags can be deleted)."""
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    if tag.is_predefined:
        raise HTTPException(status_code=400, detail="Cannot delete predefined tags")
    
    db.delete(tag)
    db.commit()
    return None
