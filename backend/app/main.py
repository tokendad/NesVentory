from datetime import timedelta
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import auth, crud, models, schemas
from .config import get_settings
from .database import Base, engine, get_db

# Create tables on startup (for now; can be replaced with Alembic later)
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="InvenTree API",
    description=(
        "Starter backend for the InvenTree home inventory app.

"
        "Includes authentication, nested locations, items, and maintenance tasks."
    ),
    version="0.1.0",
)

# CORS – permissive for now; tighten later as needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health check ---


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok"}


# --- Auth / Users ---


@app.post("/auth/register", response_model=schemas.UserRead, tags=["auth"])
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = auth.get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = crud.create_user(db, user_in)
    return user


@app.post("/auth/token", response_model=schemas.Token, tags=["auth"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = auth.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )
    return schemas.Token(access_token=access_token)


@app.get("/users/me", response_model=schemas.UserRead, tags=["users"])
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- Locations ---


@app.post("/locations", response_model=schemas.LocationRead, tags=["locations"])
def create_location(
    loc_in: schemas.LocationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # For now, any authenticated user can create locations
    loc = crud.create_location(db, loc_in)
    return loc


@app.get("/locations", response_model=List[schemas.LocationRead], tags=["locations"])
def list_locations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return crud.get_locations(db)


@app.get("/locations/{loc_id}", response_model=schemas.LocationRead, tags=["locations"])
def get_location(
    loc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    loc = crud.get_location(db, loc_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


# --- Items ---


@app.post("/items", response_model=schemas.ItemRead, tags=["items"])
def create_item(
    item_in: schemas.ItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = crud.create_item(db, item_in, owner_id=current_user.id)
    return item


@app.get("/items", response_model=List[schemas.ItemRead], tags=["items"])
def list_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return crud.get_items(db)


@app.get("/items/{item_id}", response_model=schemas.ItemRead, tags=["items"])
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


# --- Maintenance ---


@app.post("/maintenance", response_model=schemas.MaintenanceTaskRead, tags=["maintenance"])
def create_maintenance_task(
    task_in: schemas.MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # We could verify current_user owns the item here in a future pass
    task = crud.create_maintenance_task(db, task_in)
    return task


@app.get(
    "/items/{item_id}/maintenance",
    response_model=List[schemas.MaintenanceTaskRead],
    tags=["maintenance"],
)
def list_item_maintenance_tasks(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    tasks = crud.get_maintenance_tasks_for_item(db, item_id)
    return tasks


# --- Future stubs ---


@app.get("/integrations/barcode/lookup", tags=["integrations"])
def barcode_lookup_stub(barcode: str):
    """Placeholder endpoint for future barcode/UPC integrations."""
    return {
        "barcode": barcode,
        "status": "not_implemented",
        "message": "Barcode lookup integration will be implemented in a future version.",
    }


@app.get("/reports/insurance", tags=["reports"])
def insurance_report_stub():
    """Placeholder endpoint for future insurance report/PDF generation."""
    return {
        "status": "not_implemented",
        "message": "Insurance report generation will be implemented in a future version.",
    }
