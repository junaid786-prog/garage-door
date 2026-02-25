# Current ServiceTitan Integration

**Last Updated:** 2026-02-25
**Status:** Simulated (no real API calls)

---

## System Overview

Our system creates bookings synchronously, then handles ServiceTitan integration asynchronously via background workers.

**Flow:**
```
User submits booking
  → POST /api/bookings (sync, <500ms)
  → Database creates booking
  → Returns 201 to user
  → Background worker queued
  → Worker creates ServiceTitan job (async)
  → Updates booking with ST job ID
```

---

## Entry Point

**Endpoint:** `POST /api/bookings`
**File:** `garage-door/src/modules/bookings/routes.js`

**Request Payload Structure:**
```json
{
  "service": {
    "type": "repair|replacement",
    "symptom": "wont_open|wont_close|spring_bang|tune_up|other",
    "can_open_close": "yes|no|partial"
  },
  "door": {
    "age_bucket": "lt_8|gte_8",
    "count": 1|2|3
  },
  "replacement_pref": "basic|nicer|null",
  "address": {
    "street": "string",
    "unit": "string (optional)",
    "city": "string",
    "state": "XX",
    "zip": "12345"
  },
  "occupancy": {
    "type": "homeowner|renter|pm|unknown",
    "renterPermission": "boolean (optional)"
  },
  "contact": {
    "phoneE164": "+12345678901",
    "name": "string (optional)"
  },
  "scheduling": {
    "slot_id": "string (optional)",
    "asap_selected": "boolean (optional)",
    "priority_score": "number (optional)"
  },
  "notes": "string (optional)",
  "suspected_issue": "string (optional)"
}
```

**Validation:** `garage-door/src/modules/bookings/validator.js` (lines 1-231)

---

## Synchronous Flow (Controller)

**File:** `garage-door/src/modules/bookings/controller.js`

### Step 1: Create Booking (lines 18-20)
```javascript
const booking = await service.createBooking(req.body);
```
- Calls `garage-door/src/modules/bookings/service.js:20`
- Wrapped in database transaction
- Creates booking record in PostgreSQL
- Returns immediately (<500ms)

### Step 2: Queue Background Jobs (lines 24-75)

**ServiceTitan Job (lines 49-55):**
```javascript
await queueManager.addBookingJob('create-servicetitan-job', bookingJobData, 'critical');
```
- Queue: `booking-processing`
- Priority: critical (1)
- Attempts: 5 with exponential backoff
- Does NOT block user response

**Slot Confirmation (lines 58-74):**
```javascript
if (booking.scheduling?.slot_id) {
  await queueManager.addBookingJob('confirm-time-slot', {...}, 'critical');
}
```
- Only queued if slot selected
- Confirms reserved slot with scheduling service

### Step 3: Return Response (line 86)
```javascript
return APIResponse.created(res, booking, 'Booking created successfully');
```
- 201 status code
- Booking created, jobs queued
- User proceeds immediately

---

## Asynchronous Flow (Workers)

**File:** `garage-door/src/workers/booking.workers.js`

### Worker: createServiceTitanJob (lines 7-109)

**Trigger:** Background job from queue
**Priority:** Critical (processes first)

**Steps:**

1. **Call Integration Layer (line 14)**
   ```javascript
   const result = await serviceTitanIntegration.createJobFromBooking(bookingData);
   ```

2. **On Success (lines 16-37)**
   - Updates booking with ServiceTitan IDs:
     - `serviceTitanJobId`
     - `serviceTitanCustomerId`
     - `serviceTitanAppointmentNumber`
     - `serviceTitanJobNumber`
     - `serviceTitanStatus: 'scheduled'`
   - Clears any previous errors

3. **On Failure (lines 44-86)**
   - Updates booking: `serviceTitanStatus: 'failed'`
   - Logs error to `error_logs` table
   - Retries if `shouldRetry: true` (5 attempts max)
   - Moves to Dead Letter Queue after max retries

**File:** `garage-door/src/database/models/Booking.js`
**ServiceTitan Fields (lines 144-181):**
- `serviceTitanJobId` (BIGINT)
- `serviceTitanJobNumber` (STRING 20)
- `serviceTitanStatus` (ENUM)
- `serviceTitanError` (TEXT)
- `serviceTitanCustomerId` (BIGINT)
- `serviceTitanAppointmentNumber` (STRING 30)
- `serviceTitanJobTypeId` (BIGINT) - added Phase 2

---

## ServiceTitan Integration Layer

### integration.js - Public Interface

**File:** `garage-door/src/modules/integrations/servicetitan/integration.js`

