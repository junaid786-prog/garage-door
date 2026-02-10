# Concurrency Testing for Double-Booking Prevention

This directory contains tests to verify that the booking system prevents double-booking under concurrent load.

## Test Coverage

**V1:** The concurrency test verifies the two-layer protection system:

1. **Database Transactions** - Atomic operations prevent partial states
2. **Unique Constraint on slot_id** - Database-level enforcement (primary protection)

**V2 Note:** Redis 5-minute slot reservations will be added as a third layer for early rejection.

## Running the Tests

### Basic Test (Default)

```bash
npm run test:concurrency
```

This runs 10 concurrent requests for the same slot, expecting:

- ✅ Exactly 1 booking succeeds (201 Created)
- ✅ 9 bookings fail with 409 Conflict
- ✅ No unexpected errors

### Custom Configuration

```bash
# Run with more concurrent requests
CONCURRENT_REQUESTS=20 node tests/concurrency/double-booking-test.js

# Run multiple iterations
TEST_ITERATIONS=5 node tests/concurrency/double-booking-test.js

# Test against different environment
API_URL=https://staging.a1garage.com node tests/concurrency/double-booking-test.js

# Combine options
CONCURRENT_REQUESTS=50 TEST_ITERATIONS=3 node tests/concurrency/double-booking-test.js
```

## Expected Results

### ✅ PASS Criteria

```
Total Requests:        10
✓ Successful (201):    1
⚠ Conflicts (409):     9
✗ Errors (other):      0
```

**This proves:**

- Only ONE booking succeeded
- All other requests got proper 409 Conflict errors
- The slot cannot be double-booked

### ❌ FAIL Scenarios

**Multiple Successes:**

```
✓ Successful (201):    2+   ← BAD! Double-booking occurred
```

**Unexpected Errors:**

```
✗ Errors (other):      1+   ← Something broke (500, timeout, etc.)
```

## What Each Test Validates (V1)

### Test 1: Database Transaction Layer

- Transactions ensure atomicity
- Either entire booking succeeds OR entire booking rolls back
- No partial bookings in database

### Test 2: Unique Constraint Layer (Primary Protection)

- Database-level enforcement (last resort)
- Unique index on `bookings(slot_id)` WHERE status NOT IN ('cancelled')
- Database rejects duplicate `slot_id` with constraint violation
- Application catches violation and returns 409 Conflict
- **This is the primary protection mechanism in V1**

### V2 Addition: Redis Reservation Layer

- Will add early rejection at Redis level (5-minute TTL)
- Faster conflict detection, less database load
- Requests fail IMMEDIATELY at Redis check before database

## Performance Expectations

**Response Times (V1 - Database Protection):**

- Database rejection: 180-300ms (normal, still under 500ms target)
- Successful booking: 50-100ms (async background jobs)

**Response Times (V2 - With Redis):**

- Redis rejection: < 50ms (very fast, early rejection)
- Database rejection: 100-300ms (fallback if Redis degraded)
- Successful booking: 50-100ms (async background jobs)

**Concurrent Load:**

- Should handle 50+ concurrent requests safely
- No timeouts or crashes
- Consistent behavior under load

## Troubleshooting

### Server Not Running

```
✗ Cannot connect to server at http://localhost:3000
```

**Solution:** Start the server with `npm run dev`

### Redis Not Running

**V1:** Redis is not used for slot reservations. The system uses database protection only.

**V2:** When Redis reservations are restored, the test will still pass if Redis is down (graceful degradation), but conflict detection will be slower.

### Multiple Bookings Succeed (Test Fails)

This is a CRITICAL issue. Check:

1. Is unique constraint applied? Run `\d bookings` in psql
2. Are transactions working? Check [src/modules/bookings/service.js](../../src/modules/bookings/service.js)
3. V2 only: Is Redis reservation logic correct? Check [src/services/reservationService.js](../../src/services/reservationService.js)

## Files Tested

- `src/modules/bookings/service.js` - Transaction logic
- `src/services/reservationService.js` - Redis reservations
- `src/database/migrations/20260204153358-add-slot-id-unique-constraint.js` - Unique constraint
- `src/middleware/errorHandler.js` - 409 error handling

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Concurrency Test
  run: npm run test:concurrency
```

This ensures double-booking prevention is verified on every deployment.
