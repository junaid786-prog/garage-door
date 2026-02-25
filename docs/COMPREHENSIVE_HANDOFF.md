# A1 Garage - Comprehensive Handoff Documentation

**Last Updated:** 2026-02-25
**Prepared For:** The Marketing Vibe (TMV) + Birlasoft Engineering Teams
**System Version:** V1 (Pilot)

---

## 1. High-Level System Overview

### Architecture

```
┌─────────────────┐
│  Frontend Widget│  (React + TypeScript + Vite)
│  Port: 5173     │  → Vercel (Production)
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│  Backend API    │  (Node.js + Express)
│  Port: 3000     │  → Render (Production)
└────────┬────────┘
         │
         ├──→ PostgreSQL (Port 5434) - Persistent data
         ├──→ Redis (Port 6379) - Bull Queue for workers
         └──→ ServiceTitan API (SIMULATED - not real calls)
```

### Technology Stack

**Backend:**
- Runtime: Node.js v18+
- Framework: Express.js
- Database: PostgreSQL 14+ (Sequelize ORM)
- Cache/Queue: Redis 7 + Bull Queue
- Validation: Joi

**Frontend:**
- Framework: React 18
- Language: TypeScript
- Build: Vite
- Routing: Wouter
- Styling: TailwindCSS

**External Integrations:**
- ServiceTitan API (currently simulated)
- SchedulingPro API (slot availability)
- Google Analytics 4
- Google Tag Manager
- Meta Pixel (Facebook)

### Repository Structure

```
A1-Garage/
├── garage-door/              # Backend API
│   ├── src/
│   │   ├── app.js           # Express app setup
│   │   ├── server.js        # Server startup
│   │   ├── modules/         # Feature modules
│   │   ├── workers/         # Bull Queue workers
│   │   ├── database/        # Models + migrations
│   │   └── config/          # Configuration
│   ├── .env                 # Environment config
│   └── docker-compose.yml   # PostgreSQL + Redis
│
└── garage-door-frontend/     # Frontend Widget
    ├── src/
    │   ├── pages/           # Page components
    │   ├── components/      # React components
    │   ├── analytics/       # Tracking code
    │   └── lib/             # API client
    └── .env.development     # Frontend env
```

---

## 2. End-to-End Booking Flow

### Step-by-Step Process

**Step 1: Widget Load**
- User lands on widget page
- Frontend: `src/pages/widget` loads
- Analytics: GA4 page view fires (ga4.ts:108-122)
- GTM container loads (index.html:5-10)

**Step 2: ZIP Code Entry**
- User enters ZIP code
- Frontend validates format (5 digits)
- API call: `GET /api/geo/validate/:zipCode`
- Backend: `geo/service.js` validates (accepts ALL valid US ZIPs)
- Returns: `{ success: true, data: { isServiceable: true } }`

**Step 3: Service Selection**
- User selects service type (repair/replacement)
- User selects symptom (wont_open, wont_close, spring_bang, tune_up, other)
- Data stored in React state

**Step 4: Time Slot Selection**
- API call: `GET /api/scheduling/slots?zipCode=xxxxx&days=7`
- Backend: `scheduling/service.js` fetches available slots
- Returns: Array of time slot objects
- User selects preferred date/time
- Stores `slotId` in booking data

**Step 5: Address Entry**
- User enters street, city, state, unit (optional)
- Frontend validates address format
- No external address validation API

**Step 6: Contact Info**
- User enters name + phone number
- Phone validated as E.164 format (+1XXXXXXXXXX)
- No email collection (defaults to placeholder)

**Step 7: Review & Confirm**
- User reviews all entered data
- User confirms booking

**Step 8: Booking Submission**
- Frontend: POST `/api/bookings` with complete payload
- Backend: `bookings/controller.js:createBooking()` (line 17)
- **Synchronous:**
  1. Validate payload with Joi (validator.js)
  2. Create booking record in PostgreSQL (service.js:20-110)
  3. Returns 201 + booking ID to user (<500ms)
- **Asynchronous (background):**
  1. Queue job: `create-servicetitan-job` (queue.js:156-164)
  2. Worker processes job (booking.workers.js:7-109)
  3. Calls ServiceTitan integration (integration.js:14-46)
  4. Updates booking with ServiceTitan job ID
- User sees confirmation screen immediately

### API Endpoints Called

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 2 | GET | `/api/geo/validate/:zipCode` | Validate service area |
| 4 | GET | `/api/scheduling/slots` | Get available time slots |
| 8 | POST | `/api/bookings` | Create booking |
| All | POST | `/api/events` | Track analytics events |

---

## 3. ServiceTitan API Calls

### Current State: **SIMULATED**

**CRITICAL:** No real ServiceTitan API calls are made in V1. All integration is simulated.

### Simulation Location

