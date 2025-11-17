from datetime import datetime, date
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("Item", back_populates="owner")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    parent = relationship("Location", remote_side=[id], backref="children")
    items = relationship("Item", back_populates="location")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    manufacturer = Column(String(255), nullable=True)
    model_number = Column(String(255), nullable=True)
    serial_number = Column(String(255), nullable=True)

    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(10, 2), nullable=True)
    estimated_value = Column(Numeric(10, 2), nullable=True)
    retailer = Column(String(255), nullable=True)

    warranty_months = Column(Integer, nullable=True)
    extended_warranty_info = Column(Text, nullable=True)

    documents_url = Column(String(1024), nullable=True)

    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="items")
    owner = relationship("User", back_populates="items")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="item")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    next_due_date = Column(Date, nullable=True)
    recurrence = Column(String(50), nullable=True)  # e.g., "yearly", "monthly"

    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item", back_populates="maintenance_tasks")
