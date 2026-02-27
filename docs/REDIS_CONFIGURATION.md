# Redis Configuration Documentation

**Created:** 2026-02-26
**Purpose:** Client handoff documentation - Phase 2.4

---

## Overview

Redis is used for queue management and caching in the A1 Garage Door backend system. This document covers configuration, usage, and optimization settings (including Feb 25 Upstash free tier optimizations).

**Library:** `ioredis` (Redis client), `bull` (Queue management)

---

## Environment Configuration

### Local Development (Docker)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0                  # Main Redis database
REDIS_QUEUE_DB=1            # Separate database for Bull queues
```

**Docker Service:**
- **Container:** `a1-garage-redis`
- **Image:** `redis:7-alpine`
- **Port mapping:** `6379:6379`
- **Health check:** Built-in Redis health check (30s interval)

### Cloud/Production (Upstash or similar)

```bash
# Option 1: Redis URL (recommended for cloud providers)
REDIS_URL=redis://username:password@host:port

# Option 2: Individual parameters
REDIS_HOST=redis-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password-here
REDIS_DB=0
REDIS_QUEUE_DB=1
```

**Cloud Configuration (Auto-detected):**
- TLS enabled automatically when using cloud host
- Connection pooling optimized
- Offline queue disabled for reliability
- Lazy connect enabled (60s timeout)

---

## Connection Configuration

### File: `src/config/redis.js`

#### Connection Parameters

```javascript
{
  host: env.REDIS_HOST,               // Hostname or IP
  port: env.REDIS_PORT,               // Port (default: 6379)
  password: env.REDIS_PASSWORD,       // Auth password (optional for local)
  db: env.REDIS_DB,                   // Database number (0-15)

  // Retry & Timeout
  retryDelayOnFailover: 500,         // Delay before retry on failover (ms)
  maxRetriesPerRequest: 5,            // Max retries per command
  connectTimeout: 60000,              // Connection timeout (60s)
  commandTimeout: 30000,              // Command timeout (30s)

  // Connection Behavior
  enableReadyCheck: true,             // Check if Redis is ready
  lazyConnect: true,                  // Don't connect immediately
  keepAlive: 30000,                   // Keep connection alive (30s)
  family: 4,                          // IPv4 only

  // Cloud-specific (auto-enabled for non-localhost hosts)
  tls: {
    rejectUnauthorized: false         // Accept self-signed certs
  },
  enableOfflineQueue: false,          // Disable offline queue for reliability
  retryDelayOnFailover: 1000,        // 1s retry delay (cloud)
  maxRetriesPerRequest: null          // Unlimited retries (cloud)
}
```

### Connection Events

```javascript
// Event listeners
client.on('connect', () => {
  logger.info('Redis connected successfully');
});

client.on('error', (err) => {
  logger.error('Redis connection error', { error: err });
});

client.on('close', () => {
  logger.info('Redis connection closed');
});

