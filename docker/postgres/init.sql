-- Database initialization script for A1 Garage Booking Widget
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create additional users if needed (optional)
ALTER USER postgres WITH PASSWORD 'password';
-- GRANT ALL PRIVILEGES ON DATABASE a1_garage_dev TO app_user;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'A1 Garage database initialized successfully';
    RAISE NOTICE 'Extensions created: uuid-ossp, pg_trgm, btree_gin';
END $$;