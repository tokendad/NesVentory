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


@router.post("/bulk-delete", response_model=schemas.BulkDeleteResponse)
def bulk_delete_items(
    payload: schemas.BulkDeleteRequest,
    db: Session = Depends(get_db),
):
    """Delete multiple items at once."""
    items = db.query(models.Item).filter(models.Item.id.in_(payload.item_ids)).all()
    deleted_count = len(items)
    
    for item in items:
        db.delete(item)
    
    db.commit()
    return schemas.BulkDeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted {deleted_count} item(s)"
    )


@router.post("/bulk-update-tags", response_model=schemas.BulkUpdateTagsResponse)
def bulk_update_tags(
    payload: schemas.BulkUpdateTagsRequest,
    db: Session = Depends(get_db),
):
    """Update tags on multiple items at once."""
    items = db.query(models.Item).filter(models.Item.id.in_(payload.item_ids)).all()
    tags = db.query(models.Tag).filter(models.Tag.id.in_(payload.tag_ids)).all()
    
    updated_count = 0
    for item in items:
        if payload.mode == "replace":
            item.tags = tags
        elif payload.mode == "add":
            existing_tag_ids = {tag.id for tag in item.tags}
            for tag in tags:
                if tag.id not in existing_tag_ids:
                    item.tags.append(tag)
        elif payload.mode == "remove":
            item.tags = [tag for tag in item.tags if tag.id not in payload.tag_ids]
        updated_count += 1
    
    db.commit()
    return schemas.BulkUpdateTagsResponse(
        updated_count=updated_count,
        message=f"Successfully updated tags on {updated_count} item(s)"
    )


@router.post("/bulk-update-location", response_model=schemas.BulkUpdateLocationResponse)
def bulk_update_location(
    payload: schemas.BulkUpdateLocationRequest,
    db: Session = Depends(get_db),
):
    """Update location on multiple items at once."""
    # Verify location exists if provided
    if payload.location_id:
        location = db.query(models.Location).filter(
            models.Location.id == payload.location_id
        ).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
    
    items = db.query(models.Item).filter(models.Item.id.in_(payload.item_ids)).all()
    
    updated_count = 0
    for item in items:
        item.location_id = payload.location_id
        updated_count += 1
    
    db.commit()
    return schemas.BulkUpdateLocationResponse(
        updated_count=updated_count,
        message=f"Successfully updated location on {updated_count} item(s)"
    )
