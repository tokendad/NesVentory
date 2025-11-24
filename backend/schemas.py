
from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import List, Optional, Literal
from decimal import Decimal

from pydantic import BaseModel, Field, EmailStr


# ---------- User ----------

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Literal["admin", "editor", "viewer"] = "admin"


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    allowed_location_ids: Optional[List[uuid.UUID]] = None

    class Config:
        orm_mode = True


# Schema for updating user location access
class UserLocationAccess(BaseModel):
    location_ids: List[uuid.UUID]


# ---------- Location ----------

class LocationBase(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    is_primary_location: bool = False
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
    parent_id: Optional[uuid.UUID] = None
    is_primary_location: Optional[bool] = None
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


class LocationRead(LocationBase):
    id: uuid.UUID
    full_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ---------- Warranty (embedded) ----------

class WarrantyInfo(BaseModel):
    type: Literal["manufacturer", "extended"]
    provider: Optional[str] = None
    policy_number: Optional[str] = None
    duration_months: Optional[int] = None
    expiration_date: Optional[date] = None
    notes: Optional[str] = None


# ---------- Photos ----------

class PhotoBase(BaseModel):
    item_id: uuid.UUID
    path: str
    mime_type: Optional[str] = None
    is_primary: bool = False
    is_data_tag: bool = False


class PhotoCreate(PhotoBase):
    pass


class PhotoRead(PhotoBase):
    id: uuid.UUID
    uploaded_at: datetime

    class Config:
        orm_mode = True


# ---------- Documents ----------

class DocumentBase(BaseModel):
    item_id: uuid.UUID
    filename: str
    mime_type: Optional[str] = None
    path: str


class DocumentCreate(DocumentBase):
    pass


class DocumentRead(DocumentBase):
    id: uuid.UUID
    uploaded_at: datetime

    class Config:
        orm_mode = True


# ---------- Items ----------

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None

    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    estimated_value: Optional[float] = None
    retailer: Optional[str] = None

    upc: Optional[str] = None
    location_id: Optional[uuid.UUID] = None


class ItemCreate(ItemBase):
    warranties: Optional[List[WarrantyInfo]] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None

    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    estimated_value: Optional[float] = None
    retailer: Optional[str] = None

    upc: Optional[str] = None
    location_id: Optional[uuid.UUID] = None

    warranties: Optional[List[WarrantyInfo]] = None
    data_tag_photo_id: Optional[uuid.UUID] = None


class ItemRead(ItemBase):
    id: uuid.UUID
    warranties: Optional[List[WarrantyInfo]] = None
    data_tag_photo_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    photos: List[PhotoRead] = []
    documents: List[DocumentRead] = []

    class Config:
        orm_mode = True


# ---------- Maintenance ----------

class MaintenanceTaskBase(BaseModel):
    item_id: uuid.UUID
    name: str
    description: Optional[str] = None
    next_due_date: Optional[date] = None
    recurrence_type: Literal["none", "monthly", "yearly", "custom_days"] = "none"
    recurrence_interval: Optional[int] = None
    last_completed: Optional[date] = None


class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass


class MaintenanceTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    next_due_date: Optional[date] = None
    recurrence_type: Optional[Literal["none", "monthly", "yearly", "custom_days"]] = None
    recurrence_interval: Optional[int] = None
    last_completed: Optional[date] = None


class MaintenanceTaskRead(MaintenanceTaskBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
