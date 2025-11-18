from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..deps import get_db

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=List[schemas.Item])
def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()


@router.post("/", response_model=schemas.Item, status_code=status.HTTP_201_CREATED)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    item = models.Item(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=schemas.Item)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=schemas.Item)
def update_item(
    item_id: int,
    payload: schemas.ItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return None
