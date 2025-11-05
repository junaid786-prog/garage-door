# Database Setup Guide

## 🐳 Recommended: Docker Setup (Easiest)

The fastest way to get started is using Docker Compose:

### Prerequisites
- Docker and Docker Compose installed
- No need to install PostgreSQL separately

### Quick Start
```bash
# 1. Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# 2. Copy environment file for Docker
cp .env.docker .env

# 3. Wait for database to be ready (check health status)
docker-compose ps

# 4. Run migrations
npm run db:migrate

# 5. Test connection
npm run db:test
```

### Available Services
```bash
# Start all services (PostgreSQL + Adminer web interface)
docker-compose up -d

# Start only PostgreSQL
docker-compose up -d postgres

# Start PostgreSQL + Test database
docker-compose up -d postgres postgres-test

# View logs
docker-compose logs postgres

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

### Database Access
- **Main Database**: `localhost:5432` (a1_garage_dev)
- **Test Database**: `localhost:5433` (a1_garage_test)  
- **Web Interface**: http://localhost:8080 (Adminer)
  - Server: `postgres`
  - Username: `postgres`
  - Password: `password`
  - Database: `a1_garage_dev`

## Alternative Installation Methods

### Option 1: Install PostgreSQL with Homebrew (macOS)
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create a database user (optional, uses system user by default)
createuser -s postgres
```

### Option 2: Manual Docker Run
```bash
# Run PostgreSQL in Docker
docker run -d \
  --name a1-garage-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=a1_garage_dev \
  -p 5432:5432 \
  postgres:14
```

### Option 3: Download from PostgreSQL website
Visit https://www.postgresql.org/download/ and follow instructions for your OS.

## Database Setup

1. **Create .env file** (if not exists):
```bash
cp .env.example .env
```

2. **Update .env with your database credentials**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=a1_garage_dev
DB_USER=postgres
DB_PASSWORD=password
```

3. **Create the database**:
```bash
npm run db:create
```

4. **Run migrations**:
```bash
npm run db:migrate
```

5. **Test the connection**:
```bash
npm run db:test
```

## Available Database Commands

```bash
# Database creation and migration
npm run db:create          # Create database
npm run db:migrate         # Run pending migrations
npm run db:migrate:undo    # Rollback last migration

# Seeding
npm run db:seed            # Run all seed files
npm run db:seed:undo       # Undo all seeds

# Testing
npm run db:test            # Test database connection
npm run db:test:create     # Test with creating a user
```

## Docker Compose Commands Reference

```bash
# Status and logs
docker-compose ps                    # Check service status
docker-compose logs postgres         # View PostgreSQL logs
docker-compose logs -f postgres      # Follow logs in real-time

# Database management
docker-compose exec postgres psql -U postgres -d a1_garage_dev  # Connect to main DB
docker-compose exec postgres-test psql -U postgres -d a1_garage_test  # Connect to test DB

# Container management
docker-compose restart postgres      # Restart PostgreSQL
docker-compose stop postgres         # Stop PostgreSQL
docker-compose start postgres        # Start stopped PostgreSQL
```

## Troubleshooting

### Connection Refused Error
**For Docker setup:**
- Check if containers are running: `docker-compose ps`
- View container logs: `docker-compose logs postgres`
- Restart containers: `docker-compose restart postgres`

**For local PostgreSQL:**
- Ensure PostgreSQL is running: `brew services list`
- Check if PostgreSQL is listening: `lsof -i :5432`
- Verify credentials in .env file

### Container Health Issues
```bash
# Check container health
docker-compose ps

# If unhealthy, check logs
docker-compose logs postgres

# Restart with fresh data (⚠️ deletes data)
docker-compose down -v
docker-compose up -d postgres
```

### Authentication Failed
- Check username and password in .env
- For Docker: credentials are set in docker-compose.yml
- For local development, you might need to trust local connections:
  Edit `pg_hba.conf` and set method to `trust` for local connections

### Database Does Not Exist
**For Docker:**
- Database is created automatically on first run
- If needed, recreate: `docker-compose down -v && docker-compose up -d postgres`

**For local PostgreSQL:**
- Run `npm run db:create` to create the database
- Or manually create: `createdb a1_garage_dev`

### Port Already in Use
If port 5432 is occupied:
```bash
# Find what's using the port
lsof -i :5432

# Either stop the conflicting service or change Docker port
# Edit docker-compose.yml: "5433:5432" instead of "5432:5432"
# Then update .env: DB_PORT=5433
```

## Development Workflow

1. When adding new models:
   - Create model file in `src/database/models/`
   - Create migration in `src/database/migrations/`
   - Run `npm run db:migrate`

2. When modifying existing models:
   - Create a new migration file
   - Never edit existing migrations
   - Run `npm run db:migrate`

3. For testing:
   - Use transactions for test data
   - Clean up test data after tests
   - Consider using a separate test database

## Production Considerations

- Use environment variables for all credentials
- Enable SSL for database connections
- Use connection pooling
- Regular backups
- Monitor connection pool usage
- Use read replicas for heavy read operations