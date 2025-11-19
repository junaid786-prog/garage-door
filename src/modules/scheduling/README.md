# Scheduling Module

## Summary: How to Use and Integrate the Scheduling System

### 🎯 **Main Integration Points**

#### 1. **Booking Module Integration** (`/src/modules/bookings/service.js`)
The scheduling system is **already integrated** with the booking service:

```javascript
// In createBooking() method - AUTO-CONFIRMATION FLOW
if (env.SCHEDULING_AUTO_CONFIRM_SLOTS && formData.selectedSlot) {
  const confirmResult = await schedulingIntegration.confirmSlot(
    formData.selectedSlot.slotId,
    booking.id
  );
  // Automatically confirms slots when bookings are created
}
```

**Usage**: When `SCHEDULING_AUTO_CONFIRM_SLOTS=true`, selected slots are automatically confirmed during booking creation.

---

### 🔧 **Environment Configuration** (`/src/config/env.js`)

```bash
# Cache Settings
SCHEDULING_CACHE_TTL_MINUTES=10          # Slot cache duration (5-10 min)
SCHEDULING_RESERVATION_TIMEOUT_MINUTES=15 # Reservation timeout

# Auto-confirmation
SCHEDULING_AUTO_CONFIRM_SLOTS=true       # Enable auto-slot confirmation

# SchedulingPro API (simulation)
SCHEDULINGPRO_API_URL=https://api.schedulingpro.com
SCHEDULINGPRO_API_KEY=sim_schedulingpro_key_12345
SCHEDULINGPRO_TENANT_ID=sim_tenant_67890
```

---

### 🌐 **Public API Endpoints** (`/api/scheduling/...`)

#### **1. Get Available Slots**
```bash
GET /api/scheduling/slots?zip=85001&date=2024-12-01&days=7
```
**Response**: 2-hour slots (9 AM - 5 PM, weekdays only)

#### **2. Check Service Availability**
```bash
GET /api/scheduling/availability?zip=85001
```
**Response**: Service availability + city/state/timezone info

#### **3. Reserve a Slot**
```bash
POST /api/scheduling/reserve
{
  "slotId": "slot_2024-12-01_0900",
  "bookingId": "booking_123",
  "customerInfo": { "name": "John Doe" }
}
```
**Response**: 15-minute reservation with expiration time

#### **4. Cancel Reservation**
```bash
DELETE /api/scheduling/reserve/slot_2024-12-01_0900
{ "bookingId": "booking_123" }
```

---

### 🏗 **Integration Architecture**

```
Frontend Booking Widget
         ↓
/api/scheduling/* (Public API)
         ↓
Scheduling Service (Caching + Business Logic)
         ↓
┌─────────────────┬─────────────────────┐
│   Geo Service   │  SchedulingPro API  │
│  (Service Areas)│   (Slot Management) │
└─────────────────┴─────────────────────┘
         ↓
Booking Service (Auto-confirmation)
```

---

### 🔄 **Main System Integration Flows**

#### **Frontend → Scheduling Flow**
1. **Step 1**: User enters ZIP → Call `/api/scheduling/availability?zip=85001`
2. **Step 2**: Show available dates → Call `/api/scheduling/slots?zip=85001&date=2024-12-01`
3. **Step 3**: User selects slot → Call `/api/scheduling/reserve` (15-min timeout)
4. **Step 4**: User completes booking → Booking service auto-confirms slot

#### **Internal Service Integration**
```javascript
// In any service that needs scheduling
const schedulingService = require('../scheduling/service');

// Check if scheduling available
const availability = await schedulingService.checkServiceAvailability('85001');

// Get available slots
const slots = await schedulingService.getAvailableSlots('85001', new Date(), 7);

// Reserve slot (internal use)
const reservation = await schedulingService.reserveSlot(slotId, bookingId);
```

---

### 📋 **Key Usage Scenarios**

#### **1. Frontend Booking Widget**
- **ZIP Validation**: Use `/api/scheduling/availability` to check if scheduling available
- **Date/Time Selection**: Use `/api/scheduling/slots` to show available 2-hour slots
- **Slot Reservation**: Use `/api/scheduling/reserve` for temporary holds during checkout

#### **2. Admin Dashboard**
```bash
GET /api/scheduling/admin/reservations    # View current reservations
POST /api/scheduling/admin/cleanup        # Clean expired reservations
GET /api/scheduling/health               # System health check
```

#### **3. Booking Confirmation Flow**
- When booking is created, system automatically confirms reserved slot (if `AUTO_CONFIRM_SLOTS=true`)
- No manual step needed - seamless integration

---

### 🎛 **Service Areas & Configuration**

#### **Supported ZIP Codes** (Arizona only):
```javascript
// Phoenix: 85001-85010
// Scottsdale: 85251-85260  
// Glendale: 85301-85310
// All use timezone: 'America/Phoenix'
```

#### **Working Hours**:
- **Time**: 9:00 AM - 5:00 PM
- **Days**: Monday - Friday only
- **Slots**: 2-hour duration (9-11 AM, 11 AM-1 PM, 1-3 PM, 3-5 PM)

---

### ⚡ **Performance Features**

1. **Caching**: 5-10 minute slot cache (configurable)
2. **Reservations**: 15-minute timeout to prevent abandoned holds  
3. **Auto-cleanup**: Expired reservations automatically removed
4. **Geo Integration**: Fast ZIP validation without external API calls

---

### 🔄 **Migration from Simulation to Production**

When SchedulingPro API credentials are available:

1. **Update Environment**:
   ```bash
   SCHEDULINGPRO_API_URL=https://real-api.schedulingpro.com
   SCHEDULINGPRO_API_KEY=real_api_key
   SCHEDULINGPRO_TENANT_ID=real_tenant_id
   ```

2. **Replace Service**: Update `/src/modules/integrations/schedulingpro/service.js` with real API calls

3. **Keep Everything Else**: All other components (scheduling service, routes, geo integration) remain unchanged

---

### 📊 **Health Monitoring**

```bash
GET /api/scheduling/health
```
**Returns**:
- SchedulingPro API status
- Cache statistics
- Active/expired reservations count
- Service configuration

This scheduling system is **production-ready** and seamlessly integrates with your existing booking flow while providing a complete simulation environment for development and testing.