**Main Method (lines 14-46):**
```javascript
async createJobFromBooking(bookingData) {
  // 1. Map booking → ServiceTitan format (line 17)
  const serviceTitanData = this._mapBookingToServiceTitan(bookingData);

  // 2. Authenticate (line 20)
  await serviceTitanService.authenticate();

  // 3. Create job (line 23)
  const job = await serviceTitanService.createJob(serviceTitanData);

  // 4. Return result
  return { success: true, serviceTitanJobId: job.id, ... };
}
```

**Data Mapping (lines 174-251):**

| Our Field | ServiceTitan Field | Transform | Required |
|-----------|-------------------|-----------|----------|
| `contactName` | `firstName`, `lastName` | Split on space | Yes |
| `phoneE164` | `phone` | Remove +1, strip non-digits | Yes |
| `street` | `address` | Direct | Yes |
| `city` | `city` | Direct | Yes |
| `state` | `state` | Direct | Yes |
| `zip` | `zip` | Direct | Yes |
| `serviceType` | `problemType` | Map: replacement→new_door_installation | Yes |
| `serviceSymptom` | `problemType` | Map: spring_bang→broken_spring, etc | Yes |
| `doorCount` | `doorCount` | parseInt | Yes |
| `doorAgeBucket` | `doorAge` | Map: gte_8→10, lt_8→5 | No |
| `occupancyType` | `isRenter` | renter→true | No |
| `notes` | `specialInstructions` | Direct | No |
| N/A | `email` | Fallback: no-email@provided.com | Yes |
| N/A | `customerType` | Default: residential | Yes |
| N/A | `source` | Hardcoded: online_booking_widget | Yes |

**Mapping Code Location:** Lines 174-251

### service.js - API Simulation

**File:** `garage-door/src/modules/integrations/servicetitan/service.js`

**Current Status:** SIMULATION ONLY (line 14-20)
- No real API calls
- Stores jobs in-memory Map
- Returns simulated job IDs

**Authentication (lines 130-149):**
- Simulates 200ms delay
- Returns fake token
- Real implementation needs OAuth2 flow

