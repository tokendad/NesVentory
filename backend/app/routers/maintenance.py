from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_db
from ..auth import get_current_user
from .. import crud, schemas, models

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.post("/", response_model=schemas.MaintenanceTask, status_code=status.HTTP_201_CREATED)
def create_maintenance_task(
    task: schemas.MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new maintenance task for an item."""
    return crud.create_maintenance_task(db, task)


@router.get("/", response_model=List[schemas.MaintenanceTask])
def get_all_maintenance_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all maintenance tasks (for calendar view)."""
    return crud.get_all_maintenance_tasks(db)


@router.get("/item/{item_id}", response_model=List[schemas.MaintenanceTask])
def get_maintenance_tasks_for_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all maintenance tasks for a specific item."""
    return crud.get_maintenance_tasks_for_item(db, item_id)


@router.get("/{task_id}", response_model=schemas.MaintenanceTask)
def get_maintenance_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific maintenance task."""
    task = crud.get_maintenance_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    return task


@router.put("/{task_id}", response_model=schemas.MaintenanceTask)
def update_maintenance_task(
    task_id: UUID,
    task_update: schemas.MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a maintenance task."""
    updated_task = crud.update_maintenance_task(db, task_id, task_update)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    return updated_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a maintenance task."""
    success = crud.delete_maintenance_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    return None
