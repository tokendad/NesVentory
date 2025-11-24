#!/bin/bash
set -e

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    su - postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/data"
    
    # Start PostgreSQL temporarily to create database and user
    su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -o '-c listen_addresses=localhost' -w start"
    
    # Wait for PostgreSQL to be ready
    sleep 2
    
    # Create database and user
    su - postgres -c "psql -c \"CREATE USER ${DB_USER:-nesventory} WITH PASSWORD '${DB_PASSWORD}';\""
    su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME:-nesventory} OWNER ${DB_USER:-nesventory};\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME:-nesventory} TO ${DB_USER:-nesventory};\""
    
    # Stop PostgreSQL
    su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
    
    echo "PostgreSQL initialization complete."
fi

# Configure PostgreSQL to listen on all interfaces
if ! grep -q "listen_addresses = '*'" /var/lib/postgresql/data/postgresql.conf; then
    echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
fi

# Configure PostgreSQL host-based authentication
cat > /var/lib/postgresql/data/pg_hba.conf << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
EOF

# Start supervisor to manage PostgreSQL and the application
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/nesventory.conf
