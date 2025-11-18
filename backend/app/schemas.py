from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class LocationBase(BaseModel):
    name: str
    parent_id: Optional[int] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None


class Location(LocationBase):
    id: int

    class Config:
        from_attributes = True


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[int] = None
    retailer: Optional[str] = None
    warranty_info: Optional[str] = None
    location_id: Optional[int] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[int] = None
    retailer: Optional[str] = None
    warranty_info: Optional[str] = None
    location_id: Optional[int] = None


class Item(ItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
