# Development Guide - A1 Garage Door Booking Widget Backend

## Architecture Overview

### Modular Structure
Each feature is organized as a self-contained module with:
```
src/modules/{module-name}/
├── {module}.controller.js   # Business logic & request handling
├── {module}.routes.js       # Route definitions
├── {module}.validation.js   # Joi validation schemas
└── {module}.service.js      # (Optional) Complex business logic
```

### Core Components
```
src/
├── app.js                   # Express app configuration
├── server.js               # Server entry point
├── config/
│   ├── env.js              # Environment variables
│   └── database.js         # Sequelize configuration
├── database/
│   ├── connection.js       # PostgreSQL/Sequelize connection
│   ├── models/             # Sequelize models
│   ├── migrations/         # Database migrations
│   └── seeders/            # Seed data
├── middleware/
│   ├── auth.js            # JWT authentication & RBAC
│   ├── validate.js        # Joi validation wrapper
│   └── errorHandler.js    # Global error handling
└── utils/
    ├── errors.js          # Custom error classes
    └── jwt.js            # JWT utilities
```

## Development Workflow

### 1. Create Database Model
- Define Sequelize model in `src/database/models/`
- Create migration file for schema changes
- Add indexes in migration for frequently queried fields
- Add hooks and instance methods if needed
- Define associations with other models

**Example:**
```javascript
// src/database/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  role: {
    type: DataTypes.ENUM('admin', 'advertiser', 'publisher'),
    allowNull: false,
  },
}, {
  timestamps: true,
  underscored: true,
  paranoid: true, // soft delete
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
  ],
});

User.prototype.someMethod = function() { /* ... */ };

module.exports = User;
```

### 2. Create Validation Schemas
- Define Joi schemas in `{module}.validation.js`
- One schema per endpoint/action
- Include custom error messages

**Example:**
```javascript
// src/modules/auth/auth.validation.js
const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

module.exports = { registerSchema };
```

### 3. Create Controller
- Business logic in `{module}.controller.js`
- Use async/await (express-async-errors handles errors)
- Throw custom errors from `utils/errors.js`
- Return consistent JSON response format

**Example:**
```javascript
// src/modules/auth/auth.controller.js
const User = require('../../database/models/User');
const { ConflictError } = require('../../utils/errors');

const register = async (req, res) => {
  const { email, password } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new ConflictError('Email exists');

  const user = await User.create({ email, password });

  res.status(201).json({
    success: true,
    message: 'User created',
    data: user,
  });
};

module.exports = { register };
```

### 4. Create Routes
- Define routes in `{module}.routes.js`
- Apply middleware (validate, authenticate, authorize)
- Export router

**Example:**
```javascript
// src/modules/auth/auth.routes.js
const express = require('express');
const controller = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { registerSchema } = require('./auth.validation');

const router = express.Router();

router.post('/register', validate(registerSchema), controller.register);
router.get('/profile', authenticate, controller.getProfile);
router.get('/admin-only', authenticate, authorize('admin'), controller.adminAction);

module.exports = router;
```

### 5. Register Routes in App
- Import routes in `src/app.js`
- Mount under `/api/{module-name}`

**Example:**
```javascript
// src/app.js
const authRoutes = require('./modules/auth/auth.routes');

app.use('/api/auth', authRoutes);
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Optional message",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "stack": "Stack trace (dev only)"
}
```

## Middleware Usage

### Authentication
```javascript
const { authenticate, authorize, checkPermissions } = require('../../middleware/auth');

// Require logged-in user
router.get('/protected', authenticate, controller.action);

// Require specific role
router.get('/admin', authenticate, authorize('admin'), controller.action);

// Require multiple roles
router.get('/special', authenticate, authorize('admin', 'advertiser'), controller.action);

// Require specific permissions
router.post('/create', authenticate, checkPermissions('create:campaign'), controller.action);
```

### Validation
```javascript
const { validate } = require('../../middleware/validate');
const { createSchema } = require('./validation');

router.post('/create', validate(createSchema), controller.create);
```

## Error Handling

### Custom Errors
```javascript
import {
  ValidationError,    // 400
  UnauthorizedError,  // 401
  ForbiddenError,     // 403
  NotFoundError,      // 404
  ConflictError,      // 409
  AppError            // Custom status code
} from '../utils/errors.js';

// Usage
throw new NotFoundError('User not found');
throw new AppError('Custom error', 418);
```

### Error Flow
1. Throw error in controller
2. `express-async-errors` catches async errors
3. `errorHandler` middleware formats response
4. Client receives JSON error

## Database Patterns