**Create Job (lines 156-257):**
- Protected by circuit breaker (lines 43-62)
- Validates required fields (lines 429-462)
- Simulates 800ms delay
- Generates job ID: `Date.now() + Math.random()`
- Returns job object with:
  - `id` (BIGINT)
  - `jobNumber` (string: JOB-######)
  - `status` (scheduled)
  - `customer` object
  - `location` object
  - `scheduledDate`, `timeSlot`

**Hardcoded Value (line 223):**
```javascript
jobType: 'garage_door_service',
```
**NOTE:** Should use `serviceTitanJobTypeId` from booking (Phase 2 added this field)

---

## Protection Mechanisms

### Circuit Breakers

**File:** `garage-door/src/modules/integrations/servicetitan/service.js`

**Configuration (lines 43-62):**
```javascript
createJobBreaker = createCircuitBreaker({
  name: 'ServiceTitan.createJob',
  timeout: 10000,              // 10 second timeout
  errorThresholdPercentage: 50, // Open at 50% error rate
  resetTimeout: 5000            // Try again after 5 seconds
})
```

**States:**
- **Closed:** Normal operation, requests go through
- **Open:** Too many failures, reject immediately
- **Half-Open:** Testing if service recovered

**Fallback:** Throws ServiceUnavailableError, job moves to DLQ

### Retry Logic

**File:** `garage-door/src/config/queue.js`

**Default Options (lines 133-141):**
```javascript
{
  attempts: 3,              // Try 3 times total
  backoff: {
    type: 'exponential',    // 2s, 4s, 8s delays
    delay: 2000
  },
  removeOnComplete: 10,     // Keep last 10 completed
  removeOnFail: 5           // Keep last 5 failed
}
```

**Booking Jobs Override (lines 156-164):**
```javascript
{
  priority: 1,              // Critical priority
  attempts: 5,              // Try 5 times
  delay: 0                  // Start immediately
}
```

**Retry Strategy:**
1. Attempt 1: Immediate
2. Attempt 2: After 2 seconds
3. Attempt 3: After 4 seconds
4. Attempt 4: After 8 seconds
5. Attempt 5: After 16 seconds
6. After 5 failures: Move to DLQ

**Retryable Errors (integration.js:259-274):**
- "temporarily unavailable"
- "timeout"
- "network error"
- "503", "502", "500"

**Non-Retryable Errors (service.js:589-600):**
- "authentication failed"
- "invalid"
- "missing required field"
- "already exists"

### Dead Letter Queue

**File:** `garage-door/src/config/queue.js` (lines 87-98)

After max retries exceeded:
```javascript
await this.moveToDLQ(queueName, job, err);
```

Jobs in DLQ require manual intervention via admin dashboard.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend Widget (React)                                      │
│ - User fills form                                            │
│ - Validates locally                                          │
└────────────────┬────────────────────────────────────────────┘
                 │ POST /api/bookings
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Booking Controller (controller.js)                          │
│ - Validates payload (Joi)                                   │
│ - Calls booking service                                     │
└────────────────┬────────────────────────────────────────────┘
                 │ createBooking()
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Booking Service (service.js)                                │
│ - Starts database transaction                               │
│ - Transforms nested → flat model                            │
│ - Creates booking record                                    │
│ - Commits transaction                                        │
└────────────────┬────────────────────────────────────────────┘
                 │ Returns booking object
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Controller (continued)                                       │
│ - Queue create-servicetitan-job                             │
│ - Queue confirm-time-slot (if slot_id)                      │
│ - Return 201 to user                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Redis Queue  │  │ User sees    │
│ (Bull)       │  │ success!     │
└──────┬───────┘  └──────────────┘
       │
       │ Background processing
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Worker: createServiceTitanJob (booking.workers.js)          │
│ - Dequeues job                                              │
│ - Calls serviceTitanIntegration.createJobFromBooking()     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ ServiceTitan Integration (integration.js)                   │
│ - Maps booking data → ServiceTitan format                   │
│ - Calls serviceTitanService.authenticate()                  │
│ - Calls serviceTitanService.createJob()                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ ServiceTitan Service (service.js) - SIMULATION              │
│ - Circuit breaker protection                                │
│ - Validates required fields                                 │
│ - Simulates 800ms delay                                     │
│ - Generates fake job ID                                     │
│ - Stores in memory Map                                      │
│ - Returns job object                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Worker (continued)                                           │
│ - Updates booking in database:                              │
│   • serviceTitanJobId                                       │
│   • serviceTitanJobNumber                                   │
│   • serviceTitanStatus: 'scheduled'                         │
│   • serviceTitanCustomerId                                  │
│ - Logs success                                              │
│ - Job complete                                              │
└─────────────────────────────────────────────────────────────┘
```

**On Failure:**
```
Worker encounters error
  → Logs to error_logs table
  → Updates booking.serviceTitanStatus = 'failed'
  → If retryable: Wait exponential backoff, retry
  → If max retries: Move to Dead Letter Queue
  → Admin manual intervention required
```

---

## File Reference

| Component | File Path | Key Lines |
|-----------|-----------|-----------|
| **Routes** | `garage-door/src/modules/bookings/routes.js` | All |
| **Controller** | `garage-door/src/modules/bookings/controller.js` | 17-90 (createBooking) |
| **Service** | `garage-door/src/modules/bookings/service.js` | 20-110 (createBooking) |
| **Validator** | `garage-door/src/modules/bookings/validator.js` | 1-231 |
| **Model** | `garage-door/src/database/models/Booking.js` | 144-191 (ST fields) |
| **Worker** | `garage-door/src/workers/booking.workers.js` | 7-109 (createServiceTitanJob) |
| **Integration** | `garage-door/src/modules/integrations/servicetitan/integration.js` | 14-46 (create), 174-251 (mapping) |
| **ST Service** | `garage-door/src/modules/integrations/servicetitan/service.js` | 156-257 (createJob), 223 (hardcoded jobType) |
| **Queue Manager** | `garage-door/src/config/queue.js` | 133-164 (options), 87-98 (DLQ) |
| **Circuit Breaker** | `garage-door/src/modules/integrations/servicetitan/service.js` | 43-62 |

---

## Current Limitations

1. **Simulation Only:** No real ServiceTitan API calls (lines 14-20 of service.js)
2. **Hardcoded Job Type:** Uses `'garage_door_service'` instead of `serviceTitanJobTypeId` (line 223)
3. **No Authentication:** Simulates OAuth2, doesn't actually authenticate
4. **In-Memory Storage:** Jobs stored in Map, lost on server restart
5. **Missing Email:** Defaults to `no-email@provided.com` if not provided
6. **No Appointment Scheduling:** Simulates appointment creation, doesn't call real Scheduling API

---

## Production Requirements

To make this production-ready:

1. **Replace Simulation:**
   - Implement real OAuth2 authentication flow
   - Call actual ServiceTitan REST API endpoints
   - Handle real API responses and errors

2. **Use Job Type ID:**
   - Line 223 of service.js: Use `bookingData.serviceTitanJobTypeId` from database
   - Reference `service_titan_job_types` table (Phase 2)

3. **Environment Variables:**
   - Real `SERVICETITAN_API_URL`
   - Real `SERVICETITAN_API_KEY`
   - Real `SERVICETITAN_TENANT_ID`
   - Real `SERVICETITAN_APP_KEY`

4. **API Endpoints:**
   - POST `/customers` - Create customer
   - POST `/jobs` - Create job
   - POST `/appointments` - Schedule appointment

5. **Error Handling:**
   - Map real API error codes to our error types
   - Update retry logic based on actual API behavior

---

**Next:** See `birlasoft-integration-plan.md` for alternative integration approach via Birlasoft Cloud Run service.
