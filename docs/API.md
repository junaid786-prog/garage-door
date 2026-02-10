# API Documentation

**Base URL:** `http://localhost:3000` (development)

**Authentication:** All `/api/*` and `/admin/*` endpoints require `X-API-Key` header.

**Rate Limiting:**
- Booking operations (POST/PUT/DELETE): 10 requests / 15 minutes per IP
- Read operations (GET): 100 requests / 15 minutes per IP
- Global rate limit: 100 requests / 15 minutes per IP

---

## Authentication

### Header Required
```http
X-API-Key: your-api-key-here
```

### Error Response (401)
```json
{
  "success": false,
  "message": "API key is required",
  "error": {
    "code": "UNAUTHORIZED"
  },
  "timestamp": "2026-02-09T13:33:39.421Z"
}
```

---

## 1. Bookings

### 1.1 Create Booking

**Endpoint:** `POST /api/bookings`

**Rate Limit:** 10 requests / 15 minutes per IP

**Request Body:**
```json
{
  "service": {
    "type": "repair",
    "symptom": "wont_open",
    "can_open_close": "no"
  },
  "door": {
    "age_bucket": "gte_8",
    "count": 1
  },
  "replacement_pref": null,
  "address": {
    "street": "123 Main St",
    "unit": "",
    "city": "Scottsdale",
    "state": "AZ",
    "zip": "85251"
  },
  "occupancy": {
    "type": "homeowner"
  },
  "contact": {
    "phoneE164": "+14805551234",
    "name": "John Doe"
  },
  "scheduling": {
    "slot_id": "slot_2026-02-15_1000",
    "asap_selected": false
  },
  "notes": "Garage door won't open at all"
}
```

