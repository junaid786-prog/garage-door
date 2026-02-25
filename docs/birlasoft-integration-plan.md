# Birlasoft Integration Plan

**Last Updated:** 2026-02-25
**Source:** `.claude/Ref_docs/Integration_WF.pdf`
**Status:** Documentation only - NOT implemented

---

## Overview

Birlasoft provides a Cloud Run integration service that handles ALL ServiceTitan API interactions. Instead of our backend calling ServiceTitan directly, we POST booking data to Birlasoft's endpoint, and they handle customer lookup, job creation, and appointment scheduling.

**Architecture:**
```
Our Backend (Rapid Response Scheduler)
  ↓ POST JSON
Birlasoft Cloud Run Service
  ↓ Multiple API calls
ServiceTitan API
  ↓ Responses
Birlasoft
  ↓ 200/500 response
Our Backend
```

---

## Birlasoft Workflow (from Integration_WF.pdf)

### Step-by-Step Flow

**1. Receive JSON from Rapid Response Scheduler (us)**
- Birlasoft receives POST request with booking payload
- Endpoint: Their Cloud Run service URL (TBD)

**2. Validate JSON**
- ✅ **Correct:** Continue to step 3
- ❌ **Incorrect:** Return `500 Internal Server Error`

**3. Check Existing Customer by Phone Number**
- Query ServiceTitan: `GET /customers?phone={phoneNumber}`
- **If found:** Use existing customer ID → Skip to step 5
- **If NOT found:** Continue to step 4

**4. Create New Customer in ServiceTitan**
- API Call: `POST /customers`
- Payload: Customer details from our JSON
- Returns: `customerId`

**5. Create New Customer Contact**
- API Call: `POST /customers/{customerId}/contacts`
- Links contact info to customer

**6. Create New Job**
- API Call: `POST /jobs`
- Payload: Job details from our JSON
- Returns: `jobId`

**7. Check if slot_id Exists**
- From our JSON payload
- **If slot_id present:** Continue to step 8
- **If slot_id absent:** Skip to step 9

**8. Create New Appointment**
- API Call: `POST /appointments`
- Links job to specific time slot
- Returns: `appointmentNumber`

**9. Send Response**
- ✅ **Success:** `200 OK` with job details
- ❌ **Error:** `500 Internal Server Error` with error message

---

## Required Payload Format

**What Birlasoft expects from us:**

```json
{
  "bookingId": "uuid",
  "phoneNumber": "+12345678901",     // REQUIRED - for customer lookup
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "address": {
    "street": "123 Main St",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85001"
  },
  "serviceType": "repair",
  "problemType": "broken_spring",
  "doorCount": 2,
  "scheduledDate": "2026-03-01T10:00:00Z",
  "slot_id": "slot_12345",           // OPTIONAL - if present, creates appointment
  "notes": "Customer notes here",
  "jobTypeId": 2825580530            // From service_titan_job_types table (Phase 2)
}
```

**Key Fields:**
- `phoneNumber`: Used for customer lookup in ServiceTitan (step 3)
- `slot_id`: Determines if appointment is created (step 7-8)
- `jobTypeId`: Maps to ServiceTitan job type (Phase 2 added this to database)

---

## Data Mapping: Our Booking → Birlasoft Payload

| Our Booking Field | Birlasoft Field | Source File | Transform |
|-------------------|-----------------|-------------|-----------|
| `id` | `bookingId` | Booking model | Direct |
| `phoneE164` | `phoneNumber` | Booking model line 88-99 | Direct (already E.164) |
| `contactName` | `firstName`, `lastName` | Booking model line 100-104 | Split on space |
| N/A (missing) | `email` | - | Default: `no-email@provided.com` |
| `street` | `address.street` | Booking model line 53-56 | Direct |
| `city` | `address.city` | Booking model line 61-64 | Direct |
| `state` | `address.state` | Booking model line 65-68 | Direct |
| `zip` | `address.zip` | Booking model line 69-72 | Direct |
| `serviceType` | `serviceType` | Booking model line 14-18 | Direct |
| `serviceSymptom` | `problemType` | Booking model line 19-23 | Map: spring_bang→broken_spring |
| `doorCount` | `doorCount` | Booking model line 36-43 | Direct |
| `slotId` | `slot_id` | Booking model line 109-113 | Direct |
| `notes` | `notes` | Booking model line 126-129 | Direct |
| `serviceTitanJobTypeId` | `jobTypeId` | Booking model line 187-191 | Direct (BIGINT) |
| N/A (calculate) | `scheduledDate` | Derived from slot_id | Need slot → datetime mapping |

