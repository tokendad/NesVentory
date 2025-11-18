
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Enum,
    ForeignKey,
    Boolean,
    Integer,
    Numeric,
    Text,
    Date,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .database import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.ADMIN)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    full_path = Column(String(1024), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    parent = relationship("Location", remote_side=[id], backref="children")
    items = relationship("Item", back_populates="location")


class Item(Base):
    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    brand = Column(String(255), nullable=True)
    model_number = Column(String(255), nullable=True)
    serial_number = Column(String(255), nullable=True)

    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=True)
    estimated_value = Column(Numeric(12, 2), nullable=True)
    retailer = Column(String(255), nullable=True)

    # UPC / barcode
    upc = Column(String(64), nullable=True, index=True)

    # Embedded warranties as JSONB array of objects
    # [
    #   {
    #       "type": "manufacturer" | "extended",
    #       "provider": "...",
    #       "policy_number": "...",
    #       "duration_months": 24,
    #       "expiration_date": "2025-12-31",
    #       "notes": "..."
    #   }
    # ]
    warranties = Column(JSONB, nullable=True)

    # Relationships
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    data_tag_photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    location = relationship("Location", back_populates="items")
    photos = relationship("Photo", back_populates="item", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="item", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="item", cascade="all, delete-orphan")

    data_tag_photo = relationship("Photo", foreign_keys=[data_tag_photo_id], post_update=True)


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    path = Column(String(1024), nullable=False)
    mime_type = Column(String(128), nullable=True)

    is_primary = Column(Boolean, default=False, nullable=False)
    is_data_tag = Column(Boolean, default=False, nullable=False)

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="photos")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(128), nullable=True)
    path = Column(String(1024), nullable=False)

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="documents")


class RecurrenceType(str, Enum):
    NONE = "none"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM_DAYS = "custom_days"


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    next_due_date = Column(Date, nullable=True)
    recurrence_type = Column(Enum(RecurrenceType, name="recurrence_type"), nullable=False, default=RecurrenceType.NONE)
    recurrence_interval = Column(Integer, nullable=True)  # e.g. every 90 days for custom_days

    last_completed = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="maintenance_tasks")