**Field Validations:**
- `service.type`: `"repair"` | `"replacement"` (required)
- `service.symptom`: `"wont_open"` | `"wont_close"` | `"spring_bang"` | `"tune_up"` | `"other"` (required)
- `service.can_open_close`: `"yes"` | `"no"` | `"partial"` (required)
- `door.age_bucket`: `"lt_8"` | `"gte_8"` (required)
- `door.count`: `1` | `2` (required)
- `replacement_pref`: `"basic"` | `"nicer"` | `null` (optional)
- `address.street`: 1-255 chars (required)
- `address.unit`: max 50 chars (optional)
- `address.city`: 1-100 chars (required)
- `address.state`: 2-char state code (required)
- `address.zip`: `12345` or `12345-1234` format (required)
- `occupancy.type`: `"homeowner"` | `"renter"` | `"pm"` | `"unknown"` (default: `"unknown"`)
- `occupancy.renterPermission`: boolean (optional)
- `contact.phoneE164`: E.164 format `+1XXXXXXXXXX` (required)
- `contact.name`: 1-100 chars (optional)
- `scheduling.slot_id`: string (optional)
- `scheduling.asap_selected`: boolean (optional)
- `scheduling.priority_score`: 0-100 (optional)
- `notes`: max 1000 chars (optional)
- `suspected_issue`: max 500 chars (optional)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "f76cc4ed-9c83-4c17-ae9f-1a9f85028eaf",
    "status": "pending",
    "serviceType": "repair",
    "serviceSymptom": "wont_open",
    "canOpenClose": "no",
    "doorAgeBucket": "gte_8",
    "doorCount": 1,
    "replacementPref": null,
    "street": "123 Main St",
    "unit": "",
    "city": "Scottsdale",
    "state": "AZ",
    "zip": "85251",
    "occupancyType": "homeowner",
    "phoneE164": "+14805551234",
    "contactName": "John Doe",
    "slotId": "slot_2026-02-15_1000",
    "asapSelected": false,
    "notes": "Garage door won't open at all",
    "renterPermission": null,
    "priorityScore": null,
    "suspectedIssue": null,
    "serviceTitanJobId": null,
    "serviceTitanJobNumber": null,
    "serviceTitanStatus": null,
    "serviceTitanError": null,
    "schedulingProJobId": null,
    "createdAt": "2026-02-09T13:34:02.727Z",
    "updatedAt": "2026-02-09T13:34:02.727Z"
  },
  "timestamp": "2026-02-09T13:34:02.764Z"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "service.type",
      "message": "\"service.type\" must be one of [repair, replacement]"
    }
  ]
}
```

**Slot Already Booked (409):**
```json
{
  "success": false,
  "message": "This time slot is no longer available. Please select a different time slot.",
  "error": {
    "code": "CONFLICT"
  },
  "timestamp": "2026-02-09T13:34:02.764Z"
}
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "timestamp": "2026-02-09T13:34:02.764Z"
}
```

---

### 1.2 Get Booking by ID

**Endpoint:** `GET /api/bookings/:id`

**Rate Limit:** 100 requests / 15 minutes per IP

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking retrieved successfully",
  "data": {
    "id": "f76cc4ed-9c83-4c17-ae9f-1a9f85028eaf",
    "service": {
      "type": "repair",
      "symptom": "wont_open",
      "can_open_close": "no"
    },
    "door": {
      "age_bucket": "gte_8",
      "count": 1
    },
    "replacement_pref": null,
    "address": {
      "street": "123 Main St",
      "unit": "",
      "city": "Scottsdale",
      "state": "AZ",
      "zip": "85251"
    },
    "occupancy": {
      "type": "homeowner",
      "renterPermission": null
    },
    "contact": {
      "phoneE164": "+14805551234",
      "name": "John Doe"
    },
    "scheduling": {
      "slot_id": "slot_2026-02-15_1000",
      "asap_selected": false,
      "priority_score": null
    },
    "notes": "Garage door won't open at all",
    "suspected_issue": null,
    "status": "pending",
    "serviceTitanJobId": null,
    "schedulingProJobId": null,
    "created_at": "2026-02-09T13:34:02.727Z",
    "updated_at": "2026-02-09T13:34:11.490Z"
  },
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

---

### 1.3 Get All Bookings

**Endpoint:** `GET /api/bookings`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `status`: `"pending"` | `"confirmed"` | `"in_progress"` | `"completed"` | `"cancelled"` (optional)
- `phone`: E.164 format `+1XXXXXXXXXX` (optional)
- `zip`: `12345` or `12345-1234` (optional)
- `serviceType`: `"repair"` | `"replacement"` (optional)
- `limit`: 1-100 (default: 20)
- `offset`: ≥0 (default: 0)
- `sortBy`: `"created_at"` | `"updated_at"` | `"status"` (default: `"created_at"`)
- `sortOrder`: `"ASC"` | `"DESC"` (default: `"DESC"`)

**Example:** `GET /api/bookings?status=pending&limit=5`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "f76cc4ed-9c83-4c17-ae9f-1a9f85028eaf",
        "service": { "type": "repair", "symptom": "wont_open", "can_open_close": "no" },
        "door": { "age_bucket": "gte_8", "count": 1 },
        "replacement_pref": null,
        "address": { "street": "123 Main St", "unit": "", "city": "Scottsdale", "state": "AZ", "zip": "85251" },
        "occupancy": { "type": "homeowner", "renterPermission": null },
        "contact": { "phoneE164": "+14805551234", "name": "John Doe" },
        "scheduling": { "slot_id": "slot_2026-02-15_1000", "asap_selected": false, "priority_score": null },
        "notes": "Garage door won't open at all",
        "suspected_issue": null,
        "status": "pending",
        "serviceTitanJobId": null,
        "schedulingProJobId": null,
        "created_at": "2026-02-09T13:34:02.727Z",
        "updated_at": "2026-02-09T13:34:11.490Z"
      }
    ],
    "pagination": {
      "total": 117,
      "page": 1,
      "pageSize": 5,
      "totalPages": 24
    }
  },
  "timestamp": "2026-02-09T13:34:14.598Z"
}
```

---

### 1.4 Update Booking

**Endpoint:** `PUT /api/bookings/:id`

**Rate Limit:** 10 requests / 15 minutes per IP