client.on('reconnecting', () => {
  logger.info('Redis reconnecting');
});
```

### Health Check

```javascript
// File: src/config/redis.js:118-127
async healthCheck() {
  try {
    if (!this.client) return false;
    const result = await this.client.ping();
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}
```

**Usage:**
```javascript
const { redisHealthCheck } = require('./config/redis');
const isHealthy = await redisHealthCheck();
```

---

## Queue Configuration

### File: `src/config/queue.js`

#### Queue Settings (Optimized Feb 25, 2026)

These settings were optimized to reduce Redis requests for Upstash free tier (500K request limit).

```javascript
{
  settings: {
    stalledInterval: 300000,        // Check stalled jobs every 5 min (was 60s)
                                    // ↳ 80% reduction in polling requests

    maxStalledCount: 1,             // Max times job can stall before failed

    retryProcessDelay: 10000,       // 10s delay before retrying failed process
                                    // ↳ (was 5s, reduced polling frequency)

    delayedDebounce: 10000,         // 10s debounce for delayed jobs
                                    // ↳ (was 5s, reduced Redis checks)

    backoffStrategies: {}           // Custom backoff strategies (empty)
  }
}
```

#### Queue Names

1. **`booking-processing`** - Active booking jobs
2. **`notifications`** - Email/SMS notifications (DISABLED in V1)
3. **`integrations`** - External API sync (DISABLED in V1)
4. **`analytics`** - Analytics processing (DISABLED in V1)
5. **`dlq`** - Dead Letter Queue (failed jobs)

---

## Queue Workers

### File: `src/workers/index.js`

#### Active Workers (V1)

**Booking Workers (3 concurrent):**
- `create-servicetitan-job` - Create job in ServiceTitan API
- `confirm-time-slot` - Confirm slot reservation
- `validate-booking` - Validate booking data

**Worker Configuration:**
```javascript
// File: src/workers/index.js:54-71
startBookingWorkers(concurrency = 3) {
  const bookingQueue = queueManager.getBookingQueue();

  bookingQueue.process('create-servicetitan-job', concurrency,
    bookingWorkers.createServiceTitanJob);

  bookingQueue.process('confirm-time-slot', concurrency,
    bookingWorkers.confirmTimeSlot);

  bookingQueue.process('validate-booking', concurrency,
    bookingWorkers.validateBooking);
}
```

#### Disabled Workers (V1 - Redis Optimization)

**Lines 37-41 in `src/workers/index.js`:**
```javascript
// DISABLED - Not critical for MVP, reduces Redis usage by ~60%
// Uncomment these when you have more Redis capacity or paid tier
// this.startNotificationWorkers(1);
// this.startAnalyticsWorkers(1);
// this.startIntegrationWorkers(1);
```

**Why disabled:** Reduced worker count from 11 → 3 (73% reduction), saving ~150K Redis requests/day

**To re-enable:** Uncomment lines 39-41 in `src/workers/index.js`

---

## Job Configuration

### File: `src/config/queue.js` (lines 133-164)

#### Default Job Options

```javascript
{
  // Job Retention (OPTIMIZED Feb 25)
  removeOnComplete: true,           // Remove immediately (was: keep 10)
  removeOnFail: true,               // Remove immediately (was: keep 5)
                                    // ↳ Prevents job accumulation, reduces GET requests

  // Retry Configuration
  attempts: 5,                      // Max retry attempts
  backoff: {
    type: 'exponential',            // Exponential backoff
    delay: 2000                     // Base delay: 2s
  },
  // ↳ Retry delays: 2s, 4s, 8s, 16s, 32s

  // Priority & Timeout
  priority: 1,                      // Job priority (1 = highest)
  timeout: 300000,                  // Job timeout: 5 minutes

  // Job-specific settings
  jobId: undefined,                 // Auto-generated if not provided
  delay: 0,                         // No delay by default
  lifo: false                       // FIFO queue (first in, first out)
}
```

#### Booking Job Example

```javascript
// File: src/modules/bookings/service.js (approx line 280)
await queueManager.getBookingQueue().add(
  'create-servicetitan-job',        // Job name
  {
    bookingId: booking.id,          // Job data
    bookingData: bookingDetails
  },
  {
    attempts: 5,                    // Max 5 retries
    priority: 1,                    // Critical job
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
);
```

---

## Redis Usage Breakdown

### V1 Current State (Post-Feb 25 Optimization)

**Workers Running:**
- 3 booking workers (critical only)
- 0 notification workers (disabled)
- 0 analytics workers (disabled)
- 0 integration workers (disabled)

**Estimated Redis Requests:**
- **Polling:** ~40-50K/day (reduced from 200K/day)
  - Stalled job checks: Every 5 minutes (was 1 minute)
  - Delayed job checks: Every 10 seconds (was 5 seconds)
- **Job Operations:** Varies by traffic
  - Job add: ~10-20/day (low volume in dev)
  - Job complete/fail: ~10-20/day
- **Total:** ~50-70K/day (well under 500K Upstash free tier limit)

### Upstash Free Tier

**Limits:**
- **Requests:** 500K per month (~16.6K per day)
- **Storage:** 256 MB
- **Bandwidth:** Unlimited

**Current Usage (Post-optimization):**
- ~50-70K requests/day × 30 days = ~1.5-2.1M requests/month
- **Status:** Still above free tier limit
- **Recommendation:** Upgrade to paid tier ($10/mo for 10M requests) or reduce worker count further

---

## Dead Letter Queue (DLQ)

### Configuration

**Purpose:** Capture jobs that fail after max retry attempts

**File:** `src/config/queue.js` (lines 94-121)

**Trigger:** Job fails after 5 attempts

**Behavior:**
```javascript
// Move job to DLQ
async moveToDLQ(queueName, job, error) {
  const dlq = this.getDLQQueue();
  await dlq.add('failed-job', {
    originalQueue: queueName,
    jobId: job.id,
    jobName: job.name,
    jobData: job.data,
    error: error.message,
    stack: error.stack,
    attemptsMade: job.attemptsMade,
    timestamp: new Date().toISOString()
  }, {
    removeOnComplete: false,        // Keep DLQ jobs
    removeOnFail: false             // Don't auto-remove
  });
}
```

### DLQ Monitoring

**Service:** `src/services/dlqMonitorService.js`

**Thresholds:**
- **Warning:** 20 jobs in DLQ
- **Critical:** 50 jobs in DLQ

**Check Interval:** Every 5 minutes (300 seconds)

**Current State (Feb 26, 2026):**
- 7 jobs in DLQ
- Oldest job: Feb 9, 2026 (16 days old)
- Job type: `create-servicetitan-job`
- Reason: ServiceTitan API simulation jobs from testing

---

## Not Used in V1

### Slot Reservations (Internal)

**File:** `src/services/reservationService.js`

**Status:** NOT USED

**Reason:** Client requested removal of 5-minute internal slot holds for V1

**Note:** External SchedulingPro API still reserves slots (15-minute holds). This is separate from internal Redis reservations.

**Kept for V2/V3:** File exists for potential future restoration

---

## Common Operations

### 1. Check Redis Connection

```bash
# From Docker host
docker exec a1-garage-redis redis-cli ping
# Output: PONG

# From Node.js
const { redisHealthCheck } = require('./config/redis');
const isHealthy = await redisHealthCheck();
console.log(isHealthy); // true or false
```

### 2. View Queue Status

```bash
# From Docker host
docker exec a1-garage-redis redis-cli

# Inside Redis CLI
> KEYS bull:*                           # List all Bull queue keys
> LLEN bull:booking-processing:wait    # Count waiting jobs
> LLEN bull:booking-processing:active  # Count active jobs
> LLEN bull:dlq:wait                   # Count DLQ jobs
> GET bull:booking-processing:meta     # Queue metadata
```

### 3. Clear Queue (Development Only)

```bash
# DANGER: Only use in development
docker exec a1-garage-redis redis-cli FLUSHDB
```

**Warning:** This deletes ALL data in the current database (DB 0 or DB 1)

### 4. Monitor Queue in Real-time

```bash
# Watch queue activity
docker exec a1-garage-redis redis-cli --scan --pattern "bull:*"

# Monitor commands
docker exec a1-garage-redis redis-cli MONITOR
```

### 5. Get Worker Stats

**API Endpoint:** `GET /health` (includes worker stats)

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "workers": {
    "running": true,
    "queues": {
      "booking-processing": {
        "waiting": 0,
        "active": 1,
        "completed": 42,
        "failed": 3,
        "delayed": 0
      },
      "dlq": {
        "waiting": 7
      }
    }
  }
}
```

---

## Troubleshooting

### Issue 1: Redis Connection Failed

**Symptom:**
```
Redis connection error: ECONNREFUSED
```

**Solution:**
```bash
# Check if Redis container is running
docker ps | grep redis

# Start Redis container
cd garage-door
docker compose up redis -d

# Check logs
docker logs a1-garage-redis
```

### Issue 2: Jobs Not Processing

**Symptom:** Jobs stuck in "waiting" state

**Causes:**
1. Workers disabled (`ENABLE_QUEUE_WORKERS=false`)
2. Redis connection lost
3. Worker process crashed

**Solution:**
```bash
# Check worker status
curl http://localhost:3000/health | jq .workers

# Check environment variable
grep ENABLE_QUEUE_WORKERS .env

# Enable workers
echo "ENABLE_QUEUE_WORKERS=true" >> .env

# Restart server
npm run dev
```

### Issue 3: Upstash Free Tier Limit Hit

**Symptom:**
```
ERR max requests limit exceeded. Limit: 500000, Usage: 500000
```

**Solutions:**

**Option A: Upgrade to Paid Tier**
- Cost: $10/mo for 10M requests
- Best for production

**Option B: Further Reduce Workers**
```javascript
// src/workers/index.js
// Comment out even booking workers temporarily
// this.startBookingWorkers(1);
```

**Option C: Switch Redis Provider**
- Railway: 1GB storage, unlimited requests (free tier)
- Redis Labs: 30MB, unlimited requests (free tier)
- Render: Managed Redis (paid only)

### Issue 4: High Memory Usage

**Symptom:** Redis using too much memory

**Causes:**
- Jobs not being removed after completion
- DLQ accumulation

**Solutions:**
```bash
# Check memory usage
docker exec a1-garage-redis redis-cli INFO memory

# Clear completed jobs (if removeOnComplete: false)
docker exec a1-garage-redis redis-cli DEL bull:booking-processing:completed

# Clear DLQ (after reviewing failures)
docker exec a1-garage-redis redis-cli DEL bull:dlq:wait
```

---

## Production Checklist

### Before Deployment

- [ ] Set `REDIS_URL` or cloud-specific `REDIS_HOST`
- [ ] Set strong `REDIS_PASSWORD` (min 32 characters)
- [ ] Enable SSL/TLS (automatic for cloud providers)
- [ ] Configure Redis persistence (AOF or RDB snapshots)
- [ ] Set up Redis backups (daily recommended)
- [ ] Monitor Redis request count
- [ ] Set up alerts for Redis failures
- [ ] Plan for Redis scaling (cluster or sharding)
- [ ] Test failover behavior
- [ ] Document Redis access credentials securely

### Recommended Settings (Production)

```bash
# Environment
REDIS_URL=redis://...upstash.io:6379
REDIS_PASSWORD=<strong-password-here>
ENABLE_QUEUE_WORKERS=true

# Re-enable all workers for production
# Uncomment lines 39-41 in src/workers/index.js
```

### Monitoring

**Metrics to track:**
- Request count per day
- Memory usage
- Connection errors
- Job failure rate
- DLQ size
- Average job processing time

**Tools:**
- Upstash Console (for Upstash)
- Redis Insight (desktop app)
- Custom monitoring via `/health` endpoint

---

## Configuration Files Reference

| File | Purpose | Key Settings |
|------|---------|--------------|
| `src/config/redis.js` | Redis connection | Host, port, password, TLS |
| `src/config/queue.js` | Bull queue manager | Polling intervals, job retention |
| `src/workers/index.js` | Worker management | Worker enable/disable, concurrency |
| `src/services/dlqMonitorService.js` | DLQ monitoring | Check interval, thresholds |
| `.env` | Environment config | All Redis variables |
| `docker-compose.yml` | Docker setup | Redis container config |

---

## Redis Databases

| DB Number | Purpose | Keys Pattern |
|-----------|---------|--------------|
| 0 | General cache | `cache:*`, rate limiting |
| 1 | Bull queues | `bull:*` |

**Isolation:** Separate databases prevent conflicts between cache and queue operations

---

**Last Updated:** 2026-02-26
**Verified:** Configuration tested in development with Docker and Upstash
**Next Review:** When deploying to production or changing worker configuration
