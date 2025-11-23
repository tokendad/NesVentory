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


class User(UserBase):
    id: UUID
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserRead(UserBase):
    id: UUID
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Location Schemas ---

class LocationBase(BaseModel):
    name: str
    parent_id: Optional[UUID] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None


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


class DocumentCreate(DocumentBase):
    pass


class Document(DocumentBase):
    id: UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True


# --- Item Schemas ---

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    estimated_value: Optional[Decimal] = None
    retailer: Optional[str] = None
    upc: Optional[str] = None
    warranties: Optional[List[dict]] = None
    location_id: Optional[UUID] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    estimated_value: Optional[Decimal] = None
    retailer: Optional[str] = None
    upc: Optional[str] = None
    warranties: Optional[List[dict]] = None
    location_id: Optional[UUID] = None


class Item(ItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    photos: List['Photo'] = []
    documents: List['Document'] = []

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
    last_completed: Optional[date] = None


class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass


class MaintenanceTask(MaintenanceTaskBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
