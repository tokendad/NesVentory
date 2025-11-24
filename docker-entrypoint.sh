#!/bin/bash
set -e

echo "NesVentory v2.0 - Starting unified container..."

# Initialize PostgreSQL if needed
if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    
    # Use PostgreSQL 15 paths
    chown -R postgres:postgres /var/lib/postgresql/data
    su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D /var/lib/postgresql/data"
    
    # Configure PostgreSQL
    echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
    
    # Start PostgreSQL temporarily
    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /var/lib/postgresql/data -o '-c listen_addresses=localhost' -w start"
    
    # Wait for PostgreSQL to be ready
    sleep 3
    
    # Create database and user
    su - postgres -c "/usr/lib/postgresql/15/bin/psql -c \"CREATE USER ${DB_USER:-nesventory} WITH PASSWORD '${DB_PASSWORD:-changeme}';\""
    su - postgres -c "/usr/lib/postgresql/15/bin/psql -c \"CREATE DATABASE ${DB_NAME:-nesventory} OWNER ${DB_USER:-nesventory};\""
    su - postgres -c "/usr/lib/postgresql/15/bin/psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME:-nesventory} TO ${DB_USER:-nesventory};\""
    
    # Stop PostgreSQL
    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
    
    echo "PostgreSQL initialization complete."
else
    echo "PostgreSQL database already initialized."
    # Ensure PostgreSQL configuration allows network connections
    if ! grep -q "listen_addresses = '\*'" /var/lib/postgresql/data/postgresql.conf; then
        echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
    fi
fi

# Start supervisor to manage both PostgreSQL and the FastAPI application
echo "Starting supervisor..."
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/nesventory.conf
