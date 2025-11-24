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
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator

from .database import Base

# Use String-based UUID for SQLite compatibility
class UUID(TypeDecorator):
    """Platform-independent UUID type. Uses PostgreSQL's UUID type, otherwise uses String."""
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresUUID())
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if isinstance(value, uuid.UUID):
                return value
            else:
                return uuid.UUID(value)


# Updated Enum for UserRole with proper string-based Enum
class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)

    # Pass the values of the Enum directly to avoid type confusion
    role = Column(Enum(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER, name="user_role", type_=String),
                  nullable=False, default=UserRole.ADMIN)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LocationType(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    RETAIL = "retail"
    INDUSTRIAL = "industrial"
    APARTMENT_COMPLEX = "apartment_complex"
    CONDO = "condo"
    MULTI_FAMILY = "multi_family"
    OTHER = "other"


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    parent_id = Column(UUID(), ForeignKey("locations.id"), nullable=True)
    full_path = Column(String(1024), nullable=True)
    
    # New detail fields
    friendly_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    
    # Owner information stored as JSON for SQLite compatibility
    # Note: backend/models.py uses JSONB for PostgreSQL compatibility
    # {
    #   "owner_name": "...",
    #   "spouse_name": "...",
    #   "contact_info": "...",
    #   "notes": "..."
    # }
    owner_info = Column(JSON, nullable=True)
    
    # Insurance information stored as JSON for SQLite compatibility
    # Note: backend/models.py uses JSONB for PostgreSQL compatibility
    # {
    #   "company_name": "...",
    #   "policy_number": "...",
    #   "contact_info": "...",
    #   "coverage_amount": ...,
    #   "notes": "..."
    # }
    insurance_info = Column(JSON, nullable=True)
    
    estimated_property_value = Column(Numeric(12, 2), nullable=True)
    estimated_value_with_items = Column(Numeric(12, 2), nullable=True)
    
    location_type = Column(
        Enum(LocationType.RESIDENTIAL, LocationType.COMMERCIAL, LocationType.RETAIL, 
             LocationType.INDUSTRIAL, LocationType.APARTMENT_COMPLEX, LocationType.CONDO,
             LocationType.MULTI_FAMILY, LocationType.OTHER, name="location_type"),
        nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    parent = relationship("Location", remote_side=[id], backref="children")
    items = relationship("Item", back_populates="location")


class Item(Base):
    __tablename__ = "items"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
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

    # JSON column for cross-database compatibility (SQLite/PostgreSQL)
    # Note: PostgreSQL JSONB offers better performance, but JSON works across both
    warranties = Column(JSON, nullable=True)

    # Relationships
    location_id = Column(UUID(), ForeignKey("locations.id"), nullable=True)
    data_tag_photo_id = Column(UUID(), ForeignKey("photos.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    location = relationship("Location", back_populates="items")
    photos = relationship("Photo", back_populates="item", foreign_keys="[Photo.item_id]", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="item", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="item", cascade="all, delete-orphan")

    data_tag_photo = relationship("Photo", foreign_keys=[data_tag_photo_id], post_update=True)


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(), ForeignKey("items.id"), nullable=False)
    path = Column(String(1024), nullable=False)
    mime_type = Column(String(128), nullable=True)

    is_primary = Column(Boolean, default=False, nullable=False)
    is_data_tag = Column(Boolean, default=False, nullable=False)
    photo_type = Column(String(64), nullable=True)  # 'default', 'data_tag', 'receipt', 'warranty', 'optional'

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="photos", foreign_keys=[item_id])


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(), ForeignKey("items.id"), nullable=False)
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

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(), ForeignKey("items.id"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    next_due_date = Column(Date, nullable=True)
    recurrence_type = Column(
        Enum(RecurrenceType.NONE, RecurrenceType.MONTHLY, RecurrenceType.YEARLY, RecurrenceType.CUSTOM_DAYS, name="recurrence_type"),
        nullable=False,
        default=RecurrenceType.NONE
    )
    recurrence_interval = Column(Integer, nullable=True)  # e.g. every 90 days for custom_days

    last_completed = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="maintenance_tasks")
