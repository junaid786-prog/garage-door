/**
 * ServiceTitan BU + Job Type Routing Table
 *
 * Source: "Rapid Response BU and Job Type Routing Logic" CSV (provided by A1/Alec)
 *
 * Key format: `${serviceType}:${serviceSymptom}:${doorAgeBucket}:${doorCountBucket}`
 *   - serviceType:     'repair' | 'replacement'
 *   - serviceSymptom:  'wont_open' | 'wont_close' | 'tune_up' | 'spring_bang' | 'other'
 *   - doorAgeBucket:   'lt_8' | 'gte_8'
 *   - doorCountBucket: '1' | '2plus'
 *
 * To update routing: edit the entries below. Do NOT change the key format or DEFAULT_ROUTING
 * without also updating _resolveJobRouting() in service.js.
 */
const JOB_TYPE_ROUTING = {
  // ── Door won't open (repair) ──────────────────────────────────────────────
  'repair:wont_open:lt_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service- 8 yrs or less - 1 Door',
    priority: 'high',
  },
  'repair:wont_open:lt_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677867201,
    jobTypeName: 'Service-8 yrs or less - 2+ Doors',
    priority: 'high',
  },
  'repair:wont_open:gte_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service-More than 8 yrs - 1 Door',
    priority: 'high',
  },
  'repair:wont_open:gte_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677861965,
    jobTypeName: 'Service-More than 8 yrs - 2+ Doors',
    priority: 'high',
  },

  // ── Door won't close (repair) ─────────────────────────────────────────────
  'repair:wont_close:lt_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service- 8 yrs or less - 1 Door',
    priority: 'high',
  },
  'repair:wont_close:lt_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677867201,
    jobTypeName: 'Service-8 yrs or less - 2+ Doors',
    priority: 'high',
  },
  'repair:wont_close:gte_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service-More than 8 yrs - 1 Door',
    priority: 'high',
  },
  'repair:wont_close:gte_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677861965,
    jobTypeName: 'Service-More than 8 yrs - 2+ Doors',
    priority: 'high',
  },

  // ── Tune Up (repair) ──────────────────────────────────────────────────────
  'repair:tune_up:lt_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service- 8 yrs or less - 1 Door',
    priority: 'high',
  },
  'repair:tune_up:lt_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677867201,
    jobTypeName: 'Service-8 yrs or less - 2+ Doors',
    priority: 'high',
  },
  'repair:tune_up:gte_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service-More than 8 yrs - 1 Door',
    priority: 'high',
  },
  'repair:tune_up:gte_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677861965,
    jobTypeName: 'Service-More than 8 yrs - 2+ Doors',
    priority: 'high',
  },

  // ── General Service / Other (repair) ─────────────────────────────────────
  'repair:other:lt_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service- 8 yrs or less - 1 Door',
    priority: 'high',
  },
  'repair:other:lt_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677867201,
    jobTypeName: 'Service-8 yrs or less - 2+ Doors',
    priority: 'high',
  },
  'repair:other:gte_8:1': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 828618933,
    jobTypeName: 'Service-More than 8 yrs - 1 Door',
    priority: 'high',
  },
  'repair:other:gte_8:2plus': {
    businessUnitId: 1745222538,
    businessUnitName: 'PHX-Service',
    jobTypeId: 677861965,
    jobTypeName: 'Service-More than 8 yrs - 2+ Doors',
    priority: 'high',
  },

  // ── New Door / Replacement ────────────────────────────────────────────────
  'replacement:other:lt_8:1': {
    businessUnitId: 425554014,
    businessUnitName: 'PHX-Door Sales',
    jobTypeId: 677851333,
    jobTypeName: 'Sales-Quote- 8 yrs or less 1 Door',
    priority: 'normal',
  },
  'replacement:other:lt_8:2plus': {
    businessUnitId: 425554014,
    businessUnitName: 'PHX-Door Sales',
    jobTypeId: 677859588,
    jobTypeName: 'Sales-Quote-8 yrs or less 2+ Doors',
    priority: 'normal',
  },
  'replacement:other:gte_8:1': {
    businessUnitId: 425554014,
    businessUnitName: 'PHX-Door Sales',
    jobTypeId: 677860192,
    jobTypeName: 'Sales-Quote-More than 8 yrs 1 Door',
    priority: 'normal',
  },
  'replacement:other:gte_8:2plus': {
    businessUnitId: 425554014,
    businessUnitName: 'PHX-Door Sales',
    jobTypeId: 677854800,
    jobTypeName: 'Sales-Quote-More than 8 yrs 2+ Doors',
    priority: 'normal',
  },
};

/**
 * Fallback routing when no key match is found.
 * PHX-Service, 1-door repair — safest default.
 */
const DEFAULT_ROUTING = {
  businessUnitId: 1745222538,
  businessUnitName: 'PHX-Service',
  jobTypeId: 828618933,
  jobTypeName: 'Service- 8 yrs or less - 1 Door',
  priority: 'high',
};

module.exports = { JOB_TYPE_ROUTING, DEFAULT_ROUTING };