**Request Body:** Partial booking object (same structure as create, all fields optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": { /* Updated booking object */ },
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

---

### 1.5 Update Booking Status

**Endpoint:** `PATCH /api/bookings/:id/status`

**Rate Limit:** 10 requests / 15 minutes per IP

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Valid Statuses:** `"pending"` | `"confirmed"` | `"in_progress"` | `"completed"` | `"cancelled"`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking status updated successfully",
  "data": { /* Updated booking object */ },
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

---

### 1.6 Delete Booking

**Endpoint:** `DELETE /api/bookings/:id`

**Rate Limit:** 10 requests / 15 minutes per IP

**Success Response (204):** No content

**Not Found (404):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

---

### 1.7 Get Bookings by Phone

**Endpoint:** `GET /api/bookings/phone/:phone`

**Rate Limit:** 100 requests / 15 minutes per IP

**Example:** `GET /api/bookings/phone/+14805551234`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [ /* Array of booking objects */ ]
  },
  "timestamp": "2026-02-09T13:34:14.598Z"
}
```

---

### 1.8 Link ServiceTitan Job

**Endpoint:** `POST /api/bookings/:id/servicetitan`

**Rate Limit:** 10 requests / 15 minutes per IP

**Request Body:**
```json
{
  "serviceTitanJobId": "ST-12345"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "ServiceTitan job linked successfully",
  "data": { /* Updated booking object */ },
  "timestamp": "2026-02-09T13:34:14.452Z"
}
```

---

## 2. Geolocation

### 2.1 Get Geo Data (Legacy)

**Endpoint:** `GET /api/geo`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `zip`: ZIP code (optional, defaults to `85251`)

**Example:** `GET /api/geo?zip=85251`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Geo data retrieved successfully",
  "data": {
    "zip": "85251",
    "city": "Scottsdale",
    "state": "AZ",
    "serviceArea": true
  },
  "timestamp": "2026-02-09T13:38:27.099Z"
}
```

**Note:** This is a legacy endpoint maintained for backward compatibility. New integrations should use `/api/geo/zip/:zipCode` or `/api/geo/validate/:zipCode` instead.

---

### 2.2 Validate Service Area (ZIP)

**Endpoint:** `GET /api/geo/validate/:zipCode`

**Rate Limit:** 100 requests / 15 minutes per IP

**Example:** `GET /api/geo/validate/85251`

**Success Response - Serviceable (200):**
```json
{
  "success": true,
  "message": "Service area validation completed",
  "data": {
    "zipCode": "85251",
    "isServiceable": true,
    "message": "Service available in this area",
    "estimatedServiceRadius": "25 miles"
  },
  "timestamp": "2026-02-09T13:34:00.184Z"
}
```

**Success Response - Not Serviceable (200):**
```json
{
  "success": true,
  "message": "Service area validation completed",
  "data": {
    "zipCode": "99999",
    "isServiceable": false,
    "message": "Service not available in this area",
    "estimatedServiceRadius": null
  },
  "timestamp": "2026-02-09T13:34:00.243Z"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "ZIP code must be in format 12345 or 12345-1234",
  "details": [ /* Validation errors */ ]
}
```

---

### 2.3 Get Location by ZIP

**Endpoint:** `GET /api/geo/zip/:zipCode`

**Rate Limit:** 100 requests / 15 minutes per IP

**Success Response (200):**
```json
{
  "success": true,
  "message": "Location data retrieved successfully",
  "data": {
    "zip": "85251",
    "city": "Scottsdale",
    "state": "AZ",
    "serviceArea": true,
    "latitude": 33.4942,
    "longitude": -111.9261
  },
  "timestamp": "2026-02-09T13:34:00.184Z"
}
```

---

### 2.4 Get Location by Coordinates

**Endpoint:** `GET /api/geo/coordinates`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `latitude`: -90 to 90 (required)
- `longitude`: -180 to 180 (required)

