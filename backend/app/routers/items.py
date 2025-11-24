from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import models, schemas
from ..deps import get_db

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=List[schemas.Item])
def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()


@router.post("/", response_model=schemas.Item, status_code=status.HTTP_201_CREATED)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    # Extract tag_ids from payload
    tag_ids = payload.tag_ids
    payload_dict = payload.model_dump(exclude={'tag_ids'})
    
    item = models.Item(**payload_dict)
    
    # Add tags if provided
    if tag_ids:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
        item.tags = tags
    
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=schemas.Item)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=schemas.Item)
def update_item(
    item_id: UUID,
    payload: schemas.ItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Extract tag_ids from payload
    tag_ids = payload.tag_ids
    data = payload.model_dump(exclude_unset=True, exclude={'tag_ids'})
    
    for key, value in data.items():
        setattr(item, key, value)
    
    # Update tags if provided
    if tag_ids is not None:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
        item.tags = tags

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: UUID, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return None
