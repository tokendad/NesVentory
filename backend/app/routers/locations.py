from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import models, schemas
from ..deps import get_db

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=List[schemas.Location])
def list_locations(db: Session = Depends(get_db)):
    """Get all locations. Always returns a JSON array, even if empty."""
    return db.query(models.Location).all()


@router.post("/", response_model=schemas.Location, status_code=status.HTTP_201_CREATED)
def create_location(payload: schemas.LocationCreate, db: Session = Depends(get_db)):
    loc = models.Location(**payload.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.get("/{location_id}", response_model=schemas.Location)
def get_location(location_id: UUID, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.put("/{location_id}", response_model=schemas.Location)
def update_location(
    location_id: UUID,
    payload: schemas.LocationUpdate,
    db: Session = Depends(get_db),
):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(loc, key, value)

    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(location_id: UUID, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    # Get the parent location ID (will be None if this is a top-level location)
    parent_location_id = loc.parent_id
    
    # Move all items from this location to the parent location using bulk update
    db.query(models.Item).filter(models.Item.location_id == location_id).update(
        {"location_id": parent_location_id}, synchronize_session=False
    )
    
    # Move all child locations to the parent location using bulk update
    db.query(models.Location).filter(models.Location.parent_id == location_id).update(
        {"parent_id": parent_location_id}, synchronize_session=False
    )
    
    # Videos will be cascade deleted automatically due to the relationship definition
    # in the Location model: videos = relationship("Video", back_populates="location", cascade="all, delete-orphan")
    
    db.delete(loc)
    db.commit()
    return None
