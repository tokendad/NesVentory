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
    locations = db.query(models.Location).all()
    return locations if locations is not None else []


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

    db.delete(loc)
    db.commit()
    return None