**Missing Data:**
- `email`: Not collected in booking form - need to add or use placeholder
- `scheduledDate`: Not explicitly stored - need to derive from `slot_id` via scheduling service

---

## Response Handling

### Success Response (200)

**Expected from Birlasoft:**
```json
{
  "success": true,
  "customerId": 12345,
  "jobId": 67890,
  "jobNumber": "JOB-067890",
  "appointmentNumber": "APT-12345" // Only if slot_id was provided
}
```

**What to do:**
- Update booking record with received IDs
- Set `serviceTitanStatus: 'scheduled'`
- Clear any previous errors

### Error Response (500)

**Expected from Birlasoft:**
```json
{
  "success": false,
  "error": "Error message here",
  "code": "CUSTOMER_CREATION_FAILED" // Example
}
```

**What to do:**
- Update booking: `serviceTitanStatus: 'failed'`
- Store error in `serviceTitanError` field
- Log to `error_logs` table
- Retry if retryable error (network, timeout, 503)
- Move to DLQ if max retries exceeded

---

## Required Changes (Documentation Only)

**IMPORTANT:** These changes are NOT implemented. This is documentation for TMV/Birlasoft teams to implement.

### 1. Environment Configuration

**File:** `garage-door/.env`

**Add:**
```env
BIRLASOFT_INTEGRATION_URL=https://birlasoft-cloud-run-service.example.com/api/servicetitan
```

### 2. Database Model Changes

**File:** `garage-door/src/database/models/Booking.js`

**Add fields (after line 191):**
```javascript
// Birlasoft integration tracking
birlasoftIntegrationStatus: {
  type: DataTypes.ENUM('pending', 'success', 'failed', 'retrying'),
  allowNull: true,
  field: 'birlasoft_integration_status',
},
birlasoftError: {
  type: DataTypes.TEXT,
  allowNull: true,
  field: 'birlasoft_error',
},
birlasoftResponseData: {
  type: DataTypes.JSONB,
  allowNull: true,
  field: 'birlasoft_response_data',
  comment: 'Full response from Birlasoft for debugging',
},
```

**Migration needed:** Add these columns to `bookings` table

### 3. Worker Modification

**File:** `garage-door/src/workers/booking.workers.js`

**Current (lines 14-15):**
```javascript
// Call real ServiceTitan integration
const result = await serviceTitanIntegration.createJobFromBooking(bookingData);
```

**Change to:**
```javascript
// Call Birlasoft integration instead
const result = await birlasoftIntegration.createJobViaCloudRun(bookingData);
```

### 4. New Integration Service

**Create:** `garage-door/src/modules/integrations/birlasoft/service.js`

