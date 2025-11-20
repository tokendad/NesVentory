# Database Migrations

This directory contains SQL migration scripts for the NesVentory database.

## How to Apply Migrations

If you already have a NesVentory database running, you'll need to apply these migrations to update your schema.

### Option 1: Using psql

```bash
# Connect to your database and run the migration
psql -h localhost -U nesventory -d nesventory -f migrations/001_add_item_fields.sql
```

### Option 2: Using Docker

```bash
# If using Docker Compose
docker compose exec nesventory_db psql -U nesventory -d nesventory -f /path/to/001_add_item_fields.sql
```

### Option 3: Fresh Install

If you're setting up a fresh database, you don't need to run migrations. The seed script will create the database with the latest schema automatically.

## Migrations List

- **001_add_item_fields.sql** (2025-11-20): Adds `manufacturer`, `manufacture_date`, and `custom_fields` columns to the items table. Migrates data from `brand` to `manufacturer` if upgrading from an older version.

## Notes

- Always backup your database before running migrations
- Migrations are designed to be idempotent (safe to run multiple times)
- New installations don't need to run migrations as SQLAlchemy creates tables with the latest schema
