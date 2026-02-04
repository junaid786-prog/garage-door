# ServiceTitan Integration Module

The ServiceTitan integration module handles job creation, status updates, and synchronization with the ServiceTitan job management system for A1 Garage Door Service.

## Overview

This module provides:

- Job creation in ServiceTitan from booking data
- Job status tracking and updates
- Authentication with ServiceTitan API
- Error handling with retry logic
- Queue-based background processing
- Batch operations support

## ⚠️ Current Implementation

**This is currently a SIMULATION SERVICE** that mimics the real ServiceTitan API behavior. When actual ServiceTitan credentials and API access are available, simply replace the service implementation while keeping the same interface.

## API Endpoints

### GET `/api/integrations/servicetitan/health`

Check ServiceTitan integration health status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "simulation-v1.0.0",
    "uptime": 86400000,
    "jobsCreated": 42,
    "lastJobCreated": "2025-11-13T15:30:00.000Z"
  }
}
```

### GET `/api/integrations/servicetitan/auth/test`

Test ServiceTitan authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "token": "sim_token_1699882200000",
    "expiresIn": 3600,
    "authenticated": true
  }
}
```

### POST `/api/integrations/servicetitan/jobs`

Create a new job in ServiceTitan.

**Request Body:**

```json
{
  "bookingId": "booking_123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "4805551234",
  "email": "john.doe@email.com",
  "address": "123 Main St",
  "city": "Phoenix",
  "state": "AZ",
  "zip": "85001",
  "problemType": "broken_spring",
  "doorCount": 2,
  "doorAge": 5,
  "isRenter": false,
  "scheduledDate": "2025-11-14T09:00:00.000Z",
  "timeSlot": "9:00 AM - 11:00 AM",
  "specialInstructions": "Gate code is 1234"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1001,
    "jobNumber": "JOB-001001",
    "status": "scheduled",
    "priority": "high",
    "customer": {
      "id": "CUST_1699882200000_abc123",
      "name": "John Doe",
      "phone": "4805551234",
      "email": "john.doe@email.com"
    },
    "location": {
      "address": {
        "street": "123 Main St",
        "city": "Phoenix",
        "state": "AZ",
        "zip": "85001"
      }
    },
    "estimatedDuration": 120,
    "createdAt": "2025-11-13T15:30:00.000Z"
  }
}
```

### GET `/api/integrations/servicetitan/jobs/:jobId`

Get job details by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1001,
    "jobNumber": "JOB-001001",
    "status": "scheduled",
    "description": "Garage door spring repair/replacement (2 doors)",
    "customer": { "..." },
    "location": { "..." },
    "createdAt": "2025-11-13T15:30:00.000Z"
  }
}
```

### PATCH `/api/integrations/servicetitan/jobs/:jobId/status`

Update job status.

**Request Body:**

```json
{
  "status": "dispatched"
}
```

**Valid Statuses:**

- `scheduled` - Job is scheduled
- `dispatched` - Technician dispatched
- `in_progress` - Work in progress
- `completed` - Job completed
- `cancelled` - Job cancelled

### DELETE `/api/integrations/servicetitan/jobs/:jobId`

Cancel a job.

**Request Body:**

```json
{
  "reason": "Customer cancelled appointment"
}
```

### GET `/api/integrations/servicetitan/jobs`

Get jobs by date range.

**Query Parameters:**

- `startDate`: ISO date string (e.g., "2025-11-13T00:00:00.000Z")
- `endDate`: ISO date string (e.g., "2025-11-14T23:59:59.000Z")

### POST `/api/integrations/servicetitan/jobs/batch`

Create multiple jobs in batch.

**Request Body:**

```json
{
  "bookings": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "...": "..."
    },
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "...": "..."
    }
  ]
}
```

### POST `/api/integrations/servicetitan/webhook`

Webhook endpoint for ServiceTitan status updates (future use).

## Architecture

### Files Structure

```
src/modules/integrations/servicetitan/
├── service.js          # Core ServiceTitan API simulation
├── controller.js       # HTTP request handlers
├── routes.js           # Route definitions with validation
├── validator.js        # Input validation schemas
├── jobProcessor.js     # Queue job processing logic
└── README.md           # Documentation (this file)
```

### Dependencies

- **Joi**: Input validation and schema enforcement
- **Express**: Web framework for routing
- **APIResponse**: Standardized response formatting

## Service Layer Methods

### Authentication

- `authenticate()` - Authenticate with ServiceTitan API

### Job Management

- `createJob(bookingData)` - Create new job
- `getJob(jobId)` - Get job by ID
- `updateJobStatus(jobId, status)` - Update job status
- `cancelJob(jobId, reason)` - Cancel job
- `getJobsByDateRange(startDate, endDate)` - Query jobs by date

### Utility

- `getHealthStatus()` - Get service health status

## Queue Processing

The module supports queue-based background processing for:

### Job Types

1. **servicetitan-job-creation** (Priority: Critical)
   - Creates jobs in ServiceTitan
   - Retry on failure with exponential backoff
   - Max 3 retries

2. **servicetitan-status-update** (Priority: Medium)
   - Updates job status
   - Retry on temporary failures

3. **servicetitan-job-cancellation** (Priority: High)
   - Cancels jobs in ServiceTitan
   - Immediate processing for customer experience

4. **servicetitan-health-check** (Priority: Low)
   - Periodic health monitoring
   - No retries needed

### Queue Job Processor

```javascript
const jobProcessor = require('./jobProcessor');

