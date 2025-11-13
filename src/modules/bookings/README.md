# Booking Module

Complete booking management system for A1 Garage Door service appointments.

## Overview

This module handles the core booking functionality with full CRUD operations, validation, and database persistence using PostgreSQL + Sequelize ORM.

## Features

- ✅ Complete booking creation and management
- ✅ Phone-based customer lookup
- ✅ Status tracking (pending, confirmed, in_progress, completed, cancelled)
- ✅ Comprehensive validation with Joi schemas
- ✅ Pagination and filtering
- ✅ ServiceTitan integration readiness

## API Endpoints

### Core Booking Operations

```http
POST   /api/bookings              # Create new booking
GET    /api/bookings              # List bookings with filters
GET    /api/bookings/:id          # Get specific booking
PUT    /api/bookings/:id          # Update entire booking
PATCH  /api/bookings/:id/status   # Update status only
DELETE /api/bookings/:id          # Cancel booking (soft delete)
```

### Specialized Operations

```http
GET    /api/bookings/phone/:phone         # Get bookings by phone number
POST   /api/bookings/:id/servicetitan     # Link ServiceTitan job ID
```

## Database Schema

### Service Information
- `serviceType`: 'repair' | 'replacement'
- `serviceSymptom`: 'wont_open' | 'wont_close' | 'spring_bang' | 'tune_up' | 'other'
- `canOpenClose`: 'yes' | 'no' | 'partial'

### Door Information  
- `doorAgeBucket`: 'lt_8' | 'gte_8' (years)
- `doorCount`: 1 | 2

### Address Information
- `street`: string (required)
- `unit`: string (optional)
- `city`: string (required)
- `state`: string (required, 2 chars)
- `zip`: string (required, 5 or 5+4 format)

### Occupancy Information
- `occupancyType`: 'homeowner' | 'renter' | 'pm' | 'unknown'
- `renterPermission`: boolean (required if renter)

### Contact Information
- `phoneE164`: string (required, E.164 format: +1234567890)
- `contactName`: string (optional)

### Scheduling Information
- `slotId`: string (optional, for future scheduling integration)
- `asapSelected`: boolean (optional)
- `priorityScore`: number (optional, 0-100)

## Request Examples

### Create Booking

```json
POST /api/bookings
{
  "service": {
    "type": "repair",
    "symptom": "wont_open", 
    "can_open_close": "no"
  },
  "door": {
    "age_bucket": "gte_8",
    "count": 1
  },
  "replacement_pref": null,
  "address": {
    "street": "123 Main St",
    "unit": "Apt 2A",
    "city": "Springfield", 
    "state": "IL",
    "zip": "62701"
  },
  "occupancy": {
    "type": "homeowner"
  },
  "contact": {
    "phoneE164": "+15551234567",
    "name": "John Doe"
  },
  "scheduling": {
    "asap_selected": true,
    "priority_score": 75
  },
  "notes": "Garage door making loud noise when opening"
}
```

### Get Bookings with Filters

```http
GET /api/bookings?status=pending&zip=62701&limit=10&offset=0&sortBy=created_at&sortOrder=DESC
```

### Update Booking Status

```json
PATCH /api/bookings/uuid-here/status
{
  "status": "confirmed"
}
```

## Response Format

All responses follow the standardized APIResponse format:

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "uuid-here",
    "service": { ... },
    "door": { ... },
    "address": { ... },
    "occupancy": { ... },
    "contact": { ... },
    "scheduling": { ... },
    "status": "pending",
    "created_at": "2024-11-10T12:00:00.000Z",
    "updated_at": "2024-11-10T12:00:00.000Z"
  },
  "timestamp": "2024-11-10T12:00:00.000Z"
}
```

## Validation

All endpoints use Joi validation middleware:

- **Create**: Full booking form validation
- **Update**: Partial booking form validation (all fields optional)
- **Status**: Status enum validation
- **Query**: Pagination and filter validation

## Status Flow

```
pending → confirmed → in_progress → completed
    ↓         ↓            ↓
 cancelled ← cancelled ← cancelled
```

## Integration Points

### ServiceTitan (Ready)
- `serviceTitanJobId` field in database
- Link endpoint: `POST /api/bookings/:id/servicetitan`

### Phone Lookup
- Index on phone_e164 for fast lookups
- Endpoint: `GET /api/bookings/phone/:phone`

## Database Indexes

- `phone_e164` - Customer lookup
- `zip` - Geographic queries  
- `status` - Status filtering
- `created_at` - Time-based sorting
- `service_titan_job_id` - Unique when not null

## File Structure

```
src/modules/bookings/
├── README.md           # This documentation
├── controller.js       # HTTP request handlers
├── service.js          # Business logic layer
├── routes.js           # Express route definitions
├── validator.js        # Joi validation schemas
└── model.js           # Sequelize model (located in src/database/models/Booking.js)
```

## Testing

To test the booking endpoints, run the database migration first:

```bash
npm run db:migrate
```

Then use the health check to verify the server is running:

```bash
curl http://localhost:3000/health
```

Test booking creation:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"service":{"type":"repair","symptom":"wont_open","can_open_close":"no"},"door":{"age_bucket":"gte_8","count":1},"address":{"street":"123 Test St","city":"Springfield","state":"IL","zip":"62701"},"occupancy":{"type":"homeowner"},"contact":{"phoneE164":"+15551234567"},"scheduling":{}}'
```

## Next Steps

1. Run database migration: `npm run db:migrate`
2. Test all endpoints 
3. Integrate with authentication middleware
4. Connect ServiceTitan API (Milestone 3)
5. Add comprehensive test suite