**File:** `garage-door/src/modules/integrations/servicetitan/service.js`
- **Lines 14-20:** File header comments state this is simulation
- **Lines 21-660:** Complete ServiceTitanService class (entire class is simulation)
- **Line 126:** `authenticate()` method starts simulation methods
- **Line 181:** `_createJobInternal()` simulates job creation
- **Line 223:** Hardcoded `jobType: 'garage_door_service'` (should use `serviceTitanJobTypeId` from database)
- **Line 495:** `_simulateDelay()` helper method

### When Calls Are Triggered

**Trigger:** After successful booking creation
**How:** Bull Queue worker processes `create-servicetitan-job` job
**Worker:** `garage-door/src/workers/booking.workers.js:7-109`
**Integration Layer:** `garage-door/src/modules/integrations/servicetitan/integration.js:14-46`

### API Calls That WOULD Happen (Real Implementation)

**1. Authentication**
- Endpoint: `POST /auth/token`
- Purpose: Get OAuth access token
- Current: Returns fake token after 100ms delay

**2. Create Customer**
- Endpoint: `POST /customers`
- Payload: Customer name, phone, address
- Purpose: Create ServiceTitan customer record
- Current: Returns fake customer ID

**3. Create Job**
- Endpoint: `POST /jobs`
- Payload: Job details, customer ID, job type
- Purpose: Create ServiceTitan job
- Current: Returns fake job ID + job number

**4. Create Appointment**
- Endpoint: `POST /appointments`
- Payload: Job ID, scheduled time, technician
- Purpose: Schedule technician visit
- Current: Returns fake appointment number

### Data Mapping (Booking → ServiceTitan)

**File:** `garage-door/src/modules/integrations/servicetitan/integration.js:174-251`

| Booking Field | ServiceTitan Field | Transform |
|---------------|-------------------|-----------|
| `contactName` | `customerName` | Direct |
| `phoneE164` | `phoneNumber` | Direct (E.164 format) |
| `street` | `address.street` | Direct |
| `city` | `address.city` | Direct |
| `state` | `address.state` | Direct |
| `zip` | `address.zip` | Direct |
| `serviceType` | `jobType` | Map: repair→maintenance, replacement→installation |
| `serviceSymptom` | `problemDescription` | Enum to text |
| `slotId` | `scheduledDateTime` | Parsed from slot |
| `priorityScore` | `priority` | Map: >0.7→high, >0.4→medium, else→normal |

### Protection Mechanisms

**Circuit Breaker (service.js:43-62):**
- Timeout: 10,000ms
- Error threshold: 50%
- Reset timeout: 5,000ms
- Prevents cascading failures

**Retry Logic (queue.js:159):**
- Attempts: 5
- Backoff: Exponential (2s, 4s, 8s, 16s)
- Retryable errors: Timeout, 500, 502, 503
- Non-retryable: 400, 401, 404

**Dead Letter Queue (DLQ):**
- Failed jobs moved to DLQ after max retries (queue.js:305-343)
- Monitored by `dlqMonitorService.js`
- Manual intervention required for DLQ jobs

---

## 4. Deployment Architecture

### Backend Endpoints

**Server File:** `garage-door/src/app.js`

**Public Endpoints (No API Key):**
- `GET /health` - Health check (routes: health/routes.js)

**Protected Endpoints (Requires API Key):**
- `POST /api/bookings` - Create booking (routes: bookings/routes.js:13)
- `GET /api/bookings` - List bookings with filters (routes: bookings/routes.js:16)
- `GET /api/bookings/:id` - Get booking by ID (routes: bookings/routes.js:19)
- `PUT /api/bookings/:id` - Update booking (routes: bookings/routes.js:22-27)
- `PATCH /api/bookings/:id/status` - Update status (routes: bookings/routes.js:30-35)
- `DELETE /api/bookings/:id` - Cancel booking (routes: bookings/routes.js:38)
- `GET /api/bookings/phone/:phone` - Get by phone (routes: bookings/routes.js:41)
- `GET /api/geo/validate/:zipCode` - Validate ZIP (routes: geo/routes.js:26)
- `GET /api/geo/zip/:zipCode` - Get location data (routes: geo/routes.js:20)
- `GET /api/scheduling/slots` - Get available slots (routes: scheduling/routes.js:20-26)
- `POST /api/events` - Track analytics event (routes: events/routes.js)

**Admin Endpoints (Requires API Key):**
- `GET /admin/errors` - Error recovery endpoints (routes: admin/errorRecoveryRoutes.js)
- `GET /admin/queue` - Queue management endpoints (routes: admin/queueRoutes.js)

### Current Hosting

**Development:**
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5434`
- Redis: `localhost:6379`
- Adminer: `http://localhost:8080`