### Query Patterns
```javascript
// Find with conditions
const users = await User.findAll({ 
  where: { role: 'admin', status: 'active' } 
});

// Find one
const user = await User.findOne({ where: { email } });

// Find by primary key
const user = await User.findByPk(id);

// Create
const user = await User.create({ email, password });

// Update and return new
const [rowsUpdated, [user]] = await User.update(
  { name },
  { where: { id }, returning: true }
);

// Delete (soft delete if paranoid: true)
await User.destroy({ where: { id } });

// Eager loading (joins)
const campaign = await Campaign.findByPk(id, {
  include: [{ model: Advertiser, as: 'advertiser' }]
});

// Transactions
const t = await sequelize.transaction();
try {
  const user = await User.create({ email }, { transaction: t });
  const profile = await Profile.create({ userId: user.id }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### Denormalization Strategy
- Store frequently accessed foreign IDs directly (e.g., `advertiserId` in impressions)
- Reduces joins for high-volume queries
- Trade-off: data consistency vs performance

## Environment Variables

Create `.env` file from `.env.example`:
```bash
NODE_ENV=development
PORT=3000

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=a1_garage_dev
DB_USER=postgres
DB_PASSWORD=password

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE=10000
DB_POOL_ACQUIRE=60000

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3001
```

## Running the Server

```bash
# Setup database
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# Development (with auto-reload)
npm run dev

# Production
npm start

# Database commands
npm run migrate           # Run pending migrations
npm run migrate:undo      # Rollback last migration
npm run migrate:create     # Create new migration
npm run seed              # Run all seeds
npm run seed:undo         # Undo all seeds

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format

# Tests
npm test
npm run test:watch
```

## Testing Endpoints

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "advertiser@example.com",
    "password": "password123",
    "role": "advertiser",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "company": "ACME Corp"
    }
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "advertiser@example.com",
    "password": "password123"
  }'
```

### Protected Route
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Code Style

### Naming Conventions
- Files: `kebab-case.js`
- Variables/Functions: `camelCase`
- Classes/Models: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### Import Order
```javascript
// 1. External packages
const express = require('express');
const bcrypt = require('bcrypt');

// 2. Internal modules
const User = require('../../database/models/User');
const { config } = require('../../config/env');

// 3. Relative imports
const { helperFunction } = require('./helpers');
```

### Always Use
- CommonJS modules (`require/module.exports`)
- `async/await` (not callbacks)
- Arrow functions where appropriate
- Destructuring
- Template literals

## Common Patterns

### Associations & Query Optimization
```javascript
// Define associations
Campaign.belongsTo(Advertiser, { foreignKey: 'advertiserId' });
Impression.belongsTo(Campaign, { foreignKey: 'campaignId' });
Impression.belongsTo(Placement, { foreignKey: 'placementId' });

// Efficient querying with includes
const impressions = await Impression.findAll({
  include: [
    { 
      model: Campaign,
      attributes: ['id', 'name', 'advertiserId'],
      include: [{ 
        model: Advertiser, 
        attributes: ['id', 'name'] 
      }]
    },
    { 
      model: Placement,
      attributes: ['id', 'name', 'publisherId']
    }
  ],
  where: { createdAt: { [Op.gte]: startDate } },
  limit: 100,
});

// For high-volume queries, consider raw SQL
const results = await sequelize.query(
  'SELECT * FROM impressions WHERE created_at >= :date',
  { 
    replacements: { date: startDate },
    type: QueryTypes.SELECT 
  }
);
```

### Soft Delete Pattern
```javascript
// Model definition with paranoid: true
const Campaign = sequelize.define('Campaign', {
  // ... fields
}, {
  paranoid: true, // adds deletedAt field automatically
  timestamps: true,
});

// Soft delete
await Campaign.destroy({ where: { id } });

// Query active only (automatic with paranoid)
const campaigns = await Campaign.findAll();

// Include deleted records
const allCampaigns = await Campaign.findAll({ paranoid: false });

// Restore soft deleted
await Campaign.restore({ where: { id } });
```

### Pagination Pattern
```javascript
const listCampaigns = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const { count, rows } = await Campaign.findAndCountAll({
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']],
    include: [{ model: Advertiser, as: 'advertiser' }],
  });

  res.json({
    success: true,
    data: {
      campaigns: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    },
  });
};

module.exports = { listCampaigns };
```

## Next Steps

### Implementation Milestones (Nov 5 - Dec 4)
1. ⏳ **Milestone 1**: Architecture & Review (Nov 5 - $500)
2. 🔄 **Milestone 2**: ServiceTitan API Integration (Nov 10 - $1,000)
3. 🔄 **Milestone 3**: Scheduling Pro Integration (Nov 13 - $1,000) 
4. 🔄 **Milestone 4**: Klaviyo/SMS Integration (Nov 17 - $800)
5. 🔄 **Milestone 5**: Core Booking Flow Frontend (Nov 24 - $1,500)
6. 🔄 **Milestone 6**: Tracking & Analytics (Nov 27 - $1,000)
7. 🔄 **Milestone 7**: Security & QA (Dec 2 - $900)
8. 🔄 **Milestone 8**: Deployment & Handoff (Dec 4 - $800)

### Development Workflow for Each Module
1. Create API integration service(s) in `src/services/`
2. Create validation schemas for booking flow
3. Create controller with booking orchestration logic
4. Create routes with security middleware
5. Register routes in `src/app.js`
6. Update CHANGELOG.md
7. Update specs.md milestone progress
8. Test integration endpoints

### Key Integrations
- **ServiceTitan API**: Job/lead creation
- **Scheduling Pro API**: Available time slots  
- **Klaviyo API**: Email confirmations
- **SMS Provider**: Text confirmations
- **Analytics**: GA4, Meta Pixel, Google Ads, VWO
