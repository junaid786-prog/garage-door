const Joi = require('joi');

// Service schema
const serviceSchema = Joi.object({
  type: Joi.string().valid('repair', 'replacement').required(),
  symptom: Joi.string()
    .valid('wont_open', 'wont_close', 'spring_bang', 'tune_up', 'other')
    .required(),
  can_open_close: Joi.string().valid('yes', 'no', 'partial').required(),
});

// Door schema
const doorSchema = Joi.object({
  age_bucket: Joi.string().valid('lt_8', 'gte_8').required(),
  count: Joi.number().valid(1, 2, 3).required(), // Accept 1, 2, or 3 doors
});

// Address schema
const addressSchema = Joi.object({
  street: Joi.string().min(1).max(255).required(),
  unit: Joi.string().max(50).optional().allow(''),
  city: Joi.string().min(1).max(100).required(),
  state: Joi.string().length(2).required(),
  zip: Joi.string()
    .pattern(/^\d{5}(-\d{4})?$/)
    .required(),
});

// Occupancy schema
const occupancySchema = Joi.object({
  type: Joi.string().valid('homeowner', 'renter', 'pm', 'unknown').default('unknown'),
  renterPermission: Joi.boolean().optional(),
});

// Contact schema
const contactSchema = Joi.object({
  phoneE164: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required(),
  name: Joi.string().min(1).max(100).optional(),
});

// Scheduling schema
const schedulingSchema = Joi.object({
  slot_id: Joi.string().optional(),
  asap_selected: Joi.boolean().optional(),
  priority_score: Joi.number().min(0).max(100).optional(),
});

// Complete booking form schema
const bookingFormSchema = Joi.object({
  service: serviceSchema.required(),
  door: doorSchema.required(),
  replacement_pref: Joi.string().valid('basic', 'nicer').allow(null).optional(),
  address: addressSchema.required(),
  occupancy: occupancySchema.required(),
  contact: contactSchema.required(),
  scheduling: schedulingSchema.required(),
  notes: Joi.string().max(1000).optional().allow(''),
  suspected_issue: Joi.string().max(500).optional().allow(''),
});

// Partial booking form schema for updates
const partialBookingFormSchema = Joi.object({
  service: Joi.object({
    type: Joi.string().valid('repair', 'replacement').optional(),
    symptom: Joi.string()
      .valid('wont_open', 'wont_close', 'spring_bang', 'tune_up', 'other')
      .optional(),
    can_open_close: Joi.string().valid('yes', 'no', 'partial').optional(),
  }).optional(),
  door: Joi.object({
    age_bucket: Joi.string().valid('lt_8', 'gte_8').optional(),
    count: Joi.number().valid(1, 2).optional(),
  }).optional(),
  replacement_pref: Joi.string().valid('basic', 'nicer').allow(null).optional(),
  address: Joi.object({
    street: Joi.string().min(1).max(255).optional(),
    unit: Joi.string().max(50).optional().allow(''),
    city: Joi.string().min(1).max(100).optional(),
    state: Joi.string().length(2).optional(),
    zip: Joi.string()
      .pattern(/^\d{5}(-\d{4})?$/)
      .optional(),
  }).optional(),
  occupancy: occupancySchema.optional(),
  contact: Joi.object({
    phoneE164: Joi.string()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .optional(),
    name: Joi.string().min(1).max(100).optional(),
  }).optional(),
  scheduling: schedulingSchema.optional(),
  notes: Joi.string().max(1000).optional().allow(''),
  suspected_issue: Joi.string().max(500).optional().allow(''),
});

// Booking status update schema
const bookingStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')
    .required(),
});

// External system ID schemas
const serviceTitanJobSchema = Joi.object({
  serviceTitanJobId: Joi.string().max(100).required(),
});

const schedulingProJobSchema = Joi.object({
  schedulingProJobId: Joi.string().max(100).required(),
});

// Query parameter schemas
const bookingQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')
    .optional(),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional(),
  zip: Joi.string()
    .pattern(/^\d{5}(-\d{4})?$/)
    .optional(),
  serviceType: Joi.string().valid('repair', 'replacement').optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'status').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

// Validation middleware functions
const validateBookingCreate = (req, res, next) => {
  const { error } = bookingFormSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const validateBookingUpdate = (req, res, next) => {
  const { error } = partialBookingFormSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const validateBookingStatus = (req, res, next) => {
  const { error } = bookingStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const validateBookingQuery = (req, res, next) => {
  const { error, value } = bookingQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Query validation error',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }
  req.query = value;
  next();
};

module.exports = {
  schemas: {
    serviceSchema,
    doorSchema,
    addressSchema,
    occupancySchema,
    contactSchema,
    schedulingSchema,
    bookingFormSchema,
    partialBookingFormSchema,
    bookingStatusSchema,
    serviceTitanJobSchema,
    schedulingProJobSchema,
    bookingQuerySchema,
  },
  middleware: {
    validateBookingCreate,
    validateBookingUpdate,
    validateBookingStatus,
    validateBookingQuery,
  },
};
