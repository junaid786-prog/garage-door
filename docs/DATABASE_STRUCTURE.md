# Database Structure - A1 Garage Booking System

## Overview

PostgreSQL database designed for high-volume booking operations with proper indexing and partitioning for millions of records.

## Core Tables

### customers

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
first_name      VARCHAR(100) NOT NULL
last_name       VARCHAR(100) NOT NULL
email           VARCHAR(255) NOT NULL UNIQUE
phone           VARCHAR(20) NOT NULL
sms_opt_in      BOOLEAN DEFAULT false
sms_opt_in_date TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

INDEX idx_customers_email (email)
INDEX idx_customers_phone (phone)
```

### service_areas

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
zip_code    VARCHAR(10) NOT NULL UNIQUE
city        VARCHAR(100) NOT NULL
state       VARCHAR(2) NOT NULL
timezone    VARCHAR(50) NOT NULL
active      BOOLEAN DEFAULT true
created_at  TIMESTAMP DEFAULT NOW()

INDEX idx_service_areas_zip (zip_code)
INDEX idx_service_areas_active (active)
```

### bookings

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
customer_id         UUID NOT NULL REFERENCES customers(id)
service_area_id     UUID NOT NULL REFERENCES service_areas(id)
issue_type          VARCHAR(100) NOT NULL
door_count          INTEGER NOT NULL
homeowner_status    VARCHAR(20) NOT NULL -- 'owner' | 'renter'
door_age            INTEGER
preferred_time      TIMESTAMP NOT NULL
address_line1       VARCHAR(255) NOT NULL
address_line2       VARCHAR(255)
status              VARCHAR(20) DEFAULT 'pending' -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
servicetitan_job_id VARCHAR(100)
booking_source      VARCHAR(50) -- utm tracking
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()

-- Partitioning by month for performance
PARTITION BY RANGE (created_at)

INDEX idx_bookings_customer (customer_id)
INDEX idx_bookings_status (status)
INDEX idx_bookings_created (created_at)
INDEX idx_bookings_preferred_time (preferred_time)
```

### time_slots

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
service_area_id UUID NOT NULL REFERENCES service_areas(id)
slot_date       DATE NOT NULL
slot_time       TIME NOT NULL
available       BOOLEAN DEFAULT true
booking_id      UUID REFERENCES bookings(id)
external_slot_id VARCHAR(100) -- Scheduling Pro ID
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

INDEX idx_time_slots_area_date (service_area_id, slot_date)
INDEX idx_time_slots_available (available)
UNIQUE (service_area_id, slot_date, slot_time)
```

### notifications

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
booking_id  UUID NOT NULL REFERENCES bookings(id)
type        VARCHAR(20) NOT NULL -- 'email' | 'sms'
provider    VARCHAR(50) NOT NULL -- 'klaviyo' | 'twilio'
status      VARCHAR(20) DEFAULT 'pending' -- 'pending' | 'sent' | 'failed'
external_id VARCHAR(100)
sent_at     TIMESTAMP
error_msg   TEXT
created_at  TIMESTAMP DEFAULT NOW()

INDEX idx_notifications_booking (booking_id)
INDEX idx_notifications_status (status)
INDEX idx_notifications_created (created_at)
```

### queue_jobs

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
queue_name  VARCHAR(50) NOT NULL
job_type    VARCHAR(50) NOT NULL
booking_id  UUID REFERENCES bookings(id)
status      VARCHAR(20) DEFAULT 'pending' -- 'pending' | 'processing' | 'completed' | 'failed'
priority    INTEGER DEFAULT 0
attempts    INTEGER DEFAULT 0
max_attempts INTEGER DEFAULT 3
payload     JSONB
error_msg   TEXT
scheduled_at TIMESTAMP DEFAULT NOW()
started_at  TIMESTAMP
completed_at TIMESTAMP
created_at  TIMESTAMP DEFAULT NOW()

INDEX idx_queue_jobs_status (status)
INDEX idx_queue_jobs_queue (queue_name)
INDEX idx_queue_jobs_priority (priority DESC)
INDEX idx_queue_jobs_scheduled (scheduled_at)
```

### analytics_events

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
booking_id   UUID REFERENCES bookings(id)
event_type   VARCHAR(50) NOT NULL -- 'step_viewed' | 'step_completed' | 'booking_submitted'
event_data   JSONB
session_id   VARCHAR(100)
utm_source   VARCHAR(100)
utm_campaign VARCHAR(100)
utm_medium   VARCHAR(100)
gclid        VARCHAR(200)
created_at   TIMESTAMP DEFAULT NOW()

INDEX idx_analytics_events_booking (booking_id)
INDEX idx_analytics_events_type (event_type)
INDEX idx_analytics_events_created (created_at)
INDEX idx_analytics_events_session (session_id)
```

## Partitioning Strategy

### bookings Table Partitioning

```sql
-- Monthly partitions for performance
CREATE TABLE bookings_2024_11 PARTITION OF bookings
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE bookings_2024_12 PARTITION OF bookings
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

### analytics_events Partitioning

```sql
-- Weekly partitions for high-volume analytics
CREATE TABLE analytics_events_2024_w45 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-11-04') TO ('2024-11-11');
```

## Performance Optimizations

### Connection Pooling

```javascript
// Sequelize configuration
{
  pool: {
    max: 50,        // Maximum connections
    min: 10,        // Minimum connections
    acquire: 30000, // Max time to get connection
    idle: 10000     // Max idle time
  }
}
```

### Key Indexes

- **bookings**: customer_id, status, created_at (composite)
- **time_slots**: service_area_id + slot_date (composite)
- **queue_jobs**: status + priority (composite)
- **analytics_events**: session_id + created_at (composite)

### Query Optimization

- Use EXPLAIN ANALYZE for slow queries
- Materialized views for reporting
- Read replicas for analytics queries
- Connection pooling with pgbouncer

## Data Retention Policy

### Short-term (30 days)

- queue_jobs (completed/failed)
- analytics_events (raw events)

### Medium-term (1 year)

- time_slots (past dates)
- notifications (sent/failed)

### Long-term (7 years)

- bookings (legal compliance)
- customers (business records)

## Backup Strategy

### Daily Backups

- Full database backup (compressed)
- Transaction log shipping
- Point-in-time recovery capability

### Testing

- Monthly restore tests
- Disaster recovery procedures
- Data integrity checks
