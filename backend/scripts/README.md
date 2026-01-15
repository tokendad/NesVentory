# Backend Utility Scripts

This directory contains utility scripts for maintenance and migration tasks.

## generate_thumbnails.py

This script scans the database for photos and location photos that are missing thumbnails and generates them. This is useful when migrating an existing database to the new thumbnail-enabled version.

### Usage

Run this script from the root of the project (or inside the backend container):

```bash
# If running locally with virtualenv
export PYTHONPATH=$PYTHONPATH:/path/to/backend
python3 backend/scripts/generate_thumbnails.py

# If running inside Docker container
docker exec -it nesventory5 python3 /app/scripts/generate_thumbnails.py
```

Note: The script assumes it can access the database (via SQLALCHEMY_DATABASE_URL or default sqlite path) and the media storage directory.
