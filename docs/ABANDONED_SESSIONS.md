# Abandoned Sessions - ServiceTitan Integration

**Last Updated:** 2026-03-03
**Status:** ✅ Production Ready

## Overview

The Abandoned Sessions feature captures user information when visitors start but don't complete the Rapid Response booking flow. When a user provides contact information but abandons the process, their data is automatically sent to ServiceTitan as a **Booking** (not a Job), allowing the client to follow up and potentially convert the lead.

## How It Works

### User Flow

1. **User starts booking flow** - Enters service details, selects date/time
2. **User provides contact info** (Step 6+) - Enters name, phone, email, address
3. **User abandons** - Either:
   - Closes browser tab/window
   - Navigates away from the page
   - Becomes inactive for 5+ minutes
4. **System captures session** - Frontend sends data to backend via `sendBeacon`
5. **Backend processes** - Stores in database, sends to ServiceTitan asynchronously
6. **ServiceTitan receives** - Creates Booking record with clear "ABANDONED SESSION" label

### Trigger Conditions

An abandoned session is captured when **ALL** of these conditions are met:

- ✅ User reached step 6+ (contact information step)
- ✅ User provided at least name + (email OR phone)
- ✅ User has NOT completed the booking
- ✅ One of the following occurs:
  - Page is closed/hidden (`pagehide`, `visibilitychange` events)
  - User navigates away (`beforeunload` event)
  - User is inactive for 5+ minutes (configurable threshold)

### What Data is Captured

**Contact Information:**
- First name
- Last name
- Email address
- Phone number (E.164 format: +1XXXXXXXXXX)
- SMS opt-in preference (actual value from form, never defaulted)

**Address (Partial Allowed):**
- Street address (optional)
- City
- State
- ZIP code

**Booking Context:**
- Service type (repair, installation, maintenance, etc.)
- Service symptom (if provided)
- Door count
- Selected date/time slot
- Last step reached

**Session Context:**
- UTM parameters (source, medium, campaign)
- Campaign ID
- Flow source (widget, modal, etc.)
- Referrer URL
- Session ID
- Time elapsed in flow
- Idle time before abandonment

**ServiceTitan Status:**
- Booking ID (after successful send)
- Status (pending, sent, failed)
- Error message (if failed)
- Timestamp of send

## ServiceTitan Integration

### Booking Format

Abandoned sessions are sent to ServiceTitan as **Bookings** (not Jobs) via the ServiceTitan API.

**Example ServiceTitan Booking:**

```
Name: Michael Turner
Address: Unknown, Marion, OH 43302 US
Email: michael.turner@example.com
Phone: (740) 555-0198
Requested Time: 3/2/2026 3:56 PM
Brand: Don's Garage Doors
Campaign: DON-CLB-EN-PPC-Google-Brand-TN-Active

Summary:
THIS IS AN ABANDONED SESSION FROM RAPID RESPONSE.
THIS CUSTOMER DID NOT COMPLETE THE BOOKING PROCESS IN YOUR SCHEDULER.
YOU MAY REACH OUT TO THEM AT YOUR DISCRETION TO TRY TO CONVERT THEM.

Customer Name: Michael Turner
SMS Communications Opt-In: Yes
Email: michael.turner@example.com
Phone: (740) 555-0198
Brand: Don's Garage Doors
Campaign: DON-CLB-EN-PPC-Google-Brand-TN-Active
Flow Source: rapid_response
Last Step: contact (Step 6)
Time in Flow: 125s
Idle Time: 45s

--- Service Request ---
Service Type: repair
Service Symptom: spring_bang
Door Count: 2

--- Marketing Attribution ---
Source: google
Medium: ppc
Campaign: DON-CLB-EN-PPC-Google-Brand-TN-Active
```

### Field Mapping