**Implement:**
```javascript
class BirlasoftIntegrationService {
  async createJobViaCloudRun(bookingData) {
    // 1. Map booking data to Birlasoft format
    const payload = this._mapBookingToBirlasoftFormat(bookingData);

    // 2. POST to Birlasoft endpoint
    const response = await axios.post(
      process.env.BIRLASOFT_INTEGRATION_URL,
      payload,
      { timeout: 30000 } // 30 second timeout
    );

    // 3. Handle response
    if (response.status === 200) {
      return {
        success: true,
        serviceTitanJobId: response.data.jobId,
        serviceTitanCustomerId: response.data.customerId,
        serviceTitanJobNumber: response.data.jobNumber,
        serviceTitanAppointmentNumber: response.data.appointmentNumber,
        status: 'scheduled'
      };
    } else {
      return {
        success: false,
        error: response.data.error,
        shouldRetry: this._isRetryableError(response)
      };
    }
  }

  _mapBookingToBirlasoftFormat(bookingData) {
    // Split name
    const [firstName, ...lastNameParts] = (bookingData.contactName || 'Customer Unknown').split(' ');
    const lastName = lastNameParts.join(' ') || 'Unknown';

    return {
      bookingId: bookingData.id,
      phoneNumber: bookingData.phoneE164,
      firstName,
      lastName,
      email: bookingData.email || 'no-email@provided.com',
      address: {
        street: bookingData.street,
        city: bookingData.city,
        state: bookingData.state,
        zip: bookingData.zip
      },
      serviceType: bookingData.serviceType,
      problemType: this._mapProblemType(bookingData.serviceSymptom),
      doorCount: bookingData.doorCount,
      scheduledDate: this._deriveScheduledDate(bookingData.slotId),
      slot_id: bookingData.slotId,
      notes: bookingData.notes,
      jobTypeId: bookingData.serviceTitanJobTypeId // From Phase 2
    };
  }

  _mapProblemType(symptom) {
    const map = {
      'spring_bang': 'broken_spring',
      'wont_open': 'door_wont_open',
      'wont_close': 'door_wont_close',
      'tune_up': 'tune_up',
      'other': 'other'
    };
    return map[symptom] || 'other';
  }

  _deriveScheduledDate(slotId) {
    // TODO: Query scheduling service to get datetime from slot_id
    // For now, return current date
    return new Date().toISOString();
  }

  _isRetryableError(response) {
    // Retry on network errors, timeouts, 503
    return response.status === 503 ||
           response.status === 502 ||
           response.status === 500;
  }
}
```

### 5. Update Worker Import

**File:** `garage-door/src/workers/booking.workers.js`

**Add (line 2):**
```javascript
const birlasoftIntegration = require('../modules/integrations/birlasoft/service');
```

### 6. Error Handling

**Retryable Errors:**
- Network timeout
- 503 Service Unavailable
- 502 Bad Gateway
- Connection refused

**Non-Retryable Errors:**
- 400 Bad Request (validation failed)
- 401 Unauthorized
- 404 Not Found
- Customer already exists conflicts

**Retry Configuration:**
- Same as current: 5 attempts with exponential backoff
- Queue: `booking-processing`
- DLQ after max retries

---

## Comparison: Current vs Birlasoft

| Aspect | Current System | Birlasoft Integration |
|--------|----------------|----------------------|
| **API Calls** | Our backend → ServiceTitan | Our backend → Birlasoft → ServiceTitan |
| **Customer Lookup** | Not implemented (simulation) | Birlasoft handles by phone |
| **Customer Creation** | Simulated | Birlasoft creates in ST |
| **Job Creation** | Simulated | Birlasoft creates in ST |
| **Appointment** | Simulated | Birlasoft creates if slot_id present |
| **Authentication** | Our credentials needed | Birlasoft handles |
| **Error Handling** | Our retry logic | Our retry → Birlasoft retry → ST |
| **Integration Point** | `serviceTitanIntegration.createJobFromBooking()` | `birlasoftIntegration.createJobViaCloudRun()` |
| **Response Time** | 800ms (simulated) | TBD (real network + ST API) |
| **Failure Mode** | Circuit breaker + DLQ | HTTP errors + DLQ |

---

## Migration Strategy

### Phase 1: Preparation
1. Obtain Birlasoft Cloud Run endpoint URL
2. Test authentication and connectivity
3. Create test bookings, verify format
4. Add database fields (migration)

### Phase 2: Implementation
1. Create `birlasoft/service.js`
2. Implement payload mapping
3. Implement response handling
4. Add error handling and retry logic

### Phase 3: Worker Update
1. Update `booking.workers.js` to call Birlasoft instead of ST
2. Keep old code commented for rollback
3. Update environment variables

### Phase 4: Testing
1. Test with real booking data
2. Verify customer lookup works
3. Verify job creation
4. Verify appointment creation when slot_id present
5. Test error scenarios (invalid phone, missing fields)
6. Test retry logic