// Process different job types
await jobProcessor.processJobCreation(queueJob);
await jobProcessor.processJobStatusUpdate(queueJob);
await jobProcessor.processJobCancellation(queueJob);
await jobProcessor.processHealthCheck(queueJob);
```

### Error Handling & Retries

**Retryable Errors:**

- Network timeouts
- Service unavailable (503, 502, 500)
- Connection failures
- Temporary API issues

**Non-Retryable Errors:**

- Authentication failures
- Invalid data format
- Customer already exists
- Service area not supported
- Invalid status transitions

**Retry Logic:**

- Max 3 attempts
- Exponential backoff: 5s, 10s, 20s
- Failed jobs logged for manual review

## Validation

All endpoints include comprehensive input validation:

### Job Creation Validation

- **Customer Data**: Name, phone, email format
- **Address**: Complete address with valid ZIP code
- **Problem Type**: Must be from predefined list
- **Door Count**: 1-10 doors
- **Scheduling**: Valid ISO date format

### Error Responses

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email",
      "value": "invalid-email"
    }
  ]
}
```

## Simulation Features

### Dummy Data Generation

- Realistic job numbers and IDs
- Customer ID generation
- Business unit assignment by ZIP code
- Priority determination by problem type
- Duration estimation by job type

### Error Simulation

- Random API failures (5% chance)
- Specific error triggers:
  - `error@test.com` → Customer conflict
  - ZIP `00000` → Service area not supported
  - Phone `0000000000` → Invalid phone number

### Realistic Delays

- Authentication: 200ms
- Job creation: 800ms
- Status updates: 400ms
- Queries: 300-600ms

## Integration with Booking Flow

### Immediate Response Pattern

```javascript
// In booking controller
app.post('/bookings', async (req, res) => {
  // 1. Create booking record
  const booking = await createBooking(req.body);

  // 2. Queue ServiceTitan job creation (background)
  await queueManager.addJob(
    'servicetitan-job-creation',
    {
      bookingData: {
        bookingId: booking.id,
        ...req.body,
      },
    },
    { priority: 'critical' }
  );

  // 3. Immediate response to user
  res.json({
    bookingId: booking.id,
    status: 'confirmed',
    serviceTitanJobQueued: true,
  });
});
```

### Queue Integration Example

```javascript
// Queue job handler
queue.process('servicetitan-job-creation', async (job) => {
  return await jobProcessor.processJobCreation(job);
});
```

## Environment Variables

```bash
# ServiceTitan API Configuration
SERVICETITAN_API_URL=https://api.servicetitan.io
SERVICETITAN_API_KEY=your_api_key_here
SERVICETITAN_TENANT_ID=your_tenant_id_here
SERVICETITAN_APP_KEY=your_app_key_here
```

## Testing

### Health Check

```bash
curl "http://localhost:3000/api/integrations/servicetitan/health"
```

### Create Job

```bash
curl -X POST "http://localhost:3000/api/integrations/servicetitan/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "4805551234",
    "email": "john.doe@email.com",
    "address": "123 Main St",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85001",
    "problemType": "broken_spring",
    "scheduledDate": "2025-11-14T09:00:00.000Z"
  }'
```

### Test Error Scenarios

```bash
# Trigger customer conflict error
curl -X POST "..." -d '{"email": "error@test.com", "..."}'

# Trigger service area error
curl -X POST "..." -d '{"zip": "00000", "..."}'

# Trigger phone validation error
curl -X POST "..." -d '{"phone": "0000000000", "..."}'
```

## Migration to Real ServiceTitan API

When ready to use the real ServiceTitan API:

1. **Update Environment Variables**

   ```bash
   SERVICETITAN_API_URL=https://api.servicetitan.com/v2
   SERVICETITAN_API_KEY=real_api_key
   SERVICETITAN_TENANT_ID=real_tenant_id
   SERVICETITAN_APP_KEY=real_app_key
   ```

2. **Replace Service Implementation**
   - Keep same method signatures in `service.js`
   - Replace simulation logic with actual HTTP requests
   - Add OAuth2 token management
   - Implement real webhook signature verification

3. **Update Error Handling**
   - Map real ServiceTitan error codes
   - Adjust retry logic for actual rate limits
   - Update field mappings if needed

4. **Test Integration**
   - Start with sandbox environment
   - Verify all endpoints work correctly
   - Check webhook functionality
   - Validate job data mapping

## Monitoring & Alerts

### Key Metrics to Monitor

- Job creation success rate
- API response times
- Queue job failures
- Authentication errors
- Rate limit violations

### Log Examples

```javascript
// Success
[ServiceTitan] Job created successfully: {
  serviceTitanJobId: 1001,
  jobNumber: 'JOB-001001',
  bookingId: 'booking_123',
  status: 'scheduled'
}

// Error
[ServiceTitan] Job creation failed permanently: {
  error: 'Authentication failed: Invalid API key',
  bookingId: 'booking_123',
  attempts: 3
}
```

## Future Enhancements

1. **Real-time Sync**: Bidirectional data sync with ServiceTitan
2. **Webhook Processing**: Handle real ServiceTitan status updates
3. **Advanced Queuing**: Priority queues, dead letter queues
4. **Caching**: Cache authentication tokens and job data
5. **Metrics**: Detailed performance and success metrics
6. **Alerting**: Real-time alerts for critical failures
