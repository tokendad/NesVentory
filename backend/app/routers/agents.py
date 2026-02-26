"""
Agents router: endpoints for the RL-based CategoryAgent.
"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..deps import get_db
from .. import models, auth
from ..category_agent import CategoryAgent

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])

AGENT_ID = "category_agent_v1"


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
    input_text: str
    predicted_series: Optional[str] = None
    accepted_series: str
    was_override: bool
    user_action: Optional[str] = None  # 'ACCEPTED' | 'REJECTED'


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
    return {
        "training_samples": agent.training_samples,
        "model_version": agent.version,
        "last_trained_at": record.last_trained_at if record else None,
        "series_distribution": agent.get_series_distribution(),
    }


class SeedRequest(BaseModel):
    model_data: str  # base64-encoded pickle from pretrain_category_agent.py


@router.post("/categorize/seed", status_code=status.HTTP_200_OK)
def seed_agent(
    payload: SeedRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Load a pre-trained CategoryAgent from the pretrain script output."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    try:
        agent = CategoryAgent.deserialize(payload.model_data)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid model data")
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