**Example:** `GET /api/geo/coordinates?latitude=33.4942&longitude=-111.9261`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Location data retrieved successfully",
  "data": {
    "latitude": 33.4942,
    "longitude": -111.9261,
    "city": "Scottsdale",
    "state": "AZ",
    "zip": "85251",
    "serviceArea": true
  },
  "timestamp": "2026-02-09T13:34:00.184Z"
}
```

---

### 2.5 Get Serviceable Areas

**Endpoint:** `GET /api/geo/service-areas`

**Rate Limit:** 100 requests / 15 minutes per IP

**Success Response (200):**
```json
{
  "success": true,
  "message": "Serviceable areas retrieved successfully",
  "data": {
    "areas": [
      { "zip": "85251", "city": "Scottsdale", "state": "AZ" },
      { "zip": "85254", "city": "Scottsdale", "state": "AZ" }
    ]
  },
  "timestamp": "2026-02-09T13:34:00.184Z"
}
```

---

### 2.6 Calculate Distance

**Endpoint:** `POST /api/geo/distance`

**Rate Limit:** 100 requests / 15 minutes per IP

**Request Body:**
```json
{
  "point1": {
    "latitude": 33.4942,
    "longitude": -111.9261
  },
  "point2": {
    "latitude": 33.5000,
    "longitude": -112.0000
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Distance calculated successfully",
  "data": {
    "distance": 8.3,
    "unit": "miles",
    "point1": { "latitude": 33.4942, "longitude": -111.9261 },
    "point2": { "latitude": 33.5000, "longitude": -112.0000 }
  },
  "timestamp": "2026-02-09T13:34:00.184Z"
}
```

---

## 3. Scheduling

### 3.1 Get Available Slots

**Endpoint:** `GET /api/scheduling/slots`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `zip`: ZIP code in `12345` or `12345-1234` format (required)
- `date`: Start date in `YYYY-MM-DD` format (optional, defaults to today)
- `days`: Number of days to fetch (1-30, default: 7)

**Example:** `GET /api/scheduling/slots?zip=85251&date=2026-02-15&days=3`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Available slots retrieved successfully",
  "data": {
    "zip": "85251",
    "startDate": "2026-02-15",
    "endDate": "2026-02-17",
    "slots": [
      {
        "slotId": "slot_2026-02-15_0800",
        "date": "2026-02-15",
        "time": "08:00 AM",
        "available": true
      },
      {
        "slotId": "slot_2026-02-15_1000",
        "date": "2026-02-15",
        "time": "10:00 AM",
        "available": true
      }
    ]
  },
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

**Kill Switch Enabled (503):**
```json
{
  "success": false,
  "message": "Online scheduling is temporarily unavailable. Please call (800) 123-4567 to schedule your appointment.",
  "error": {
    "code": "INTERNAL_ERROR"
  },
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

**Validation Error - Date in Past (400):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Date cannot be in the past"
}
```

**Validation Error - Days Out of Range (400):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "days",
      "message": "Days must be at least 1",
      "value": 0
    }
  ]
}
```

**Note:** Scheduling and geo validation errors include `value` field. Booking and event validation errors only include `field` and `message`.

---

### 3.2 Reserve Slot

**⚠️ V2 FEATURE - NOT AVAILABLE IN V1**

This endpoint is disabled in V1 per client requirement (operations team doesn't hold slots). Bookings are created directly via `POST /api/bookings` without prior reservation. This endpoint will be restored in V2 to enable 5-minute slot holds.

**Endpoint:** `POST /api/scheduling/reserve` _(disabled in V1)_

**Rate Limit:** 100 requests / 15 minutes per IP

**Request Body:**
```json
{
  "slotId": "slot_2026-02-15_1000",
  "bookingId": "f76cc4ed-9c83-4c17-ae9f-1a9f85028eaf",
  "customerInfo": {
    "name": "John Doe",
    "phone": "+14805551234",
    "email": "john@example.com",
    "notes": "Please call before arriving"
  }
}
```

**Field Validations:**
- `slotId`: Format `slot_YYYY-MM-DD_HHMM` (required)
- `bookingId`: 1-100 chars (required)
- `customerInfo`: Object (optional)
  - `name`: max 200 chars
  - `phone`: max 20 chars
  - `email`: valid email format
  - `notes`: max 500 chars

**Success Response (201):**
```json
{
  "success": true,
  "message": "Slot reserved successfully",
  "data": {
    "slotId": "slot_2026-02-15_1000",
    "bookingId": "f76cc4ed-9c83-4c17-ae9f-1a9f85028eaf",
    "reserved": true,
    "expiresAt": "2026-02-09T13:39:00.000Z"
  },
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

**Slot Already Reserved (409):**
```json
{
  "success": false,
  "message": "This time slot is already reserved",
  "error": {
    "code": "CONFLICT"
  },
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

**Slot Not Available (400):**
```json
{
  "success": false,
  "message": "Slot not available",
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

---

### 3.3 Check Service Availability

**Endpoint:** `GET /api/scheduling/availability`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `zip`: ZIP code (required)

**Example:** `GET /api/scheduling/availability?zip=85251`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Service availability checked successfully",
  "data": {
    "zip": "85251",
    "available": true,
    "nextAvailable": "2026-02-10",
    "message": "Service available in this area"
  },
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

---

### 3.4 Cancel Slot Reservation

**⚠️ V2 FEATURE - NOT AVAILABLE IN V1**

This endpoint is disabled in V1. To cancel a booking, use `PATCH /api/bookings/:id/status` with status "cancelled". This reservation endpoint will be restored in V2.

**Endpoint:** `DELETE /api/scheduling/reserve/:slotId` _(disabled in V1)_

**Rate Limit:** 100 requests / 15 minutes per IP

**Request Body:**
```json
{
  "bookingId": "f76cc4ed-9c83-4c17-ae9f-1a9f85028eaf"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Slot reservation cancelled successfully",
  "data": {
    "slotId": "slot_2026-02-15_1000",
    "cancelled": true
  },
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Reservation not found",
  "timestamp": "2026-02-09T13:34:00.309Z"
}
```

---

## 4. Events

### 4.1 Track Event

**Endpoint:** `POST /api/events`

**Rate Limit:** 100 requests / 15 minutes per IP

**Request Body:**
```json
{
  "event": "page_view",
  "sessionId": "test-session-123",
  "properties": {
    "page": "/booking",
    "step": "step1",
    "referrer": "https://google.com"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Event tracked successfully",
  "data": {
    "id": "6b89b4a4-5135-4455-b051-8be1da7048ba",
    "name": "page_view",
    "session_id": null,
    "timestamp": "2026-02-09T13:34:14.666Z",
    "properties": {
      "page": "/booking",
      "step": "step1",
      "event": "page_view",
      "sessionId": "test-session-123"
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 4.2 Get Events

**Endpoint:** `GET /api/events`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `name`: Event name (optional)
- `sessionId`: Session ID (optional)
- `startDate`: ISO 8601 date (optional)
- `endDate`: ISO 8601 date (optional)
- `properties`: JSON string (optional)
- `limit`: Number of events (optional)
- `offset`: Pagination offset (optional)
- `orderBy`: Sort field (optional)
- `orderDir`: `ASC` | `DESC` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [ /* Array of event objects */ ],
    "total": 123,
    "limit": 20,
    "offset": 0
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 4.3 Get Event Statistics

**Endpoint:** `GET /api/events/stats`

**Rate Limit:** 100 requests / 15 minutes per IP

**Query Parameters:**
- `startDate`: ISO 8601 date (optional)
- `endDate`: ISO 8601 date (optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event statistics retrieved successfully",
  "data": {
    "total": 5432,
    "byName": {
      "page_view": 2341,
      "button_click": 1234,
      "form_submit": 567
    },
    "dateRange": {
      "start": "2026-02-01T00:00:00.000Z",
      "end": "2026-02-09T23:59:59.999Z"
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 4.4 Get Session Events

**Endpoint:** `GET /api/events/session/:sessionId`

**Rate Limit:** 100 requests / 15 minutes per IP

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session events retrieved successfully",
  "data": {
    "sessionId": "test-session-123",
    "events": [ /* Array of event objects */ ]
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 4.5 Get Funnel Analysis

**Endpoint:** `POST /api/events/funnel`

**Rate Limit:** 100 requests / 15 minutes per IP

**Request Body:**
```json
{
  "eventNames": ["page_view", "form_start", "form_submit"],
  "startDate": "2026-02-01",
  "endDate": "2026-02-09"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Funnel analysis retrieved successfully",
  "data": {
    "funnel": [
      { "step": "page_view", "count": 1000, "dropoff": 0 },
      { "step": "form_start", "count": 450, "dropoff": 55 },
      { "step": "form_submit", "count": 180, "dropoff": 60 }
    ],
    "conversionRate": 18.0
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

## 5. Health

### 5.1 Basic Health Check

**Endpoint:** `GET /health`

**Authentication:** None required

**Success Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-09T13:23:14.449Z",
  "env": "development"
}
```

---

### 5.2 Detailed Health Check

**Endpoint:** `GET /health/detailed`

**Authentication:** None required

**Success Response (200):**
```json
{
  "status": "degraded",
  "timestamp": "2026-02-09T13:34:14.745Z",
  "env": "development",
  "services": {
    "database": {
      "status": "healthy",
      "type": "PostgreSQL",
      "pool": {
        "size": 10,
        "available": 8,
        "using": 2,
        "waiting": 0,
        "max": 10,
        "utilization": 20
      }
    },
    "redis": {
      "status": "healthy",
      "type": "Redis"
    }
  },
  "circuitBreakers": {
    "serviceTitan": {
      "createJob": { "state": "closed", "failures": 0 },
      "getJob": { "state": "closed", "failures": 0 },
      "updateJobStatus": { "state": "closed", "failures": 0 },
      "cancelJob": { "state": "closed", "failures": 0 }
    },
    "schedulingPro": {
      "getAvailableSlots": { "state": "open", "failures": 15 },
      "reserveSlot": { "state": "closed", "failures": 0 },
      "confirmSlot": { "state": "closed", "failures": 0 },
      "cancelSlot": { "state": "closed", "failures": 0 }
    }
  },
  "circuitBreakersOpen": 1,
  "queues": {
    "stats": {
      "bookings": { "waiting": 0, "active": 0, "completed": 312, "failed": 0, "delayed": 0, "paused": 0 },
      "notifications": { "waiting": 0, "active": 0, "completed": 0, "failed": 0, "delayed": 0, "paused": 0 },
      "analytics": { "waiting": 0, "active": 0, "completed": 0, "failed": 0, "delayed": 0, "paused": 0 }
    },
    "dlq": {
      "total": 0,
      "byQueue": {},
      "byType": {},
      "oldestJob": null,
      "newestJob": null
    }
  },
  "databaseWarning": null,
  "dlqWarning": null,
  "queueWarning": null
}
```

**Status Values:**
- `healthy`: All systems operational
- `degraded`: Some systems degraded but functional
- `unhealthy`: Critical systems down

**Unhealthy Response (503):** Same structure, `status: "unhealthy"`

---

### 5.3 Circuit Breaker Status

**Endpoint:** `GET /health/circuit-breakers`

**Authentication:** None required

**Success Response (200):**
```json
{
  "timestamp": "2026-02-09T13:34:14.745Z",
  "circuitBreakers": {
    "serviceTitan": {
      "createJob": { "state": "closed", "failures": 0 },
      "getJob": { "state": "closed", "failures": 0 }
    },
    "schedulingPro": {
      "getAvailableSlots": { "state": "open", "failures": 15 },
      "reserveSlot": { "state": "closed", "failures": 0 }
    }
  },
  "summary": {
    "total": 8,
    "closed": 7,
    "open": 1,
    "halfOpen": 0
  }
}
```

**Circuit Breaker States:**
- `closed`: Normal operation
- `open`: Service failing, requests blocked
- `half-open`: Testing if service recovered

---

## 6. Admin - Error Recovery

**Authentication:** Requires `X-API-Key` header

### 6.1 Get Unresolved Errors

**Endpoint:** `GET /admin/errors/unresolved`

**Query Parameters:**
- `operation`: Filter by operation (optional)
- `serviceName`: Filter by service (optional)
- `retryable`: Filter by retryable flag (optional)
- `limit`: Max results (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "errors": [
      {
        "id": 1,
        "errorType": "ServiceTitanError",
        "operation": "create-job",
        "serviceName": "servicetitan",
        "errorMessage": "Connection timeout",
        "errorCode": "NETWORK_ERROR",
        "retryable": true,
        "retryCount": 2,
        "createdAt": "2026-02-09T10:00:00.000Z",
        "context": { "bookingId": "abc-123" }
      }
    ]
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 6.2 Get Error by ID

**Endpoint:** `GET /admin/errors/:id`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "errorType": "ServiceTitanError",
    "operation": "create-job",
    "serviceName": "servicetitan",
    "context": { "bookingId": "abc-123" },
    "errorMessage": "Connection timeout",
    "errorCode": "NETWORK_ERROR",
    "stackTrace": "Error: Connection timeout\n    at ...",
    "retryable": true,
    "retryCount": 2,
    "resolved": false,
    "resolvedAt": null,
    "resolvedBy": null,
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:05:00.000Z"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "Error log not found",
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 6.3 Mark Error as Resolved

**Endpoint:** `POST /admin/errors/:id/resolve`

**Request Body:**
```json
{
  "resolvedBy": "admin@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Error marked as resolved",
  "data": {
    "id": 1,
    "resolved": true,
    "resolvedAt": "2026-02-09T13:34:14.675Z",
    "resolvedBy": "admin@example.com"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 6.4 Retry Failed Operation

**Endpoint:** `POST /admin/errors/:id/retry`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Retry count incremented. Manual retry required for this operation type.",
  "data": {
    "id": 1,
    "operation": "create-job",
    "retryCount": 3,
    "context": { "bookingId": "abc-123" }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

**Not Retryable (400):**
```json
{
  "success": false,
  "error": "This error is not retryable",
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

**Already Resolved (400):**
```json
{
  "success": false,
  "error": "This error is already resolved",
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 6.5 Get Error Statistics

**Endpoint:** `GET /admin/errors/stats`

**Query Parameters:**
- `startDate`: ISO 8601 date (optional)
- `endDate`: ISO 8601 date (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "resolved": 32,
    "unresolved": 13,
    "retryable": 10,
    "byOperation": {
      "create-job": 20,
      "confirm-slot": 15,
      "send-email": 10
    },
    "byService": {
      "servicetitan": 20,
      "schedulingpro": 15,
      "klaviyo": 10
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

## 7. Admin - Queue Management

**Authentication:** Requires `X-API-Key` header

### 7.1 Get DLQ Jobs

**Endpoint:** `GET /admin/queue/dlq`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "123",
        "queue": "bookings",
        "type": "create-servicetitan-job",
        "data": { "bookingId": "abc-123" },
        "failedReason": "Connection timeout",
        "stacktrace": ["Error: Connection timeout", "at ..."],
        "attemptsMade": 5,
        "timestamp": "2026-02-09T10:00:00.000Z"
      }
    ],
    "stats": {
      "total": 12,
      "byQueue": { "bookings": 8, "notifications": 4 },
      "byType": { "create-servicetitan-job": 8, "send-email": 4 },
      "oldestJob": "2026-02-08T10:00:00.000Z",
      "newestJob": "2026-02-09T10:00:00.000Z"
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.2 Get DLQ Statistics

**Endpoint:** `GET /admin/queue/dlq/stats`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "byQueue": { "bookings": 8, "notifications": 4 },
    "byType": { "create-servicetitan-job": 8, "send-email": 4 },
    "oldestJob": "2026-02-08T10:00:00.000Z",
    "newestJob": "2026-02-09T10:00:00.000Z"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.3 Retry DLQ Job

**Endpoint:** `POST /admin/queue/dlq/:jobId/retry`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job retried successfully",
  "data": {
    "jobId": "123",
    "queue": "bookings",
    "requeued": true
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "DLQ job 123 not found",
  "error": {
    "code": "NOT_FOUND"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.4 Remove DLQ Job

**Endpoint:** `DELETE /admin/queue/dlq/:jobId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job removed from DLQ",
  "data": {
    "jobId": "123",
    "removed": true
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.5 Get Failed Jobs from Queue

**Endpoint:** `GET /admin/queue/:queueName/failed`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "queue": "bookings",
    "jobs": [ /* Array of failed job objects */ ],
    "pagination": {
      "page": 1,
      "limit": 20
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.6 Get All Queue Statistics

**Endpoint:** `GET /admin/queue/stats`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "bookings": {
      "waiting": 0,
      "active": 2,
      "completed": 312,
      "failed": 0,
      "delayed": 0,
      "paused": 0
    },
    "notifications": {
      "waiting": 0,
      "active": 0,
      "completed": 156,
      "failed": 0,
      "delayed": 0,
      "paused": 0
    },
    "analytics": {
      "waiting": 0,
      "active": 0,
      "completed": 89,
      "failed": 0,
      "delayed": 0,
      "paused": 0
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.7 Get Specific Queue Statistics

**Endpoint:** `GET /admin/queue/:queueName/stats`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "queue": "bookings",
    "stats": {
      "waiting": 0,
      "active": 2,
      "completed": 312,
      "failed": 0,
      "delayed": 0,
      "paused": 0
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Queue bookings not found",
  "error": {
    "code": "NOT_FOUND"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.8 Pause Queue

**Endpoint:** `POST /admin/queue/:queueName/pause`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Queue bookings paused successfully",
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.9 Resume Queue

**Endpoint:** `POST /admin/queue/:queueName/resume`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Queue bookings resumed successfully",
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 7.10 Clean Queue

**Endpoint:** `POST /admin/queue/:queueName/clean`

**Request Body:**
```json
{
  "grace": 86400000
}
```

**Parameters:**
- `grace`: Grace period in milliseconds (default: 24 hours)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Queue bookings cleaned successfully",
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

## 8. Scheduling Admin

**Authentication:** Requires `X-API-Key` header

### 8.1 Get Current Reservations

**Endpoint:** `GET /api/scheduling/admin/reservations`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Current reservations retrieved successfully",
  "data": {
    "reservations": [
      {
        "slotId": "slot_2026-02-15_1000",
        "bookingId": "abc-123",
        "createdAt": "2026-02-09T13:30:00.000Z",
        "expiresAt": "2026-02-09T13:35:00.000Z",
        "expired": false
      }
    ],
    "total": 5,
    "expired": 1,
    "active": 4
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 8.2 Cleanup Expired Reservations

**Endpoint:** `POST /api/scheduling/admin/cleanup`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Expired reservations cleaned up successfully",
  "data": {
    "cleanedCount": 3,
    "message": "3 expired reservations cleaned up"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

### 8.3 Get Scheduling Health

**Endpoint:** `GET /api/scheduling/health`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Scheduling system health retrieved successfully",
  "data": {
    "schedulingPro": {
      "status": "healthy",
      "circuitBreaker": "closed"
    },
    "serviceLayer": {
      "cacheTimeout": 300000,
      "reservationTimeout": 300000,
      "autoConfirmSlots": true,
      "cachedSlotsKeys": 12,
      "activeReservations": 4,
      "expiredReservations": 1
    }
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

## Common Error Responses

### 400 Bad Request

**Booking/Event Validation Errors:**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "fieldName",
      "message": "Error description"
    }
  ]
}
```

**Scheduling/Geo Validation Errors:**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "fieldName",
      "message": "Error description",
      "value": "invalidValue"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "API key is required",
  "error": {
    "code": "UNAUTHORIZED"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found",
  "error": {
    "code": "NOT_FOUND"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Resource conflict",
  "error": {
    "code": "CONFLICT"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "INTERNAL_ERROR"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "message": "Service temporarily unavailable",
  "error": {
    "code": "SERVICE_UNAVAILABLE"
  },
  "timestamp": "2026-02-09T13:34:14.675Z"
}
```

---

## Response Headers

All responses include:
- `X-Response-Time`: Request processing time in milliseconds
- `Content-Type`: `application/json`

Rate limit headers (when rate limiting is active):
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)
- `Retry-After`: Seconds until retry allowed (included in 429 response)
