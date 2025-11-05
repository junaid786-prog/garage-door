# A1 Garage Door Booking Widget - Backend

A Node.js backend service for managing garage door service bookings with PostgreSQL database, event tracking, and external API integrations (ServiceTitan, Scheduling Pro, Klaviyo).

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Docker and Docker Compose (recommended)
- PostgreSQL 14+ (if not using Docker)

### Setup with Docker (Recommended)

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd server
npm install
```

2. **Start PostgreSQL with Docker:**
```bash
docker-compose up -d postgres
```

3. **Setup environment:**
```bash
cp .env.docker .env
```

4. **Run database migrations:**
```bash
npm run db:migrate
```

5. **Start the server:**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Manual Setup (Without Docker)

1. **Install PostgreSQL 14+**
2. **Create database and user**
3. **Copy and configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```
4. **Run migrations and start:**
```bash
npm run db:migrate
npm run dev
```

## 📁 Project Structure

```
src/
├── modules/
│   ├── bookings/           # Booking management
│   └── events/            # Event tracking
├── database/
│   ├── models/            # Sequelize models
│   ├── migrations/        # Database migrations
│   └── connection.js      # Database connection
├── middleware/            # Express middleware
├── utils/                # Utilities and helpers
├── config/               # Configuration management
├── app.js               # Express app setup
└── server.js           # Server entry point with DB connection
```

## 🗃️ Database

### Technology Stack
- **Database**: PostgreSQL 14+
- **ORM**: Sequelize v6+
- **Connection**: Connection pooling with health checks

### Available Commands
```bash
# Database management
npm run db:create          # Create database
npm run db:migrate         # Run migrations
npm run db:migrate:undo    # Rollback migrations
npm run db:seed            # Run seed data
npm run db:seed:undo       # Undo seed data

# Docker commands
docker-compose up -d postgres        # Start PostgreSQL
docker-compose logs postgres         # View logs
docker-compose down                  # Stop services
```

### Models
- **User**: Authentication and user management
- **Booking**: Service booking management (planned)
- **Event**: Event tracking and analytics

## 🌐 API Endpoints

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details

### Events
- `POST /api/events` - Track custom event
- `GET /api/events` - List all events
- `GET /api/events/stats` - Event statistics

### Health
- `GET /health` - Health check

## 🔧 Environment Variables

Required environment variables (see `.env.example`):

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=a1_garage_dev
DB_USER=postgres
DB_PASSWORD=password

# Database Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE=10000
DB_POOL_ACQUIRE=60000

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# External APIs
SERVICETITAN_API_KEY=your-api-key
SERVICETITAN_TENANT_ID=your-tenant-id
GA4_MEASUREMENT_ID=your-ga4-id
GA4_API_SECRET=your-ga4-secret
```

## 📊 Development Workflow

### Adding New Features
1. Create database migration if needed
2. Create/update models
3. Create module with routes, controller, service
4. Add validation schemas
5. Update documentation
6. Run tests

### Database Changes
1. Create migration: `npx sequelize-cli migration:generate --name feature-name`
2. Run migration: `npm run db:migrate`
3. Update models and associations

## 🛡️ Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API rate limiting
- **Input Validation**: Joi schema validation
- **SQL Injection Prevention**: Sequelize parameterized queries
- **Password Hashing**: bcrypt with salt rounds

## 🔄 Planned Integrations

### ServiceTitan API
- Job creation and management
- Customer synchronization
- Schedule management

### Scheduling Pro API
- Available time slots
- Appointment booking
- Calendar integration

### Klaviyo API
- Email notifications
- Customer segmentation
- Marketing automation

### SMS Provider
- Booking confirmations
- Appointment reminders
- Status updates

### Analytics
- Google Analytics 4
- Meta Pixel
- Google Ads conversion tracking
- VWO A/B testing

## 🐳 Docker Setup

### Services Available
- **postgres**: Main database (port 5432)
- **postgres-test**: Test database (port 5433)
- **adminer**: Web database interface (port 8080)

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Start only database
docker-compose up -d postgres

# View database in browser
open http://localhost:8080
# Server: postgres, User: postgres, Password: password
```

## 📈 Monitoring and Health

### Health Check
```bash
curl http://localhost:3000/health
```

### Database Health
- Automatic connection health checks
- Connection pool monitoring
- Graceful shutdown with connection cleanup

## 🧪 Testing and Development

### Scripts
```bash
npm start              # Production start
npm run dev           # Development with auto-reload
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed development data
```

### Development Database
- Automatic table creation via migrations
- Seed data for development
- Separate test database available

## 📋 Production Considerations

### Database
- Connection pooling configured
- SSL support for production
- Migration-based schema management
- Backup and restore procedures needed

### Security
- Environment-based configuration
- Secrets management
- Rate limiting and DDoS protection
- Regular security updates

### Performance
- Database indexing
- Connection pool optimization
- Response compression
- Caching strategy (Redis recommended)

### Monitoring
- Application logging
- Database performance monitoring
- Error tracking and alerting
- Health check endpoints

## 📚 Documentation

- `DATABASE_SETUP.md` - Database setup guide
- `DEVELOPMENT.md` - Development workflow and patterns

## 🤝 Development Standards

- **CommonJS modules** (`require/module.exports`)
- **Modular architecture** with clear separation of concerns
- **Consistent error handling** with custom error classes
- **Standardized API responses** with success/error format
- **Input validation** on all endpoints
- **Database migrations** for all schema changes

## 📞 Support

For setup issues or questions:
1. Check `DATABASE_SETUP.md` for database troubleshooting
2. Review `DEVELOPMENT.md` for development patterns
3. Check Docker logs: `docker-compose logs postgres`

---

## 🏗️ Built With

- **Node.js** v18+ - Runtime environment
- **Express.js** v4.x - Web framework
- **PostgreSQL** v14+ - Database
- **Sequelize** v6+ - ORM
- **Docker** - Containerization
- **Joi** - Input validation
- **bcrypt** - Password hashing
- **JWT** - Authentication tokens