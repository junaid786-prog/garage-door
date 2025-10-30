# Garage Door Controller - Pilot

A Node.js backend service for managing garage door service bookings with event tracking and external API integration.

## Project Structure

```
src/
├── modules/
│   ├── bookings/       # Booking management
│   ├── mock-api/       # ServiceTitan API simulator
│   └── events/         # Event tracking
├── middleware/         # Error handling
├── utils/             # Response helpers, error classes
├── config/            # Configuration management
├── app.js            # Express app setup
└── server.js         # Server entry point
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start the server:
```bash
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details

### Events
- `POST /api/events` - Track custom event
- `GET /api/events` - List all events
- `GET /api/events/stats` - Event statistics

### Mock API (ServiceTitan Simulator)
- `POST /api/mock/servicetitan/jobs` - Create service job
- `GET /api/mock/servicetitan/jobs/:jobId` - Get job status
- `PUT /api/mock/servicetitan/jobs/:jobId` - Update job

### Health
- `GET /health` - Health check

## How It Works

### Booking Flow

```
1. Client submits booking request
   ↓
2. Validation middleware checks input
   ↓
3. Booking service generates booking ID
   ↓
4. Event: "booking_created" tracked
   ↓
5. Mock API creates ServiceTitan job
   ↓
6. Event: "servicetitan_api_called" tracked
   ↓
7. Response sent with booking confirmation
```

### Data Flow

```
POST /api/bookings
    │
    ├─→ bookings/validator.js (input validation)
    ├─→ bookings/controller.js (request handling)
    ├─→ bookings/service.js (business logic)
    │       ├─→ events/service.js (track event)
    │       └─→ mock-api/service.js (create job)
    └─→ APIResponse wrapper (format response)
```

## Example Usage

### Create Booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Smith",
    "customerEmail": "john@example.com",
    "customerPhone": "+15551234567",
    "address": {
      "street": "123 Main St",
      "city": "Los Angeles",
      "state": "CA",
      "zipCode": "90001"
    },
    "serviceType": "repair",
    "preferredDateTime": "2025-11-15T14:00:00Z",
    "notes": "Garage door making noise"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "id": "BK-1761813248656-26n83rs6g",
      "customerName": "John Smith",
      "customerEmail": "john@example.com",
      "serviceType": "repair",
      "status": "pending",
      "createdAt": "2025-10-30T08:34:08.656Z"
    },
    "serviceTitanJobId": "ST-1761813248959-6FY290",
    "confirmationMessage": "Booking BK-... created successfully"
  }
}
```

### View Events

```bash
curl http://localhost:3000/api/events/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalEvents": 2,
    "eventsByType": {
      "booking_created": 1,
      "servicetitan_api_called": 1
    },
    "recentEvents": [...]
  }
}
```

## Architecture

### Modular Design

Each module follows a consistent structure:
- `routes.js` - Endpoint definitions
- `controller.js` - Request/response handling
- `service.js` - Business logic
- `validator.js` - Input validation (where applicable)

### Response Format

All responses use a standardized format via `APIResponse` wrapper:

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": {...},
  "timestamp": "2025-10-30T08:34:08.960Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "...",
  "error": {
    "code": "ERROR_CODE",
    "details": [...]
  },
  "timestamp": "2025-10-30T08:34:08.960Z"
}
```

### Event Storage

Events are stored in `events.json` with the following structure:
```json
{
  "id": "EVT-...",
  "name": "event_name",
  "data": {...},
  "timestamp": "...",
  "session": {
    "userAgent": "...",
    "ip": "..."
  }
}
```

## Validation Rules

### Booking
- `customerName`: 2-100 characters
- `customerEmail`: Valid email format
- `customerPhone`: E.164 format (e.g., +15551234567)
- `address.state`: 2-letter state code
- `address.zipCode`: 5-digit or 9-digit ZIP
- `serviceType`: repair | installation | maintenance | inspection
- `preferredDateTime`: ISO 8601 date, must be in future

## Error Handling

All errors are handled by centralized middleware:
- Validation errors return 400
- Not found errors return 404
- Server errors return 500
- All errors include error codes for client handling

## Development Notes

### Pilot Limitations
- No database (events stored in JSON file)
- Mock API only (no real ServiceTitan integration)
- No authentication/authorization
- In-memory data (resets on restart)

### Production Considerations
- Add PostgreSQL/MongoDB for persistence
- Implement real ServiceTitan API integration
- Add authentication with JWT
- Add rate limiting
- Add comprehensive logging
- Add automated tests
- Add API documentation (Swagger)

## Technology Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js v4.x
- **Validation**: Joi
- **Security**: Helmet, CORS
- **Logging**: Morgan

## File Size Policy

All files are kept under 200 lines following single responsibility principle. Large modules are split into separate files for maintainability.

## Scripts

```bash
npm start      # Start server
npm run dev    # Start with auto-reload (nodemon)
```