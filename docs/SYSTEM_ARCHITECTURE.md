# System Architecture - A1 Garage Booking System

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Integrations  │
│   (Widget)      │◄──►│   (Node.js)     │◄──►│   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Data Layer    │
                       │ (PostgreSQL +   │
                       │  Redis Cache)   │
                       └─────────────────┘
```

## Data Flow

### Synchronous Path (User Response)

```
User Request → Validation → Slot Reserve → Booking ID → Response (< 500ms)
```

### Asynchronous Path (Background)

```
Booking Created → Queue Jobs → External APIs → Notifications → Analytics
```

## Technology Stack

### Backend

- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis for sessions, slots, rate limiting
- **Queue**: Bull Queue (Redis-based)
- **Auth**: JWT tokens

### External Integrations

- **ServiceTitan**: Job management system
- **Scheduling Pro**: Time slot availability
- **Klaviyo**: Email automation
- **SMS Provider**: Text notifications
- **Analytics**: GA4, Meta Pixel, Google Ads

## Module Structure

```
src/modules/
├── bookings/           # Core booking logic
├── scheduling/         # Time slot management
├── notifications/      # Email/SMS handling
├── integrations/       # External API wrappers
├── analytics/          # Tracking events
├── validation/         # Input validation
└── queue/             # Background jobs
```

## Database Schema

### Core Tables

- `bookings` - Main booking records
- `customers` - Customer information
- `time_slots` - Available appointments
- `service_areas` - Supported ZIP codes
- `queue_jobs` - Job tracking

### Relationships

```
customers 1:n bookings
bookings 1:1 time_slots
service_areas 1:n bookings
```

## Queue Architecture

### Job Types

1. **booking-processing** (Priority: Critical)
   - ServiceTitan job creation
   - Slot confirmation

2. **notifications** (Priority: High)
   - Email confirmations
   - SMS notifications

3. **analytics** (Priority: Low)
   - Event tracking
   - Attribution data

4. **integrations** (Priority: Medium)
   - API sync jobs
   - Data reconciliation

## Scalability Features

### Horizontal Scaling

- Stateless API servers
- Load balancer ready
- Database read replicas

### Performance Optimizations

- Connection pooling
- Query optimization
- Response caching
- CDN integration

### Monitoring

- API response times
- Queue health
- Database performance
- External API status

## Security Architecture

### Data Protection

- HTTPS enforcement
- Input sanitization
- SQL injection prevention
- XSS protection

### Access Control

- Rate limiting per IP
- API key management
- Request validation
- Error message sanitization

### Compliance

- TCPA for SMS opt-ins
- PII data handling
- Audit logging
- Data retention policies

## Usage Guide

### System Startup

```javascript
// src/server.js
const { connectRedis } = require('./config/redis');
const workerManager = require('./workers');

await connectRedis();
await workerManager.startWorkers();
```

### Caching Usage

```javascript
const cacheService = require('./config/cache');

// Time slots (5min TTL)
await cacheService.cacheTimeSlots('90210', '2024-11-05', slots);
const slots = await cacheService.getTimeSlots('90210', '2024-11-05');

// Rate limiting
const limit = await cacheService.checkRateLimit('192.168.1.1', 10, 60);
if (!limit.allowed) return res.status(429).json({ error: 'Rate limited' });
```

### Queue Usage

```javascript
const queueManager = require('./config/queue');

// Immediate response pattern
app.post('/bookings', async (req, res) => {
  const booking = await createBooking(req.body);

  // Queue background jobs
  await queueManager.addBookingJob('create-servicetitan-job', booking, 'critical');
  await queueManager.addNotificationJob('send-confirmation', confirmationData);
  await queueManager.addAnalyticsJob('track-conversion', analyticsData);

  res.json({ bookingId: booking.id, status: 'confirmed' });
});
```

### Queue Priorities

- **Critical**: ServiceTitan jobs (instant)
- **High**: Email/SMS (< 1min)
- **Medium**: Data sync (< 5min)
- **Low**: Analytics (< 10min)

### Monitoring

```javascript
const stats = await queueManager.getAllQueueStats();
const health = await cacheService.getStats();
```
