# Concurrency Testing for Double-Booking Prevention

This directory contains tests to verify that the booking system prevents double-booking under concurrent load.

## Test Coverage

The concurrency test verifies all three protection layers:

1. **Redis Slot Reservations** - Early rejection of duplicate requests
2. **Database Transactions** - Atomic operations prevent partial states
3. **Unique Constraint on slot_id** - Database-level enforcement

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

## What Each Test Validates

### Test 1: Redis Reservation Layer
- First request reserves slot in Redis (5-minute TTL)
- Subsequent requests fail IMMEDIATELY at Redis check
- Faster rejection, less database load

### Test 2: Database Transaction Layer
- If Redis is bypassed/fails, transaction ensures atomicity
- Either entire booking succeeds OR entire booking rolls back
- No partial bookings in database

### Test 3: Unique Constraint Layer
- Final safety net at database level
- Unique index on `bookings(slot_id)` WHERE status NOT IN ('cancelled')
- Database rejects duplicate `slot_id` with constraint violation
- Application catches violation and returns 409 Conflict

## Performance Expectations

**Response Times:**
- Redis rejection: < 50ms (very fast)
- Database rejection: 100-300ms (normal)
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
Test will still pass if Redis is down (graceful degradation), but you'll see:
- Slower conflict detection
- All rejections happen at database level instead of Redis

### Multiple Bookings Succeed (Test Fails)
This is a CRITICAL issue. Check:
1. Is unique constraint applied? `\d bookings` in psql
2. Are transactions working? Check `src/modules/bookings/service.js`
3. Is Redis reservation logic correct? Check `src/services/reservationService.js`

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
