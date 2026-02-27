# Data Directory

This directory contains reference data files used for database seeding and configuration.

## Files

### service-titan-job-types.csv

**Purpose:** Contains 804 ServiceTitan job type IDs and names for database seeding.

**Format:**
```csv
jobtypeid,jobtype_name
2825580530,Commercial-Warranty
2202025922,Door Install Warranty - Signature
...
```

**Usage:**
- Imported by seeder: `src/database/seeders/20260225093351-import-service-titan-job-types.js`
- Run seeder: `npm run db:seed`
- Used to populate `service_titan_job_types` table

**Maintenance:**
- This file should be updated when ServiceTitan provides updated job type lists
- Client mentioned daily refresh requirement - production should run seeder daily
- The seeder is idempotent (deletes and re-imports all records)

**Source:** Provided by client from ServiceTitan export

**Last Updated:** 2026-02-25 (804 job types)
