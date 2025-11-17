from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr


# --- Auth / User ---


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# --- Locations ---


class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class LocationCreate(LocationBase):
    pass


class LocationRead(LocationBase):
    id: int

    class Config:
        from_attributes = True


# --- Items ---


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    estimated_value: Optional[float] = None
    retailer: Optional[str] = None
    warranty_months: Optional[int] = None
    extended_warranty_info: Optional[str] = None
    documents_url: Optional[str] = None
    location_id: Optional[int] = None


class ItemCreate(ItemBase):
    pass


class ItemRead(ItemBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Maintenance ---


class MaintenanceTaskBase(BaseModel):
    item_id: int
    name: str
    description: Optional[str] = None
    next_due_date: Optional[date] = None
    recurrence: Optional[str] = None


class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass


class MaintenanceTaskRead(MaintenanceTaskBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