### Phase 5: Deployment
1. Deploy to staging first
2. Monitor for 24-48 hours
3. Check error rates, response times
4. Deploy to production
5. Monitor closely

### Phase 6: Cleanup
1. Remove old `servicetitan/service.js` simulation code
2. Archive for reference
3. Update documentation

---

## Open Questions for Birlasoft

1. **Exact Payload Schema:** Confirm JSON structure, field names, data types
2. **Authentication:** Do we need API key? OAuth? Basic auth?
3. **Rate Limiting:** What are the limits? Do we need to throttle?
4. **Timeout:** What's reasonable timeout? 30s? 60s?
5. **Webhook:** Do they support async webhooks for job status updates?
6. **Idempotency:** Can we retry same bookingId safely? Do they dedupe?
7. **Error Codes:** Full list of error codes and meanings
8. **Retry Guidance:** Which errors should we retry? Which shouldn't?
9. **Slot ID Format:** Do they need slot in specific format? Or just opaque string?
10. **Job Type Mapping:** Do they use our `jobTypeId` directly? Or map it?
11. **Scheduled Date:** If slot_id provided, do they derive datetime or need explicit `scheduledDate`?
12. **Email Requirement:** Is email truly required? Can we use placeholder?

---

## Required Data Additions

### Email Collection

**Frontend Change Needed:**
Add email field to booking form (optional or required)

**Or:**
Use placeholder `no-email@provided.com` if Birlasoft accepts it

### Scheduled Date Derivation

**Current State:** We have `slot_id` but not explicit datetime

**Options:**
1. Query scheduling service to get datetime from `slot_id`
2. Have Birlasoft derive datetime from `slot_id` (if they have access)
3. Add `scheduledDateTime` to booking model

**Recommended:** Add `scheduledDateTime` to booking model during slot selection

---

## File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| **CREATE** | `src/modules/integrations/birlasoft/service.js` | New Birlasoft integration service |
| **CREATE** | `src/database/migrations/YYYYMMDD-add-birlasoft-fields.js` | Add birlasoft tracking fields |
| **MODIFY** | `src/workers/booking.workers.js` | Call Birlasoft instead of ST service |
| **MODIFY** | `src/database/models/Booking.js` | Add birlasoft response fields |
| **MODIFY** | `.env` | Add `BIRLASOFT_INTEGRATION_URL` |
| **ARCHIVE** | `src/modules/integrations/servicetitan/service.js` | Keep for reference, no longer used |

---

## Testing Checklist

- [ ] Birlasoft endpoint connectivity
- [ ] Valid booking payload → 200 response
- [ ] Invalid phone → 500 error
- [ ] Missing required field → 500 error
- [ ] Customer lookup by phone (existing customer)
- [ ] Customer creation (new customer)
- [ ] Job creation with all fields
- [ ] Appointment creation when slot_id present
- [ ] No appointment when slot_id absent
- [ ] Network timeout → retry
- [ ] 503 error → retry → success
- [ ] Max retries → DLQ
- [ ] Database updates on success
- [ ] Database updates on failure
- [ ] Error logging to error_logs table

---

## Next Steps for TMV/Birlasoft Team

1. **Coordinate with Birlasoft:**
   - Get Cloud Run endpoint URL
   - Confirm payload schema
   - Agree on error codes
   - Test connectivity

2. **Implement Changes:**
   - Follow migration strategy above
   - Create new integration service
   - Update worker
   - Add database fields

3. **Test Thoroughly:**
   - Use testing checklist
   - Test all error scenarios
   - Verify retry logic
   - Check DLQ behavior

4. **Deploy Gradually:**
   - Staging first
   - Monitor errors
   - Production rollout
   - Keep monitoring

5. **Document:**
   - Update this document with actual payload schema
   - Document any deviations from plan
   - Create runbook for common issues

---

**References:**
- Integration workflow: `.claude/Ref_docs/Integration_WF.pdf`
- Current implementation: `.claude/handoff-docs/current-servicetitan-integration.md`
- Job types data: `service_titan_job_types` table (Phase 2)