| RR Field | ServiceTitan Field | Notes |
|----------|-------------------|-------|
| `firstName`, `lastName` | `firstName`, `lastName` | Split from full name |
| `phone` | `phone` | Formatted to 10-digit US format |
| `email` | `email` | Required for ServiceTitan |
| `street`, `city`, `state`, `zip` | `address` | Partial addresses allowed (e.g., "Unknown, City, State Zip") |
| `selectedDate` | `requestedTime` | ISO 8601 format |
| `utmCampaign` | `campaign` | Campaign name from UTM params |
| Campaign prefix | `brand` | Mapped via prefix (see Brand Mapping below) |
| Session context | `summary` | Detailed text summary with all context |
| `flowSource` | `source` | Set to `"abandoned_rapid_response"` |

### Brand Mapping

The brand is determined by the campaign ID prefix:

| Campaign Prefix | Brand Name |
|----------------|------------|
| `DON-*` | Don's Garage Doors |
| `ABC-*` | ABC Garage Doors |
| `A1-*` | A1 Garage Door Service |
| *(unknown)* | A1 Garage Door Service (default) |

**Example:**
- Campaign: `DON-CLB-EN-PPC-Google-Brand-TN-Active`
- Prefix: `DON`
- Brand: **Don's Garage Doors**

### Retry Logic

If ServiceTitan API call fails, the system automatically retries with exponential backoff:

- **Attempt 1:** Immediate
- **Attempt 2:** After 1 second
- **Attempt 3:** After 2 seconds
- **Attempt 4:** After 4 seconds

**Retryable errors:**
- Network timeouts
- 5xx server errors
- Temporary connectivity issues

**Non-retryable errors:**
- Missing required fields (email/phone)
- Authentication errors
- Invalid data format

Failed sessions are marked in the database and can be manually retried later.

## Configuration

### Environment Variables

```bash
# Master toggle for abandoned session tracking
# Set to false to disable the feature entirely
ABANDONED_SESSION_ENABLED=true

# Inactivity threshold in milliseconds
# Default: 300000 (5 minutes)
# User must be idle for this duration before abandoned session is triggered
ABANDONED_SESSION_INACTIVITY_THRESHOLD_MS=300000

# Toggle for ServiceTitan integration
# Set to false to capture sessions but not send to ServiceTitan (testing mode)
SERVICETITAN_CREATE_BOOKINGS_FOR_ABANDONED=true

# ServiceTitan API credentials (required for integration)
SERVICETITAN_API_KEY=your_api_key_here
SERVICETITAN_TENANT_ID=your_tenant_id_here
```

### Feature Toggles

**Disable abandoned session tracking:**
```bash
ABANDONED_SESSION_ENABLED=false
```
- Frontend will not send abandoned session data
- Backend endpoint will reject requests

**Disable ServiceTitan integration only:**
```bash
SERVICETITAN_CREATE_BOOKINGS_FOR_ABANDONED=false
```
- Sessions are still captured and stored in database
- No bookings are created in ServiceTitan
- Useful for testing or debugging

**Adjust inactivity threshold:**
```bash
# 10 minutes instead of 5
ABANDONED_SESSION_INACTIVITY_THRESHOLD_MS=600000
```

## Architecture

### Frontend Implementation

**File:** `garage-door-frontend/src/analytics/heartbeat.ts`

**Key Functions:**
- `sendAbandonedSessionToBackend()` - Sends session data to backend via `sendBeacon`
- `checkInactivity()` - Monitors idle time and triggers abandoned session on threshold
- `trackFormAbandon()` - Listens to page unload events

