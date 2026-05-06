from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..deps import get_db
from .. import models, auth
from ..logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class RoomCreate(BaseModel):
    name: str
    location_category: Optional[str] = None


class HomeSetupRequest(BaseModel):
    """Payload for the home-creation onboarding step."""
    home_name: str
    rooms: List[RoomCreate] = []


class HomeSetupResponse(BaseModel):
    home_id: str
    home_name: str
    rooms_created: int


@router.post("/home", response_model=HomeSetupResponse, status_code=status.HTTP_201_CREATED)
def create_home_setup(
    payload: HomeSetupRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Onboarding: atomically create a primary home location and optional rooms.

    Only admins can run this step. Fails if a primary location already exists
    so that upgrading installs cannot accidentally duplicate the home structure.
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Prevent duplicate primary locations
    existing_primary = db.query(models.Location).filter(
        models.Location.is_primary_location == True
    ).first()
    if existing_primary:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A primary home location already exists"
        )

    # Check for any existing locations at all (upgrade-safe guard)
    location_count = db.query(models.Location).count()
    if location_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Locations already exist. Use the location management page to add more."
        )

    home_name = payload.home_name.strip() or "Home"

    home = models.Location(
        name=home_name,
        is_primary_location=True,
        location_category="home",
    )
    db.add(home)
    db.flush()  # get home.id without committing

    rooms_created = 0
    for room_data in payload.rooms:
        name = room_data.name.strip()
        if not name:
            continue
        room = models.Location(
            name=name,
            parent_id=home.id,
            location_category=room_data.location_category or "room",
        )
        db.add(room)
        rooms_created += 1

    db.commit()
    db.refresh(home)
    logger.info(
        f"Home onboarding complete: '{home.name}' (id={home.id}), "
        f"{rooms_created} rooms created by admin {current_user.email}"
    )
    return HomeSetupResponse(
        home_id=str(home.id),
        home_name=home.name,
        rooms_created=rooms_created,
    )
