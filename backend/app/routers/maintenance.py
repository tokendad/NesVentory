from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import models, schemas
from ..deps import get_db

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/", response_model=List[schemas.MaintenanceTask])
def list_maintenance_tasks(db: Session = Depends(get_db)):
    """List all maintenance tasks."""
    return db.query(models.MaintenanceTask).all()


@router.post("/", response_model=schemas.MaintenanceTask, status_code=status.HTTP_201_CREATED)
def create_maintenance_task(payload: schemas.MaintenanceTaskCreate, db: Session = Depends(get_db)):
    """Create a new maintenance task."""
    task = models.MaintenanceTask(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=schemas.MaintenanceTask)
def get_maintenance_task(task_id: UUID, db: Session = Depends(get_db)):
    """Get a specific maintenance task by ID."""
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    return task


@router.put("/{task_id}", response_model=schemas.MaintenanceTask)
def update_maintenance_task(task_id: UUID, payload: schemas.MaintenanceTaskCreate, db: Session = Depends(get_db)):
    """Update a maintenance task."""
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    
    for key, value in payload.model_dump().items():
        setattr(task, key, value)
    
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_task(task_id: UUID, db: Session = Depends(get_db)):
    """Delete a maintenance task."""
    task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    
    db.delete(task)
    db.commit()
    return None