**Production:**
- Backend: Render (https://garage-door-mwkt.onrender.com)
- Frontend: Vercel (https://rapid-response-scheduler.vercel.app)
- Database: Hosted PostgreSQL (via Render)
- Redis: Upstash (free tier, cloud Redis)

### Repository Locations

**Local Paths:**
- Backend: `/home/rao-hasnain/WORK/A1-Garage/garage-door`
- Frontend: `/home/rao-hasnain/WORK/A1-Garage/garage-door-frontend`

**Git Repository:** (Not specified in files)

### Docker Services (Development)

**File:** `garage-door/docker-compose.yml`

Services:
1. **postgres** - PostgreSQL 14 (port 5434)
2. **postgres-test** - Test database (port 5433)
3. **redis** - Redis 7 (port 6379)
4. **adminer** - Database UI (port 8080)

---

## 5. Redis Configuration

### Connection

**File:** `garage-door/src/config/redis.js`

**Settings:**
- Host: `localhost` (dev) / Upstash URL (prod)
- Port: 6379
- Database: 0 (default)
- Queue DB: 1
- Connection timeout: 60,000ms
- Max retries: 5
- Keep-alive: 30,000ms
- TLS: Enabled for cloud Redis (line 35-44)

### Redis Usage

**Bull Queue Only** - Redis is exclusively used for job queueing, NOT for:
- Slot reservations (V1 disabled)
- Session storage
- Caching

### Queue Configuration

**File:** `garage-door/src/config/queue.js`

**Queues:**
1. `booking-processing` - Booking-related jobs (high priority)
2. `notifications` - Email/SMS notifications (high priority)
3. `analytics` - Analytics events (low priority)
4. `integrations` - External API sync (medium priority)
5. `dead-letter-queue` - Failed jobs requiring manual intervention

**Settings (line 60-64):**
- Stalled check interval: 60,000ms (1 minute)
- Retry delay: 5,000ms
- Delayed debounce: 5,000ms
- Remove on complete: 10 jobs kept
- Remove on fail: 5 jobs kept

### Workers

**File:** `garage-door/src/workers/index.js`

**Active Workers (line 35-44):**
- Booking workers (concurrency: 1)
  - `create-servicetitan-job`
  - `confirm-time-slot`
  - `validate-booking`
- Notification workers (concurrency: 1)
  - `send-email`
  - `send-sms`
  - `send-confirmation`
- Analytics workers (concurrency: 1)
  - `track-event`
  - `track-conversion`
  - `process-attribution`
- Integration workers (concurrency: 1)
  - `sync-external-data`
  - `handle-webhook`
  - `retry-failed-job`

**Control:** Workers only start if `ENABLE_QUEUE_WORKERS=true` (.env:56)

---

## 6. Data Persistence

### Persistent (PostgreSQL)

**Database:** `a1_garage_dev` (port 5434)

**Tables:**

**1. bookings** (model: Booking.js)
- Primary key: `id` (UUID)
- Service fields: `service_type`, `service_symptom`, `can_open_close`
- Door fields: `door_age_bucket`, `door_count`
- Address: `street`, `unit`, `city`, `state`, `zip`
- Contact: `phone_e164`, `contact_name`
- Scheduling: `slot_id`, `asap_selected`, `priority_score`
- Status: `status` (pending, confirmed, in_progress, completed, cancelled)
- ServiceTitan: `service_titan_job_id`, `service_titan_customer_id`, `service_titan_job_number`, `service_titan_appointment_number`, `service_titan_status`, `service_titan_error`, `service_titan_job_type_id`
- Timestamps: `created_at`, `updated_at`
- **Unique constraint:** `slot_id` for non-cancelled bookings (Booking.js:217-230)

**2. service_titan_job_types** (model: ServiceTitanJobType.js)
- Primary key: `id` (BIGINT)
- Fields: `name`, `is_active`
- Records: 804 job types imported from CSV
- Updated: Daily via seeder (idempotent)

**3. events** (analytics events)
- Stores all frontend + backend analytics events
- Fields: event type, session ID, payload, timestamp

**4. error_logs** (error tracking)
- Stores all application errors
- Fields: error type, operation, service name, context, stack trace, resolved status
- Used for error recovery via admin dashboard

### Temporary (Redis)

**Bull Queue Jobs:**
- Retention: Completed jobs kept for 30 days (configurable)
- Failed jobs: Kept for 5 (queue.js:140)
- DLQ jobs: Kept indefinitely until manually removed
- Cleared: Automatically on completion/failure

### Temporary (In-Memory)

**Circuit Breaker States:**
- Location: `servicetitan/service.js:43-62`
- Reset: On server restart
- Not shared across instances

**ServiceTitan Simulation Jobs:**
- Location: In-memory Map in `service.js`
- Lost: On server restart

### Not Stored

**User Sessions:** Widget is stateless, no session storage
**Form State:** React component state only (lost on page refresh)
**Slot Reservations:** V1 does NOT use Redis for 5-minute holds (disabled per client requirement, see worklog 2026-02-20)

---

## 7. Environment Setup

### Backend Environment Variables

**File:** `garage-door/.env`

**Server:**
```bash
NODE_ENV=production
PORT=3000
```

**CORS:**
```bash
CORS_ORIGIN=http://localhost:5173,https://rapid-response-scheduler.vercel.app
```

**Security:**
```bash
API_KEY=garage-door-api-key-2026
```

**Rate Limiting:**
```bash
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # 100 requests per window
```

**PostgreSQL:**
```bash
DB_HOST=localhost
DB_PORT=5434
DB_NAME=a1_garage_dev
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE=10000
DB_POOL_ACQUIRE=60000
```

**Redis:**
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_QUEUE_DB=1
```

**ServiceTitan (Placeholder):**
```bash
SERVICETITAN_API_KEY=placeholder_api_key_here
SERVICETITAN_TENANT_ID=placeholder_tenant_id_here
```

**Analytics:**
```bash
GA4_MEASUREMENT_ID=placeholder_ga4_measurement_id
GA4_API_SECRET=placeholder_ga4_api_secret
```

**Workers:**
```bash
ENABLE_QUEUE_WORKERS=true
```

**Logging:**
```bash
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_TRANSPORT=console
```

**Feature Flags:**
```bash
DISABLE_SCHEDULING=false
```

### Frontend Environment Variables

**File:** `garage-door-frontend/.env.development`

**Backend API:**
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_API_KEY=garage-door-api-key-2026
```

**Analytics:**
```bash
VITE_GTM_CONTAINER_ID=GTM-TKKTF5LZ
VITE_GA4_MEASUREMENT_ID=G-HCB2P9T8MQ
```

**Optional (Commented):**
```bash
# VITE_META_PIXEL_ID=123456789
# VITE_KLAVIYO_PUBLIC_KEY=pk_xxxxx
```

### Authentication Method

**API Key Authentication:**
- Middleware: `garage-door/src/middleware/apiKeyAuth.js`
- Header: `x-api-key: garage-door-api-key-2026`
- Applied to: All `/api/*` and `/admin/*` routes (app.js:55-62)
- Public routes: `/health` only

**No user authentication system** - API key is shared across all clients

### Setup Commands

**Backend:**
```bash
cd garage-door
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

**Frontend:**
```bash
cd garage-door-frontend
npm install
npm run dev
```

---

## 8. Analytics Events

### Active Analytics

**Google Tag Manager (GTM)**
- Container ID: `GTM-TKKTF5LZ`
- Loaded: `index.html:5-10`
- Status: **ACTIVE**

**Google Analytics 4 (GA4)**
- Measurement ID: `G-HCB2P9T8MQ`
- Implementation: `garage-door-frontend/src/analytics/ga4.ts`
- Events sent via: `gtag()` + `dataLayer.push()` (ga4.ts:45-55)
- Fallback: Measurement Protocol (ga4.ts:66-103)
- Status: **ACTIVE**

**Meta Pixel (Facebook)**
- Implementation: `garage-door-frontend/src/analytics/meta.ts`
- Pixel ID: Configured via `VITE_META_PIXEL_ID` (currently commented in .env)
- Events: PageView, InitiateCheckout, Purchase (meta.ts:59-79)
- CAPI: Server-side conversion API configured (meta.ts:83-117)
- Status: **CONFIGURED but not actively initialized** (no pixel ID in .env)

**VWO (Visual Website Optimizer)**
- Implementation: `garage-door-frontend/src/analytics/vwo.ts`
- Called from: `track.ts:11, 92`
- Status: **CONFIGURED** (exact initialization depends on VWO script)

**Backend Analytics**
- Endpoint: `POST /api/events`
- Implementation: `garage-door-frontend/src/analytics/backend.ts`
- Purpose: Centralized event storage in PostgreSQL
- Status: **ACTIVE**

### Configured But Not Actively Used

These have implementation files but are NOT initialized in the current .env configuration:

**Reddit Pixel**
- File: `reddit.ts`
- Status: **NOT USED** (no env config)

**Pinterest Pixel**
- File: `pinterest.ts`
- Status: **NOT USED** (no env config)

**TikTok Pixel**
- File: `tiktok.ts`
- Status: **NOT USED** (no env config)

**LinkedIn Insight Tag**
- File: `linkedin.ts`
- Status: **NOT USED** (no env config)

**Microsoft Ads**
- File: `msAds.ts`
- Status: **NOT USED** (no env config)

**Google Ads Conversion**
- File: `googleAds.ts`
- Status: **NOT USED** (no env config)

**Chiirp (SMS Marketing)**
- File: `chiirp.ts`
- Status: **CONFIGURED** (implementation exists)

**Klaviyo (Email Marketing)**
- File: `klaviyo.ts`
- Status: **CONFIGURED** (no public key in .env)

**Sentry (Error Tracking)**
- File: `sentry.ts`
- Status: **CONFIGURED** (functional error tracking)

**Session Replay**
- File: `replay.ts`
- Status: **CONFIGURED**

### Event Tracking Implementation

**Unified Tracking Facade:** `garage-door-frontend/src/analytics/track.ts`

**Key Events Tracked:**
- `stepViewed` - Step changes (track.ts:90-102)
- `bookingSubmitted` - Booking attempt (track.ts:188-198)
- `bookingConfirmed` - Successful booking (track.ts:203-220)
- `bookingFailed` - Failed booking (track.ts:225-230)
- `flowStart` - User begins flow (track.ts:245-254)
- `flowComplete` - User completes flow (track.ts:269-296)
- `fieldError` - Validation error (track.ts:148-155)
- `timeslotSelected` - Slot selection (track.ts:342-351)
- `zipSubmitted` - ZIP entry (track.ts:326-337)

**Event Distribution:**
- Consent-gated: Only sends to marketing pixels if `canSendMarketing()` returns true (track.ts:77-83)
- Batching: Uses analytics queue to batch events (track.ts:39-47, 76-84)

---

## 9. Duplicate Prevention / Idempotency

### Primary Protection: Database Unique Constraint

**File:** `garage-door/src/database/models/Booking.js:217-230`

**Constraint:**
```javascript
{
  name: 'bookings_slot_id_active_unique',
  fields: ['slot_id'],
  unique: true,
  where: {
    slot_id: { [Op.ne]: null },
    status: { [Op.ne]: 'cancelled' }
  }
}
```

**How it works:**
- Prevents two active bookings for same `slot_id`
- Cancelled slots can be reused (excluded from constraint)
- Database-level protection (PostgreSQL constraint)

### Transaction Handling

**File:** `garage-door/src/modules/bookings/service.js:84-136`

**Flow:**
1. Start database transaction
2. Attempt to create booking record
3. If `slot_id` already exists for active booking:
   - Constraint violation (unique index error)
   - Transaction automatically rolls back
   - Returns 409 Conflict error to client
4. If successful:
   - Transaction commits
   - Booking created
   - Background job queued

**Error Code:** `CONFLICT` (409 status)
**Message:** "This time slot is no longer available"

### What's NOT Implemented

**Idempotency Keys:**
- No request deduplication via idempotency keys
- Multiple identical POST requests with different `slot_id` will create multiple bookings
- Same user can create multiple bookings without restriction

**Frontend Protection:**
- Submit button disabled during submission (prevents double-click)
- Loading state shown during API call
- Not foolproof (user can still make duplicate requests via API)

### Redis Slot Reservations (V1: DISABLED)

**File:** `garage-door/src/services/reservationService.js`

**Status:** Code exists but NOT used anywhere
- Endpoint `/api/scheduling/reserve` is commented out (scheduling/routes.js:32-44)
- Service not imported in any module
- Client requirement: No internal 5-minute slot holds in V1
- Kept for potential V2/V3 restoration

**Why disabled:** Operations team does not currently hold slots in external scheduling system, so internal holds would create mismatches. See worklog 2026-02-20 for full explanation.

### Concurrency Testing

**File:** `garage-door/tests/concurrency.test.js`

**Result:**
- 10 concurrent requests for same slot
- 1 succeeds (201 Created)
- 9 fail with 409 Conflict
- Average response time: 168ms
- Database constraint works correctly

---

## 10. Error Handling Behavior

### Standardized Error Format

**File:** `garage-door/src/middleware/errorHandler.js`

**Response Structure:**
```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "ERROR_CODE",
    "details": []
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### Error Codes

**File:** Error codes used throughout application

| Code | Status | Scenario |
|------|--------|----------|
| `VALIDATION_ERROR` | 400 | Invalid input (Joi validation failed) |
| `CONFLICT` | 409 | Slot already booked (duplicate prevention) |
| `NOT_FOUND` | 404 | Resource not found (booking, slot, etc.) |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `SERVICE_UNAVAILABLE` | 503 | External service down (circuit breaker open) |
| `EXTERNAL_SERVICE_ERROR` | 502 | ServiceTitan API error |

### Scenario-Specific Behavior

**1. ServiceTitan Failure**

**File:** `garage-door/src/workers/booking.workers.js:7-109`

**Flow:**
1. Background worker attempts to create ServiceTitan job
2. Call fails (timeout, 500 error, network issue)
3. Circuit breaker checks error threshold (service.js:43-62)
4. If retryable error:
   - Job retried up to 5 times with exponential backoff
   - Delays: 2s, 4s, 8s, 16s
5. After max retries:
   - Job moved to Dead Letter Queue (DLQ)
   - Booking status updated to `service_titan_status: 'failed'`
   - Error message stored in `service_titan_error` field
   - Error logged to `error_logs` table
6. **Booking still exists** - user confirmation was sent
7. Manual intervention required via admin dashboard to retry

**2. Slot Unavailable**

**File:** `garage-door/src/modules/bookings/service.js:84-136`

**Flow:**
1. User submits booking with `slot_id`
2. Another user already booked same slot
3. Database unique constraint violation
4. Transaction rolls back
5. Returns: 409 Conflict
6. Frontend shows: "This time slot is no longer available. Please select another time."
7. Analytics: `booking_failed` event tracked (track.ts:225-230)

**3. Double Submit**

**Frontend Prevention:**
- Submit button disabled during request
- Loading spinner shown
- State prevents multiple submissions

**Backend Prevention:**
- Same as "Slot Unavailable" scenario
- Database constraint prevents duplicate slot booking
- Returns 409 Conflict if same slot

**4. Redis Failure**

**File:** `garage-door/src/server.js:49-80`

**Flow:**
1. Server startup attempts Redis connection
2. If Redis connection fails:
   - Server logs error
   - Server exits with code 1 (process.exit(1))
   - Cannot start without Redis (workers depend on it)

**During Runtime:**
- If Redis connection drops:
  - Queue operations fail
  - New jobs cannot be enqueued
  - Booking creation still succeeds (synchronous)
  - ServiceTitan integration deferred (job not queued)
  - Error logged
  - Booking saved with `service_titan_status: null`
  - Manual retry required later

**5. Database Failure**

**File:** `garage-door/src/server.js:49-80`

**Flow:**
1. Server startup attempts database connection
2. If connection fails:
   - Server logs error
   - Server exits with code 1
   - Cannot start without database

**During Runtime:**
- Connection pool handles transient errors
- Sequelize auto-retries (pool settings)
- If query fails:
  - Transaction rolls back
  - Returns 500 Server Error
  - Error logged to console (not to database)

### Error Sanitization

**File:** `garage-door/src/utils/errorSanitizer.js`

**Security:**
- Stack traces sanitized (file paths removed)
- No PII in error messages
- Development: Full stack traces
- Production: Minimal error details

---

## 11. Feature Flags

### Current State: **NO FORMAL FEATURE FLAG SYSTEM**

No LaunchDarkly, Flagsmith, or custom feature flag framework is implemented.

### Environment Variable Flags

**File:** `garage-door/.env`

**1. Queue Workers Toggle**
```bash
ENABLE_QUEUE_WORKERS=true
```
- **File:** `workers/index.js:23-29`
- **Effect:** If false, no workers start (booking processing disabled)
- **Use Case:** Development testing without background jobs

**2. Scheduling Kill Switch**
```bash
DISABLE_SCHEDULING=false
```
- **File:** `.env:67` (note: actual line in .env file, may vary based on comments)
- **Effect:** If true, disables online scheduling entirely
- **Use Case:** Emergency fallback mode (no restart needed, just server restart)
- **Note:** Not currently used in code, placeholder for future

### Simulation Mode

**ServiceTitan Simulation:**
- **Detection:** Checks for placeholder API key (service.js:14-20)
- **Automatic:** If `SERVICETITAN_API_KEY=placeholder_api_key_here`, uses simulation
- **No flag needed:** Behavior determined by key validity

### Recommendation for Production

Consider adding feature flag system for:
- Birlasoft integration toggle (switch between direct ST calls and Birlasoft proxy)
- Analytics provider toggles (enable/disable specific pixels)
- A/B testing booking flow variations
- Gradual rollout of new features

**Suggested Tools:**
- LaunchDarkly (enterprise)
- Flagsmith (open source)
- Custom Redis-based flags (simple)

---

## 12. Known Weak Spots / Technical Debt

### 1. ServiceTitan Integration is Simulated

**Impact:** High
**Files:** `integrations/servicetitan/service.js:126-308`

**Issue:**
- No real API calls made
- In-memory simulation lost on restart
- Job type hardcoded to `'garage_door_service'` (line 223)
- Should use `serviceTitanJobTypeId` from database (added in Phase 2)

**Required for Production:**
- Real ServiceTitan OAuth credentials
- Implement actual API calls
- OR: Switch to Birlasoft integration (documented in `.claude/handoff-docs/birlasoft-integration-plan.md`)
- Update mapping logic to use job type IDs from database

### 2. No Idempotency Keys

**Impact:** Medium
**Files:** No implementation

**Issue:**
- Duplicate POST requests create duplicate bookings (if different slots)
- No request deduplication
- Vulnerable to network retries, client bugs

**Recommendation:**
- Add `Idempotency-Key` header support
- Store processed keys in Redis with 24-hour TTL
- Return cached response for duplicate keys

### 3. Missing Email Collection

**Impact:** Medium
**Files:** `booking.workers.js`, `Booking.js`

**Issue:**
- No email field in booking form
- Defaults to `no-email@provided.com`
- Birlasoft integration expects email (see birlasoft-integration-plan.md)

**Recommendation:**
- Add optional email field to Step 6
- Update Booking model
- Update validation schema

### 4. Logging is Console-Based

**Impact:** Medium
**Files:** `utils/logger.js`

**Issue:**
- Uses console.log/error, not structured logging
- No request IDs for tracing
- Hard to search/filter logs
- No log aggregation

**Recommendation:**
- Implement Winston or Pino
- Add request ID middleware
- Log to structured JSON
- Use CloudWatch/Loggly/Datadog in production

### 5. No Monitoring/Alerting

**Impact:** High
**Files:** None

**Issue:**
- No health check monitoring
- No error rate alerting
- No performance monitoring
- No DLQ size alerts
- Circuit breaker failures not alerted

**Recommendation:**
- APM: Datadog, New Relic
- Error tracking: Sentry (already configured)
- Uptime: Pingdom, UptimeRobot
- Custom: DLQ threshold alerts (code exists at queue.js:466-484, but no notifications sent)

### 6. Incomplete Test Coverage

**Impact:** Medium
**Files:** Only `tests/concurrency.test.js` exists

**Missing:**
- Unit tests for services
- Integration tests for API endpoints
- E2E tests for booking flow
- Worker job tests

**Recommendation:**
- Add Jest unit tests
- Add Supertest API tests
- Add Playwright E2E tests

### 7. No Per-User Rate Limiting

**Impact:** Low
**Files:** `middleware/rateLimiter.js`

**Issue:**
- Global rate limiting exists (100 req/15min)
- Specific limits for booking endpoints (10 req/15min)
- BUT: Limits are global, not per-IP or per-user
- Shared across all users

**Recommendation:**
- Implement per-IP rate limiting
- Use Redis for distributed rate limiting
- Different limits for booking vs. read operations

### 8. No Explicit Scheduled Date Field

**Impact:** Low-Medium
**Files:** `Booking.js`

**Issue:**
- Only stores `slot_id`, not explicit `scheduledDateTime`
- Birlasoft integration expects `scheduledDate` field
- Must derive from slot ID lookup

**Recommendation:**
- Add `scheduled_date_time` column to bookings table
- Populate during slot selection
- Simplifies integrations

### 9. Admin Dashboard Incomplete

**Impact:** Medium
**Status:** 41% complete (Phase 1 done)
**Files:** `garage-door/admin-ui/`

**Completed:**
- Authentication
- API client
- Base routing

**Missing:**
- UI components
- Error recovery interface
- DLQ management
- Queue monitoring dashboards

**Recommendation:**
- Complete Phase 2-4 of admin dashboard
- Priority: DLQ management for manual job retries

### 10. No CI/CD Pipeline

**Impact:** Medium
**Files:** None

**Issue:**
- Manual deployments
- No automated testing before deploy
- No rollback automation
- No deployment logs

**Recommendation:**
- GitHub Actions or CircleCI
- Run tests on every PR
- Auto-deploy to staging on merge
- Manual approval for production

---

## 13. Production Readiness Requirements

### Critical Changes Needed

**1. Environment Variables**

Replace placeholders with real values:
```bash
# ServiceTitan (OR use Birlasoft instead)
SERVICETITAN_API_KEY=<real_oauth_key>
SERVICETITAN_TENANT_ID=<real_tenant_id>
SERVICETITAN_APP_KEY=<real_app_key>

# OR Birlasoft Integration
BIRLASOFT_INTEGRATION_URL=<cloud_run_endpoint>

# Database (Production)
DATABASE_URL=<postgres_connection_string>
DB_SSL=true

# Redis (Production)
REDIS_URL=<redis_connection_string>

# Analytics
GA4_MEASUREMENT_ID=<real_measurement_id>
GA4_API_SECRET=<real_api_secret>

# CORS (Production domains)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**2. Infrastructure**

**Backend Hosting:**
- Current: Render
- Alternatives: AWS (EC2/ECS), Heroku, Railway, Fly.io
- Requirements: Node.js v18+, always-on (not serverless)

**Frontend Hosting:**
- Current: Vercel
- Alternatives: Netlify, Cloudflare Pages, S3+CloudFront
- Requirements: Static hosting, CDN

**Database:**
- Production PostgreSQL: AWS RDS, Heroku Postgres, Render Postgres
- Backups: Daily automated, point-in-time recovery
- Connection pooling: PgBouncer recommended

**Redis:**
- Production Redis: Upstash (paid tier), Redis Cloud, AWS ElastiCache
- Persistence: AOF or RDB enabled
- High availability: Redis Cluster or Sentinel

**SSL/HTTPS:**
- Required for both frontend and backend
- Let's Encrypt (auto-renewal), AWS ACM, or Cloudflare

**3. Scaling**

**Horizontal Scaling:**
- Load balancer: AWS ALB, Cloudflare Load Balancing
- Multiple backend instances: 2+ for redundancy
- Worker scaling: Multiple worker instances process queue concurrently
- Sticky sessions: Not needed (stateless API)

**Connection Pooling:**
- PgBouncer for PostgreSQL
- Config: `DB_POOL_MAX=10` per instance
- Total connections = instances × pool max

**Queue Workers:**
- Current: 1 concurrency per worker type
- Production: 3-5 concurrency (config in workers/index.js:57-126)
- Separate worker instances: Dedicated servers for background jobs

**Redis Cluster:**
- High availability: Redis Sentinel or Cluster mode
- Failover: Automatic

**4. Security**

**Input Validation:**
- Already implemented: Joi validation (all endpoints)
- SQL injection: Protected via Sequelize parameterization
- XSS: Protected via React (auto-escaping)

**Rate Limiting:**
- Current: Global limits (100 req/15min, 10 bookings/15min)
- Production: Add per-IP limits via Redis
- DDoS protection: Cloudflare, AWS Shield

**API Key Security:**
- Current: Shared API key
- Production: Consider JWT or OAuth for multi-tenant
- Rotate keys: Quarterly

**Secrets Management:**
- Current: .env files
- Production: AWS Secrets Manager, Vault, Doppler
- Never commit secrets to git

**CORS:**
- Update `CORS_ORIGIN` to production domains only
- Remove localhost from production .env

**5. Monitoring**

**Application Performance Monitoring (APM):**
- Datadog, New Relic, AppSignal
- Track: Response times, error rates, throughput
- Alerts: >1% error rate, >500ms P95 latency

**Error Tracking:**
- Sentry (already configured in frontend)
- Add Sentry to backend
- Alerts: On new error types

**Uptime Monitoring:**
- Pingdom, UptimeRobot, Better Uptime
- Check: `/health` endpoint every 1 minute
- Alerts: SMS/Email on downtime

**Log Aggregation:**
- CloudWatch (AWS), Loggly, Papertrail
- Centralize logs from all instances
- Retention: 30-90 days

**Analytics Dashboards:**
- GA4 for user behavior
- Custom dashboard for booking metrics (Grafana, Datadog)
- Monitor: Bookings per day, conversion rate, slot utilization

**6. Deployment**

**CI/CD Pipeline:**
- GitHub Actions, CircleCI, GitLab CI
- On push: Run tests, lint, type-check
- On merge to main: Deploy to staging
- Manual approval: Deploy to production

**Automated Testing:**
- Unit tests: Jest (backend + frontend)
- Integration tests: Supertest (API endpoints)
- E2E tests: Playwright (booking flow)
- Minimum: 70% code coverage

**Blue-Green Deployment:**
- Zero-downtime deployments
- Deploy to "green" environment
- Switch traffic after health check
- Rollback: Switch back to "blue"

**Database Migrations:**
- Run migrations before code deployment
- Use `npm run db:migrate` in deployment script
- Rollback plan: `npm run db:migrate:undo`

**Rollback Procedures:**
- Keep previous 3 releases deployable
- Document rollback steps
- Test rollback in staging

**7. Documentation**

**API Documentation:**
- OpenAPI/Swagger spec
- Generate from code or write manually
- Host on /docs endpoint

**Runbook:**
- Common issues and resolutions
- How to restart services
- How to check queue health
- How to retry failed jobs from DLQ

**Incident Response:**
- On-call rotation (PagerDuty, Opsgenie)
- Escalation procedures
- Postmortem template

**Team Handoff:**
- This document
- Architecture diagrams
- Video walkthrough (client to record)

---

## Summary

**System Status:** V1 Pilot (Development-ready, NOT production-ready)

**What Works:**
- Full booking flow (frontend → backend → database)
- Slot availability checking
- ZIP validation (accepts all valid US ZIPs)
- Duplicate prevention (database constraint)
- Analytics tracking (GA4, GTM)
- Background job processing (Bull Queue)
- Error handling and recovery

**What Needs Work for Production:**
1. Replace ServiceTitan simulation with real integration OR Birlasoft proxy
2. Add real API credentials (ServiceTitan, analytics)
3. Implement monitoring and alerting
4. Add comprehensive test coverage
5. Set up CI/CD pipeline
6. Complete admin dashboard
7. Add structured logging
8. Implement per-user rate limiting

**Reference Documentation:**
- Current ServiceTitan Integration: `.claude/handoff-docs/current-servicetitan-integration.md`
- Birlasoft Integration Plan: `.claude/handoff-docs/birlasoft-integration-plan.md`
- Production Readiness Plan: `garage-door/.claude/IMPLEMENTATION_PLAN.md`

---

**Last Updated:** 2026-02-25
**Next Review:** Before production deployment
