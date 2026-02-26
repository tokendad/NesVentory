"""
Agents router: endpoints for the RL-based CategoryAgent.
"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..deps import get_db
from .. import models, auth
from ..category_agent import CategoryAgent

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])

AGENT_ID = "category_agent_v1"
MAX_TRAINING_SAMPLES = 50_000

# Known D56 series allow-list for feedback validation
KNOWN_SERIES = {
    "The Original Snow Village", "Dickens' Village", "New England Village",
    "Alpine Village", "Christmas in the City", "North Pole Series",
    "Little Town of Bethlehem", "Snow Village Halloween", "Figurines",
    "General Village Accessories", "Disney Parks Village Series",
    "Harry Potter Village", "Grinch Village", "Other",
}


def _load_agent(db: Session) -> CategoryAgent:
    """Load CategoryAgent from DB, or return a fresh one."""
    record = db.get(models.AgentModel, AGENT_ID)
    if record and record.model_data:
        try:
            return CategoryAgent.deserialize(record.model_data)
        except Exception as e:
            logger.warning("Failed to deserialize CategoryAgent, starting fresh: %s", e)
    return CategoryAgent()


def _save_agent(agent: CategoryAgent, db: Session) -> None:
    """Persist CategoryAgent state to DB."""
    now = datetime.utcnow()
    record = db.get(models.AgentModel, AGENT_ID)
    if record is None:
        record = models.AgentModel(
            id=AGENT_ID,
            agent_type="categorization",
            created_at=now,
            updated_at=now,
        )
        db.add(record)
    record.model_data = agent.serialize()
    record.training_samples = agent.training_samples
    record.version = agent.version
    record.last_trained_at = now
    record.updated_at = now
    db.commit()


# ── Request / Response schemas ────────────────────────────────────────────────

class PredictRequest(BaseModel):
    name: str
    description: str = ""


class FeedbackRequest(BaseModel):
    item_id: Optional[str] = None
    input_text: str = Field(..., max_length=500)
    predicted_series: Optional[str] = Field(None, max_length=100)
    accepted_series: str = Field(..., max_length=100)
    was_override: bool
    user_action: Optional[str] = None  # 'ACCEPTED' | 'REJECTED'

    @field_validator('accepted_series')
    @classmethod
    def series_must_be_known(cls, v: str) -> str:
        if v not in KNOWN_SERIES:
            raise ValueError(f"Unknown series: {v!r}")
        return v


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/categorize/predict")
def predict_category(
    payload: PredictRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    agent = _load_agent(db)
    return agent.predict(payload.name, payload.description)


@router.post("/categorize/feedback")
def record_feedback(
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    agent = _load_agent(db)

    # Reject if corpus is at capacity to prevent memory/storage exhaustion
    if agent.training_samples >= MAX_TRAINING_SAMPLES:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Training corpus capacity reached")

    # Derive reward: +1 if accepted / not overridden, -1 if rejected/overridden
    if payload.user_action == "REJECTED" or payload.was_override:
        reward = -1.0
    else:
        reward = 1.0

    # Train on the correct label
    agent.learn(payload.input_text, "", payload.accepted_series)
    _save_agent(agent, db)

    # Persist training log entry
    log_entry = models.AgentTrainingLog(
        id=str(uuid4()),
        agent_id=AGENT_ID,
        item_id=payload.item_id,
        input_text=payload.input_text,
        predicted_series=payload.predicted_series,
        accepted_series=payload.accepted_series,
        was_override=payload.was_override,
        reward=reward,
        user_action=payload.user_action,
        created_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()

    return {"trained": True, "training_samples": agent.training_samples}


@router.get("/categorize/status")
def get_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = db.get(models.AgentModel, AGENT_ID)
    agent = _load_agent(db)
    result: dict = {
        "training_samples": agent.training_samples,
        "model_version": agent.version,
        "last_trained_at": record.last_trained_at if record else None,
    }
    # Only expose detailed distribution to admins (avoids leaking user-submitted series strings)
    if current_user.role == models.UserRole.ADMIN:
        result["series_distribution"] = agent.get_series_distribution()
    return result


class SeedRequest(BaseModel):
    """Accept raw training data only — no pre-built model objects to prevent arbitrary code execution."""
    X: list[str] = Field(..., description="Training input texts (item name + description)", max_length=50000)
    y: list[str] = Field(..., description="Training labels (series names)")

    @field_validator('y')
    @classmethod
    def labels_must_be_known(cls, v: list[str]) -> list[str]:
        unknown = [s for s in v if s not in KNOWN_SERIES]
        if unknown:
            raise ValueError(f"Unknown series in labels: {unknown[:5]!r}")
        return v


@router.post("/categorize/seed", status_code=status.HTTP_200_OK)
def seed_agent(
    payload: SeedRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Seed the CategoryAgent from raw training data (re-trains server-side, no model upload)."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    if len(payload.X) != len(payload.y):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X and y must have equal length")
    if len(payload.X) > MAX_TRAINING_SAMPLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Too many training samples (max {MAX_TRAINING_SAMPLES})")
    agent = CategoryAgent()
    agent._X = [str(x)[:500] for x in payload.X]   # truncate each sample
    agent._y = payload.y
    agent.training_samples = len(agent._X)
    agent._retrain()
    _save_agent(agent, db)
    return {"seeded": True, "training_samples": agent.training_samples, "model_version": agent.version}


@router.delete("/categorize/reset", status_code=status.HTTP_200_OK)
def reset_agent(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    record = db.get(models.AgentModel, AGENT_ID)
    if record:
        record.model_data = None
        record.training_samples = 0
        record.version = 1
        record.last_trained_at = None
        record.updated_at = datetime.utcnow()
        db.commit()

    return {"reset": True}
