# Database Seeding Documentation

## Overview

The NesVentory application includes automatic database seeding functionality that pre-populates the database with test data on first startup. This makes it easy to explore and test the application without having to manually create data.

## What Gets Seeded

### Test Users (3)
The seeding script creates three users with different permission levels:

1. **Admin User**
   - Email: `admin@nesventory.local`
   - Password: `admin123`
   - Role: Administrator
   - Full access to all features

2. **Editor User**
   - Email: `editor@nesventory.local`
   - Password: `editor123`
   - Role: Editor
   - Can create and modify items

3. **Viewer User**
   - Email: `viewer@nesventory.local`
   - Password: `viewer123`
   - Role: Viewer
   - Read-only access

### Locations (9)
A hierarchical structure of locations representing a typical home:

**Top-level locations:**
- Living Room
  - TV Stand (sub-location)
- Master Bedroom
  - Closet (sub-location)
- Kitchen
  - Pantry (sub-location)
- Garage
  - Workbench (sub-location)
- Home Office

### Items (8)
A diverse set of items representing different categories:

1. **Samsung 65" 4K TV** (Living Room > TV Stand)
   - Electronics, with warranties
   - Purchase price: $799.99
   - Includes UPC barcode

2. **MacBook Pro 14"** (Home Office)
   - High-value electronics
   - Purchase price: $2,499.00

3. **Panasonic Microwave Oven** (Kitchen)
   - Kitchen appliance
   - Purchase price: $189.99

4. **DeWalt 20V Cordless Drill** (Garage > Workbench)
   - Power tool
   - Purchase price: $129.00

5. **Standing Desk** (Home Office)
   - Furniture with 10-year warranty
   - Purchase price: $599.00

6. **Trek Mountain Bike** (Garage)
   - Sports equipment
   - Purchase price: $849.99

7. **Dyson V11 Cordless Vacuum** (Master Bedroom > Closet)
   - Home appliance with warranty and UPC
   - Purchase price: $599.99

8. **Keurig K-Elite Coffee Maker** (Kitchen)
   - Kitchen appliance
   - Purchase price: $169.99

### Maintenance Tasks (4)
Recurring maintenance tasks associated with some items:

1. **Annual Bike Tune-up** (Trek Mountain Bike)
   - Recurrence: Yearly
   - Description: Professional tune-up including brake adjustment, gear tuning, and chain lubrication

2. **Chain Lubrication** (Trek Mountain Bike)
   - Recurrence: Every 30 days
   - Description: Clean and lubricate bicycle chain

3. **Replace Vacuum Filter** (Dyson Vacuum)
   - Recurrence: Every 90 days
   - Description: Replace HEPA filter and clean pre-filter

4. **Descale Coffee Maker** (Keurig Coffee Maker)
   - Recurrence: Every 90 days
   - Description: Run descaling solution through the machine to remove mineral buildup

## How It Works

### Automatic Seeding
The database is automatically seeded when the application starts up IF the database is empty (no existing users). This is handled in `backend/app/main.py`:

```python
# Auto-create tables on startup and seed with test data
Base.metadata.create_all(bind=engine)

# Seed the database with test data if it's empty
try:
    db = SessionLocal()
    seed_database(db)
    db.close()
except Exception as e:
    print(f"Error seeding database: {e}")
```

### Seed Data Module
The seeding logic is in `backend/app/seed_data.py`, which includes:

- `seed_database(db)` - Main function that orchestrates the seeding
- `create_users(db)` - Creates test users with hashed passwords
- `create_locations(db)` - Creates hierarchical location structure
- `create_items(db, locations)` - Creates items with detailed attributes
- `create_maintenance_tasks(db, items)` - Creates recurring maintenance tasks

### Data Safety
The seed function checks if data already exists before seeding:

```python
# Check if database already has data
existing_users = db.query(models.User).count()
if existing_users > 0:
    print("Database already contains data. Skipping seed.")
    return
```

This prevents duplicate data if the application is restarted.

## Testing the Seeded Data

Once the application is running with seeded data, you can:

1. **Login with test users** to test authentication and role-based access
2. **View items and locations** through the API endpoints
3. **Test filtering and searching** with real-looking data
4. **Check maintenance tasks** to see recurring task functionality
5. **Verify relationships** between items, locations, and other entities

## API Endpoints to Test

- `GET /api/items` - List all seeded items
- `GET /api/locations` - List all seeded locations
- `GET /api/items/{item_id}` - Get details of a specific item
- `GET /api/locations/{location_id}` - Get details of a specific location