**Why sendBeacon?**
- Reliable delivery even when page is closing
- Non-blocking (doesn't delay page navigation)
- Queued by browser for async transmission

**Duplicate Prevention:**
- Uses `hasAbandonedSessionBeenSent` flag
- Only sends once per session
- Flag is memory-only (resets on page reload)

### Backend Implementation

**Database:**
- **Table:** `abandoned_sessions`
- **Model:** `src/database/models/AbandonedSession.js`
- **Migration:** `src/database/migrations/20260303121212-create-abandoned-sessions-table.js`

**API Endpoint:**
- **Route:** `POST /api/abandoned-sessions`
- **Controller:** `src/modules/abandoned-sessions/controller.js`
- **Service:** `src/modules/abandoned-sessions/service.js`
- **Validator:** `src/modules/abandoned-sessions/validator.js`

**ServiceTitan Integration:**
- **Service:** `src/modules/integrations/servicetitan/service.js`
- **Method:** `createBooking()` - Creates ServiceTitan booking for abandoned session
- **Helpers:**
  - `_mapAbandonedSessionToBooking()` - Maps session data to ST format
  - `_buildAbandonedSessionSummary()` - Formats detailed summary text
  - `_mapCampaignToBrand()` - Determines brand from campaign prefix

### Request Flow

```
Frontend                          Backend                         ServiceTitan
   |                                 |                                 |
   |--sendBeacon(session data)----->|                                 |
   |                                 |                                 |
   |                                 |--validate()                     |
   |                                 |--save to DB                     |
   |<--------201 Created-------------|                                 |
   |                                 |                                 |
   |                                 |--async queue                    |
   |                                 |  (setImmediate)                 |
   |                                 |                                 |
   |                                 |--createBooking()--------------->|
   |                                 |                                 |
   |                                 |<---------booking ID-------------|
   |                                 |                                 |
   |                                 |--update DB with                 |
   |                                 |  booking ID & status            |
```

**Note:** ServiceTitan integration is **asynchronous** and does not block the HTTP response. The frontend receives 201 Created immediately, and ServiceTitan processing happens in the background.

## Testing

### Manual Testing Scenarios

#### Test 1: No Contact Info (Should NOT Trigger)

1. Navigate to booking widget
2. Fill service details (steps 1-5)
3. Close browser tab
4. **Expected:** No abandoned session created

**Verification:**
```sql
SELECT * FROM abandoned_sessions ORDER BY created_at DESC LIMIT 1;
-- Should return empty or older session
```

#### Test 2: With Contact Info (Should Trigger)

1. Navigate to booking widget
2. Fill service details (steps 1-5)
3. Enter contact info: name + phone or email (step 6+)
4. Close browser tab
5. **Expected:** Abandoned session created, sent to ServiceTitan

**Verification:**
```sql
SELECT
  session_id,
  first_name,
  last_name,
  email,
  phone_e164,
  servicetitan_booking_id,
  servicetitan_status
FROM abandoned_sessions
ORDER BY created_at DESC
LIMIT 1;
```

**Check logs:**
```bash
cd garage-door
npm run dev
# Look for:
# - "Abandoned session recorded"
# - "ServiceTitan booking created for abandoned session"
# - "Abandoned session sent to ServiceTitan"
```

#### Test 3: Inactivity Timeout (Should Trigger)

1. Navigate to booking widget
2. Fill service details through contact info (step 6+)
3. Do NOT interact with page for 5+ minutes
4. **Expected:** Abandoned session triggered automatically

**Tip:** Temporarily reduce threshold for testing:
```bash
# In .env
ABANDONED_SESSION_INACTIVITY_THRESHOLD_MS=30000  # 30 seconds
```

#### Test 4: Completed Booking (Should NOT Trigger)

1. Complete entire booking flow
2. See confirmation page
3. **Expected:** No abandoned session created

### Database Queries

**View recent abandoned sessions:**
```sql
SELECT
  id,
  session_id,
  first_name || ' ' || last_name AS name,
  email,
  phone_e164,
  last_step_name,
  servicetitan_status,
  servicetitan_booking_id,
  created_at
FROM abandoned_sessions
ORDER BY created_at DESC
LIMIT 10;
```

**Count by status:**
```sql
SELECT
  servicetitan_status,
  COUNT(*) as count
FROM abandoned_sessions
GROUP BY servicetitan_status;
```

**Find failed sends:**
```sql
SELECT
  id,
  session_id,
  email,
  servicetitan_error,
  created_at
FROM abandoned_sessions
WHERE servicetitan_status = 'failed'
ORDER BY created_at DESC;
```

## Troubleshooting

### Issue: Abandoned sessions not being captured

**Possible causes:**

1. **Feature disabled in environment**
   ```bash
   # Check .env
   ABANDONED_SESSION_ENABLED=true  # Must be true
   ```

2. **User didn't reach contact info step**
   - Verify user reached step 6+
   - Check `setContactCollected(true)` is called in frontend

3. **Frontend validation error**
   - Check browser console for errors
   - Verify `sendBeacon` is supported (modern browsers only)

4. **Backend endpoint not responding**
   - Check backend logs for errors
   - Verify endpoint is public (not behind API key auth)
   - Test endpoint manually:
   ```bash
   curl -X POST http://localhost:3000/api/abandoned-sessions \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "test-123",
       "firstName": "Test",
       "lastName": "User",
       "email": "test@example.com",
       "phone": "(555) 555-5555"
     }'
   ```

### Issue: Sessions captured but not sent to ServiceTitan

**Possible causes:**

1. **ServiceTitan integration disabled**
   ```bash
   # Check .env
   SERVICETITAN_CREATE_BOOKINGS_FOR_ABANDONED=true  # Must be true
   ```

2. **Missing ServiceTitan credentials**
   ```bash
   # Check .env
   SERVICETITAN_API_KEY=your_api_key_here  # Must be real API key
   SERVICETITAN_TENANT_ID=your_tenant_id_here  # Must be real tenant ID
   ```

3. **ServiceTitan API error**
   - Check backend logs for error messages
   - Look for "ServiceTitan booking creation failed" logs
   - Check `servicetitan_error` field in database:
   ```sql
   SELECT servicetitan_error FROM abandoned_sessions WHERE servicetitan_status = 'failed';
   ```

4. **Retry logic exhausted**
   - After 3 failed attempts, session is marked as permanently failed
   - Manual retry needed via API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/abandoned-sessions/{session_id}/retry \
     -H "X-API-Key: your_api_key"
   ```

### Issue: Inactivity timeout not triggering

**Possible causes:**

1. **Threshold too high**
   - Default is 5 minutes
   - Reduce for testing:
   ```bash
   ABANDONED_SESSION_INACTIVITY_THRESHOLD_MS=60000  # 1 minute
   ```

2. **Page interactions resetting timer**
   - Mouse movements, clicks, keyboard input all reset idle timer
   - Ensure truly no interaction for full threshold duration

3. **Heartbeat not running**
   - Check browser console for heartbeat events
   - Verify `startHeartbeat()` is called on widget mount

### Issue: Duplicate sessions being created

**Should not happen** - Frontend has duplicate prevention flag. If it does happen:

1. Check `hasAbandonedSessionBeenSent` flag logic in `heartbeat.ts`
2. Verify flag is being set after first send
3. Check if page is reloading (flag is memory-only, resets on reload)

**Database-level prevention:**
```sql
-- Find potential duplicates
SELECT session_id, COUNT(*) as count
FROM abandoned_sessions
GROUP BY session_id
HAVING COUNT(*) > 1;
```

## Monitoring & Logs

### Important Log Messages

**Success flow:**
```
[Abandoned Session Validator] Validation passed
Abandoned session recorded
ServiceTitan booking created for abandoned session
  bookingId: 1772529376412
  brand: "A1 Garage Door Service"
Abandoned session sent to ServiceTitan
```

**Failure flow:**
```
[Abandoned Session Validator] Validation failed: {error details}
Failed to create abandoned session: {error message}
ServiceTitan booking creation failed: {error message}
```

### Key Metrics to Monitor

1. **Capture rate:** How many sessions are being captured?
2. **Success rate:** What % successfully send to ServiceTitan?
3. **Failure rate:** What % fail to send?
4. **Retry rate:** How many require retries?
5. **Conversion opportunity:** How many leads does this generate?

### Database Health

**Check table size:**
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('abandoned_sessions')) as total_size,
  COUNT(*) as record_count
FROM abandoned_sessions;
```

**Retention policy (recommended):**
- Keep sessions for 90 days
- Archive or delete older records
- Prevents table bloat

```sql
-- Delete sessions older than 90 days
DELETE FROM abandoned_sessions
WHERE created_at < NOW() - INTERVAL '90 days';
```

## API Reference

### Create Abandoned Session

**Endpoint:** `POST /api/abandoned-sessions`

**Authentication:** None (public endpoint)

**Rate Limit:** 100 requests per 15 minutes per IP

**Request Body:**
```json
{
  "sessionId": "bw_1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 555-5555",
  "smsOptIn": true,
  "street": "123 Main St",
  "city": "Columbus",
  "state": "OH",
  "zip": "43215",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "DON-CLB-EN-PPC-Google-Brand-TN-Active",
  "campaignId": "DON-CLB-EN-PPC-Google-Brand-TN-Active",
  "flowSource": "rapid_response",
  "serviceType": "repair",
  "serviceSymptom": "spring_bang",
  "doorCount": 2,
  "selectedDate": "2026-03-05T14:00:00Z",
  "lastStepNumber": 6,
  "lastStepName": "contact",
  "timeElapsedMs": 125000,
  "idleTimeMs": 45000
}
```

**Required Fields:**
- `sessionId`
- `firstName` OR `lastName` (at least one)
- `email` OR `phone` (at least one)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "sessionId": "bw_1234567890",
    "servicetitanStatus": "pending"
  },
  "message": "Abandoned session recorded"
}
```

**Status Codes:**
- `201 Created` - Session successfully created
- `400 Bad Request` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Get Abandoned Sessions (Admin)

**Endpoint:** `GET /api/abandoned-sessions`

**Authentication:** API Key required

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `status` (filter by `servicetitan_status`)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [...],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### Retry ServiceTitan Send

**Endpoint:** `POST /api/abandoned-sessions/:id/retry`

**Authentication:** API Key required

**Response:**
```json
{
  "success": true,
  "data": {
    "stBookingId": 1772529376412,
    "status": "sent"
  }
}
```

## Security Considerations

### TCPA Compliance

**SMS Opt-In Handling:**
- ✅ Uses actual opt-in value from form
- ❌ NEVER defaults to `true`
- ✅ Clearly communicated in ServiceTitan summary

**Important:** The `smsOptIn` field reflects the user's explicit consent during form submission. It is passed through to ServiceTitan without modification.

### Data Privacy

- Contact info is stored securely in PostgreSQL
- No credit card or payment information is captured
- Recommended retention: 90 days max
- Consider GDPR/CCPA requirements for your jurisdiction

### Rate Limiting

The endpoint is rate-limited to prevent abuse:
- **Limit:** 100 requests per 15 minutes per IP
- **Scope:** Per-IP basis
- **Response:** 429 Too Many Requests when exceeded

## FAQ

### Q: Why are we creating Bookings instead of Jobs in ServiceTitan?

**A:** Per client requirement, abandoned sessions should create **Bookings** (lower-commitment records) rather than Jobs. This signals to the dispatch team that the customer hasn't fully committed and requires follow-up.

### Q: What if the user abandons before providing contact info?

**A:** No abandoned session is created. The feature only triggers when the user reaches step 6+ and provides at least a name + (email OR phone).

### Q: What happens if ServiceTitan is down?

**A:** The backend will retry up to 3 times with exponential backoff. If all retries fail, the session is marked as `failed` in the database with the error message. These can be manually retried later via the retry endpoint.

### Q: Can we adjust the 5-minute inactivity threshold?

**A:** Yes, via the `ABANDONED_SESSION_INACTIVITY_THRESHOLD_MS` environment variable. Set it to any value in milliseconds (e.g., 600000 for 10 minutes).

### Q: Are duplicates prevented?

**A:** Yes, frontend has a flag to prevent sending the same session twice. Additionally, backend checks for existing `session_id` before creating new records.

### Q: Can we disable this feature temporarily?

**A:** Yes, set `ABANDONED_SESSION_ENABLED=false` in `.env` and restart the backend. The frontend will stop sending, and the backend will reject requests.

### Q: How do we know if it's working?

**A:**
1. Check backend logs for "Abandoned session sent to ServiceTitan" messages
2. Query database: `SELECT COUNT(*) FROM abandoned_sessions WHERE servicetitan_status = 'sent';`
3. Check ServiceTitan dashboard for new bookings with "ABANDONED SESSION" in the summary

---

## Support

For questions or issues with the abandoned sessions feature:

1. Check this documentation first
2. Review backend logs (`npm run dev` in `garage-door/`)
3. Check browser console for frontend errors
4. Query database for session status
5. Contact development team with specific error messages

---

**Version:** 1.0
**Last Updated:** 2026-03-03
**Maintained By:** Development Team
