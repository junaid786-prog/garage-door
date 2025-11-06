# Development Plan - A1 Garage Booking System

## Endpoints Count: 15-20

### Core Booking Flow (8 endpoints)

- POST `/validate-zip` - ZIP code validation
- GET `/issue-types` - Problem types list
- POST `/door-details` - Door info validation
- GET `/time-slots/:zip` - Available appointments
- POST `/bookings` - Create booking
- GET `/bookings/:id` - Booking status
- POST `/bookings/:id/confirm` - Final confirmation
- GET `/service-areas` - Supported ZIP codes

### Integration Endpoints (7-12 endpoints)

- ServiceTitan: 2-3 endpoints (auth, create job, status)
- Scheduling Pro: 2-3 endpoints (auth, slots, reserve)
- Klaviyo: 2-3 endpoints (auth, send email, track)
- SMS: 2-3 endpoints (send, status, opt-out)

## Scalability Architecture

### Queue System (Redis Bull)

```
├── booking-queue (high priority)
├── notification-queue (medium)
├── analytics-queue (low priority)
└── integration-queue (retry logic)
```

### Async Implementation

**Immediate Response:**

- Validate → Reserve slot → Return booking ID

**Background Processing:**

- ServiceTitan job creation
- Email/SMS notifications
- Analytics tracking

### Database Optimization

- Connection pooling (10-50 connections)
- Read replicas for slot queries
- Indexing: ZIP, timestamp, status
- Monthly partitioning

### Caching Strategy

- Redis: Time slots (5min), ZIP validation (1hr)
- Service areas (permanent cache)
- Rate limiting per IP

### Queue Workers

- 3 booking workers (priority)
- 2 notification workers
- 1 analytics worker
- Auto-scaling based on queue length

## Implementation Priority

1. Setup Redis + Bull queues
2. Async booking with immediate response
3. Background job processing
4. Monitoring & alerting
5. Auto-scaling configuration