## Manual Seeding

If you need to manually trigger the seeding (e.g., after clearing the database), you can:

1. Stop the application
2. Clear the database (delete all tables or drop/recreate the database)
3. Restart the application - it will automatically seed fresh data

## Customizing Seed Data

To modify the seed data, edit `backend/app/seed_data.py`:

- Modify existing items, users, or locations
- Add new test data
- Change passwords or user roles
- Adjust item attributes, warranties, or maintenance schedules

After making changes, restart the application with a fresh database to see the new seed data.

## Production Considerations

⚠️ **Important**: The seed data is intended for development and testing only. 

For production deployments:
- Comment out or remove the seeding call in `main.py`
- Use environment variables to control whether seeding occurs
- Create a separate migration/initialization script
- Never use default passwords in production

## Troubleshooting

### No Items or Locations After Startup

If you start the application and find no items or locations in the database:

1. **Check the Backend Logs**
   - Look for warning messages like:
     - `⚠️  WARNING: No items found in database after seeding!`
     - `⚠️  WARNING: No locations found in database after seeding!`
   - These indicate that seeding attempted but failed to create data

2. **Common Causes**
   - **Database Already Has Users**: The seeding script only runs if there are no users in the database. If users exist but items/locations don't, the seed was skipped.
   - **Database Connection Issues**: Check that the database is accessible and the connection settings are correct.
   - **Migration/Schema Issues**: Ensure all database tables are created correctly.
   - **Permission Issues**: Verify the application has write permissions to the database.

3. **Solutions**
   
   **Option A: Reset the Database (Recommended for Development)**
   ```bash
   # Using Docker Compose
   docker compose down -v  # Removes volumes and all data
   docker compose up --build
   
   # Using Docker CLI
   docker stop nesventory_backend nesventory_db
   docker rm nesventory_backend nesventory_db
   docker volume rm nesventory_db_data
   # Then restart services
   ```
   
   **Option B: Manual Seeding**
   
   If you need to manually trigger seeding:
   
   1. Access the backend container:
      ```bash
      docker exec -it nesventory_backend bash
      ```
   
   2. Open a Python shell:
      ```bash
      python
      ```
   
   3. Run the seeding script:
      ```python
      from app.database import SessionLocal
      from app.seed_data import seed_database
      
      db = SessionLocal()
      seed_database(db)
      db.close()
      ```
   
   4. Exit and restart the application
   
   **Option C: Clear Users to Trigger Auto-Seed**
   
   If you want to keep the database but trigger a re-seed:
   
   1. Connect to the database and delete all users:
      ```bash
      # Using psql in the database container
      docker exec -it nesventory_db psql -U nesventory -d nesventory
      ```
      
      ```sql
      DELETE FROM users;
      DELETE FROM items;
      DELETE FROM locations;
      ```
   
   2. Restart the backend service to trigger seeding

### Verifying Seed Data

After seeding, verify the data was created:

1. **Check via API**
   ```bash
   # Get authentication token first
   curl -X POST http://localhost:8001/api/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin@nesventory.local&password=admin123"
   
   # Use the token to check items (replace TOKEN with actual token)
   curl http://localhost:8001/api/items \
     -H "Authorization: Bearer TOKEN"
   
   # Check locations
   curl http://localhost:8001/api/locations \
     -H "Authorization: Bearer TOKEN"
   ```

2. **Check via Database**
   ```bash
   docker exec -it nesventory_db psql -U nesventory -d nesventory
   ```
   
   ```sql
   SELECT COUNT(*) FROM users;      -- Should return 3
   SELECT COUNT(*) FROM items;      -- Should return 8
   SELECT COUNT(*) FROM locations;  -- Should return 9
   ```

### Database Shows "Unhealthy" Status

If the Status panel shows the database as "unhealthy":

1. **For SQLite Users**: This is expected. The health check is optimized for PostgreSQL. SQLite databases will show limited information (version, size, location may be "Unknown" or "Not available").

2. **For PostgreSQL Users**: 
   - Check database connectivity
   - Verify database credentials in `.env` file
   - Check Docker logs: `docker compose logs nesventory_db`
   - Ensure PostgreSQL container is running: `docker compose ps`

### Missing Seed Data Categories

If only some categories of seed data are missing:

1. Check the error messages in backend logs for specific failures
2. Review database constraints and foreign key relationships
3. Manually inspect the seed_data.py file for any errors
4. Try Option A (Reset Database) from above
