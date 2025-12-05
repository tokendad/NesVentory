from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from decimal import Decimal


# --- Token Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str


# --- User Schemas ---

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


# Schema for admin to create users with custom role and approval status
class AdminUserCreate(UserBase):
    password: str
    role: str = "viewer"
    is_approved: bool = True


class User(UserBase):
    id: UUID
    role: str
    is_approved: bool = False
    created_at: datetime
    updated_at: datetime
    allowed_location_ids: Optional[List[UUID]] = None
    api_key: Optional[str] = None
    # AI Valuation Schedule Settings
    ai_schedule_enabled: bool = False
    ai_schedule_interval_days: int = 7
    ai_schedule_last_run: Optional[datetime] = None
    # UPC Database Configuration
    upc_databases: Optional[List[dict]] = None

    class Config:
        from_attributes = True


# UserRead is an alias for API response consistency
# keeping both allows flexibility for future divergence
class UserRead(UserBase):
    id: UUID
    role: str
    is_approved: bool = False
    created_at: datetime
    updated_at: datetime
    allowed_location_ids: Optional[List[UUID]] = None
    api_key: Optional[str] = None
    # AI Valuation Schedule Settings
    ai_schedule_enabled: bool = False
    ai_schedule_interval_days: int = 7
    ai_schedule_last_run: Optional[datetime] = None
    # UPC Database Configuration
    upc_databases: Optional[List[dict]] = None

    class Config:
        from_attributes = True


# Schema for updating user location access
class UserLocationAccess(BaseModel):
    location_ids: List[UUID]


# Schema for AI schedule settings
class AIScheduleSettings(BaseModel):
    ai_schedule_enabled: bool
    ai_schedule_interval_days: int


# Schema for AI valuation run response
class AIValuationRunResponse(BaseModel):
    items_processed: int
    items_updated: int
    items_skipped: int
    message: str
    ai_schedule_last_run: Optional[datetime] = None


# Schema for AI enrichment run response (for items with data tag photos)
class AIEnrichmentRunResponse(BaseModel):
    items_processed: int
    items_updated: int
    items_skipped: int
    items_with_data_tags: int
    quota_exceeded: bool = False
    message: str


# --- UPC Database Configuration Schemas ---

class UPCDatabaseConfig(BaseModel):
    """Configuration for a single UPC database."""
    id: str  # Database identifier (e.g., 'gemini', 'upcdatabase')
    enabled: bool = True
    api_key: Optional[str] = None  # API key for external services (not needed for Gemini - uses global config)


class UPCDatabaseConfigUpdate(BaseModel):
    """Schema for updating UPC database configurations."""
    upc_databases: List[UPCDatabaseConfig]


class AvailableUPCDatabase(BaseModel):
    """Information about an available UPC database."""
    id: str
    name: str
    description: str
    requires_api_key: bool
    api_key_url: Optional[str] = None  # URL where user can get an API key


class AvailableUPCDatabasesResponse(BaseModel):
    """Response containing available UPC databases."""
    databases: List[AvailableUPCDatabase]


# --- Location Schemas ---

class LocationBase(BaseModel):
    name: str
    parent_id: Optional[UUID] = None
    is_primary_location: bool = False
    is_container: bool = False
    friendly_name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    owner_info: Optional[dict] = None
    landlord_info: Optional[dict] = None
    tenant_info: Optional[dict] = None
    insurance_info: Optional[dict] = None
    estimated_property_value: Optional[Decimal] = None
    estimated_value_with_items: Optional[Decimal] = None
    location_type: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_primary_location: Optional[bool] = None
    is_container: Optional[bool] = None
    friendly_name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    owner_info: Optional[dict] = None
    landlord_info: Optional[dict] = None
    tenant_info: Optional[dict] = None
    insurance_info: Optional[dict] = None
    estimated_property_value: Optional[Decimal] = None
    estimated_value_with_items: Optional[Decimal] = None
    location_type: Optional[str] = None


class Location(LocationBase):
    id: UUID
    full_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Photo Schemas ---

class PhotoBase(BaseModel):
    item_id: UUID
    path: str
    mime_type: Optional[str] = None
    is_primary: bool = False
    is_data_tag: bool = False
    photo_type: Optional[str] = None


class PhotoCreate(PhotoBase):
    pass


class Photo(PhotoBase):
    id: UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True


