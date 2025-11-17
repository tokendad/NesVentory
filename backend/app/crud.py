from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas
from .auth import get_password_hash


# --- Users ---


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    hashed_pw = get_password_hash(user_in.password)
    db_user = models.User(email=user_in.email, hashed_password=hashed_pw)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# --- Locations ---


def create_location(db: Session, loc_in: schemas.LocationCreate) -> models.Location:
    db_loc = models.Location(
        name=loc_in.name,
        description=loc_in.description,
        parent_id=loc_in.parent_id,
    )
    db.add(db_loc)
    db.commit()
    db.refresh(db_loc)
    return db_loc


def get_locations(db: Session) -> List[models.Location]:
    return db.query(models.Location).all()


def get_location(db: Session, loc_id: int) -> Optional[models.Location]:
    return db.query(models.Location).filter(models.Location.id == loc_id).first()


# --- Items ---


def create_item(db: Session, item_in: schemas.ItemCreate, owner_id: int) -> models.Item:
    db_item = models.Item(**item_in.model_copy().dict(), owner_id=owner_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def get_items(db: Session) -> List[models.Item]:
    return db.query(models.Item).all()


def get_item(db: Session, item_id: int) -> Optional[models.Item]:
    return db.query(models.Item).filter(models.Item.id == item_id).first()


# --- Maintenance ---


def create_maintenance_task(
    db: Session, task_in: schemas.MaintenanceTaskCreate
) -> models.MaintenanceTask:
    db_task = models.MaintenanceTask(**task_in.model_copy().dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_maintenance_tasks_for_item(
    db: Session, item_id: int
) -> List[models.MaintenanceTask]:
    return (
        db.query(models.MaintenanceTask)
        .filter(models.MaintenanceTask.item_id == item_id)
        .all()
    )
