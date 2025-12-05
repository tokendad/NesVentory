import uuid
from datetime import datetime, date
import enum

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
    Table,
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
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


# Association table for many-to-many relationship between users and locations (access control)
# Defined before User class to ensure proper initialization
user_location_access = Table(
    'user_location_access',
    Base.metadata,
    Column('user_id', UUID(), ForeignKey('users.id'), primary_key=True),
    Column('location_id', UUID(), ForeignKey('locations.id'), primary_key=True)
)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    full_name = Column(String(255), nullable=True)
    
    # Google OAuth - stores Google account ID for SSO
    google_id = Column(String(255), unique=True, nullable=True, index=True)

    # Pass the values of the Enum directly to avoid type confusion
    role = Column(Enum(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER, name="user_role", type_=String),
                  nullable=False, default=UserRole.ADMIN)
    
    # API key for mobile/external app authentication
    api_key = Column(String(64), unique=True, nullable=True, index=True)
    
    # Approval status for new users (admins must approve before they can access the system)
    is_approved = Column(Boolean, default=False, nullable=False)
    
    # AI Valuation Schedule Settings
    ai_schedule_enabled = Column(Boolean, default=False, nullable=False)
    ai_schedule_interval_days = Column(Integer, default=7, nullable=False)  # Default: 1 week
    ai_schedule_last_run = Column(DateTime, nullable=True)
    
    # Google Drive Backup Settings
    gdrive_refresh_token = Column(Text, nullable=True)  # OAuth refresh token for Drive API
    gdrive_last_backup = Column(DateTime, nullable=True)  # Timestamp of last successful backup
    
    # UPC Database Configuration - stored as JSON array with priority order
    # Format: [{"id": "gemini", "enabled": true, "api_key": null}, {"id": "upcdatabase", "enabled": true, "api_key": "..."}, ...]
    # The order of items in the array determines the lookup priority (first = highest priority)
    upc_databases = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship for location access (many-to-many)
    allowed_locations = relationship("Location", secondary=user_location_access, back_populates="allowed_users")
    
    # Living items associated with this user (for "is_current_user" items)
    living_items = relationship("Item", foreign_keys="[Item.associated_user_id]", back_populates="associated_user")


# Association table for many-to-many relationship between items and tags
item_tags = Table(
    'item_tags',
    Base.metadata,
    Column('item_id', UUID(), ForeignKey('items.id'), primary_key=True),
    Column('tag_id', UUID(), ForeignKey('tags.id'), primary_key=True)
)


class LocationType(str, enum.Enum):
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
    
    # Flag for primary/main locations (homes)
    is_primary_location = Column(Boolean, default=False, nullable=False)
    
    # Flag for container locations (boxes, bins, cases that contain multiple items)
    is_container = Column(Boolean, default=False, nullable=False)
    
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
    
    # Landlord information for multi-family/apartment buildings
    # {
    #   "name": "...",
    #   "company": "...",
    #   "phone": "...",
    #   "email": "...",
    #   "address": "...",
    #   "notes": "..."
    # }
    landlord_info = Column(JSON, nullable=True)
    
    # Tenant information for units/apartments
    # {
    #   "name": "...",
    #   "phone": "...",
    #   "email": "...",
    #   "lease_start": "...",
    #   "lease_end": "...",
    #   "rent_amount": ...,
    #   "notes": "..."
    # }
    tenant_info = Column(JSON, nullable=True)
    
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
    
    # Use explicit enum values for SQLAlchemy compatibility
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
    
    # Relationship for user access control (many-to-many)
    allowed_users = relationship("User", secondary="user_location_access", back_populates="allowed_locations")


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
    # Tracking for estimated value source (AI or user)
    estimated_value_ai_date = Column(String(20), nullable=True)  # Date when AI estimated (MM/DD/YY format)
    estimated_value_user_date = Column(String(20), nullable=True)  # Date when user supplied (MM/DD/YY format)
    estimated_value_user_name = Column(String(255), nullable=True)  # Username who supplied the value
    retailer = Column(String(255), nullable=True)

    # UPC / barcode
    upc = Column(String(64), nullable=True, index=True)

    # JSON column for cross-database compatibility (SQLite/PostgreSQL)
    # Note: PostgreSQL JSONB offers better performance, but JSON works across both
    warranties = Column(JSON, nullable=True)
    
    # Living item fields (for people, pets, plants, etc.)
    is_living = Column(Boolean, default=False, nullable=False)
    birthdate = Column(Date, nullable=True)
    # Contact information stored as JSON for flexibility
    # {
    #   "phone": "...",
    #   "email": "...",
    #   "address": "...",
    #   "notes": "..."
    # }
    contact_info = Column(JSON, nullable=True)
    # Relationship to logged-in user (e.g., "mother", "father", "sister", "pet", "plant")
    relationship_type = Column(String(100), nullable=True)
    # Flag if this living item is the currently logged-in user themselves
    is_current_user = Column(Boolean, default=False, nullable=False)
    # Reference to the user account if this living item is associated with a user
    associated_user_id = Column(UUID(), ForeignKey("users.id"), nullable=True)

    # Relationships
    location_id = Column(UUID(), ForeignKey("locations.id"), nullable=True)
    data_tag_photo_id = Column(UUID(), ForeignKey("photos.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    location = relationship("Location", back_populates="items")
    photos = relationship("Photo", back_populates="item", foreign_keys="[Photo.item_id]", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="item", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="item", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=item_tags, back_populates="items")
    associated_user = relationship("User", foreign_keys=[associated_user_id], back_populates="living_items")

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
    document_type = Column(String(64), nullable=True)  # 'manual', 'attachment', etc.

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="documents")


class RecurrenceType(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    BI_WEEKLY = "bi_weekly"
    MONTHLY = "monthly"
    BI_MONTHLY = "bi_monthly"
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
        Enum(
            RecurrenceType.NONE,
            RecurrenceType.DAILY,
            RecurrenceType.WEEKLY,
            RecurrenceType.BI_WEEKLY,
            RecurrenceType.MONTHLY,
            RecurrenceType.BI_MONTHLY,
            RecurrenceType.YEARLY,
            RecurrenceType.CUSTOM_DAYS,
            name="recurrence_type"
        ),
        nullable=False,
        default=RecurrenceType.NONE
    )
    recurrence_interval = Column(Integer, nullable=True)  # e.g. every 90 days for custom_days
    color = Column(String(7), nullable=True, default="#3b82f6")  # Hex color code

    last_completed = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="maintenance_tasks")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    is_predefined = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship("Item", secondary=item_tags, back_populates="tags")


class SystemSettings(Base):
    """
    System-wide settings that can be configured via the admin panel.
    
    These settings are only used when the corresponding environment variable is not set.
    Environment variables always take priority over database settings.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, default=1)  # Only one row
    
    # Google Gemini AI settings (only used if GEMINI_API_KEY env var is not set)
    gemini_api_key = Column(String(255), nullable=True)
    
    # Google OAuth settings (only used if GOOGLE_CLIENT_ID/SECRET env vars are not set)
    google_client_id = Column(String(255), nullable=True)
    google_client_secret = Column(String(255), nullable=True)
    
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow(), nullable=False)