# --- Document Schemas ---

class DocumentBase(BaseModel):
    item_id: UUID
    filename: str
    mime_type: Optional[str] = None
    path: str
    document_type: Optional[str] = None


class DocumentCreate(DocumentBase):
    pass


class Document(DocumentBase):
    id: UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True


# --- Item Schemas ---

# Tag schemas defined first due to forward reference
class TagBase(BaseModel):
    name: str
    is_predefined: bool = False


class TagCreate(TagBase):
    pass


class Tag(TagBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ItemBase(BaseModel):
    model_config = {"protected_namespaces": ()}

    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    estimated_value: Optional[Decimal] = None
    # Tracking for estimated value source (AI or user)
    estimated_value_ai_date: Optional[str] = None  # Date when AI estimated (MM/DD/YY format)
    estimated_value_user_date: Optional[str] = None  # Date when user supplied (MM/DD/YY format)
    estimated_value_user_name: Optional[str] = None  # Username who supplied the value
    retailer: Optional[str] = None
    upc: Optional[str] = None
    warranties: Optional[List[dict]] = None
    location_id: Optional[UUID] = None
    # Living item fields
    is_living: bool = False
    birthdate: Optional[date] = None
    contact_info: Optional[dict] = None
    relationship_type: Optional[str] = None
    is_current_user: bool = False
    associated_user_id: Optional[UUID] = None


class ItemCreate(ItemBase):
    tag_ids: Optional[List[UUID]] = None


class ItemUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}

    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    estimated_value: Optional[Decimal] = None
    # Tracking for estimated value source (AI or user)
    estimated_value_ai_date: Optional[str] = None
    estimated_value_user_date: Optional[str] = None
    estimated_value_user_name: Optional[str] = None
    retailer: Optional[str] = None
    upc: Optional[str] = None
    warranties: Optional[List[dict]] = None
    location_id: Optional[UUID] = None
    tag_ids: Optional[List[UUID]] = None
    # Living item fields
    is_living: Optional[bool] = None
    birthdate: Optional[date] = None
    contact_info: Optional[dict] = None
    relationship_type: Optional[str] = None
    is_current_user: Optional[bool] = None
    associated_user_id: Optional[UUID] = None


class Item(ItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    photos: List['Photo'] = []
    documents: List['Document'] = []
    tags: List['Tag'] = []

    class Config:
        from_attributes = True


# --- Maintenance Task Schemas ---

class MaintenanceTaskBase(BaseModel):
    item_id: UUID
    name: str
    description: Optional[str] = None
    next_due_date: Optional[date] = None
    recurrence_type: str
    recurrence_interval: Optional[int] = None
    color: Optional[str] = "#3b82f6"  # Default blue color
    last_completed: Optional[date] = None


class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass


class MaintenanceTaskUpdate(BaseModel):
    item_id: Optional[UUID] = None
    name: Optional[str] = None
    description: Optional[str] = None
    next_due_date: Optional[date] = None
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    color: Optional[str] = None
    last_completed: Optional[date] = None


class MaintenanceTask(MaintenanceTaskBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Bulk Operations Schemas ---

class BulkDeleteRequest(BaseModel):
    item_ids: List[UUID]


class BulkDeleteResponse(BaseModel):
    deleted_count: int
    message: str


class BulkUpdateTagsRequest(BaseModel):
    item_ids: List[UUID]
    tag_ids: List[UUID]
    mode: str = "replace"  # "replace", "add", or "remove"


class BulkUpdateTagsResponse(BaseModel):
    updated_count: int
    message: str


class BulkUpdateLocationRequest(BaseModel):
    item_ids: List[UUID]
    location_id: Optional[UUID] = None


class BulkUpdateLocationResponse(BaseModel):
    updated_count: int
    message: str


# --- Plugin Schemas ---

class PluginBase(BaseModel):
    name: str
    description: Optional[str] = None
    plugin_type: str = 'llm'
    endpoint_url: str
    api_key: Optional[str] = None
    config: Optional[dict] = None
    enabled: bool = True
    use_for_ai_scan: bool = False
    priority: int = 100


class PluginCreate(PluginBase):
    pass


class PluginUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    config: Optional[dict] = None
    enabled: Optional[bool] = None
    use_for_ai_scan: Optional[bool] = None
    priority: Optional[int] = None


class Plugin(PluginBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
