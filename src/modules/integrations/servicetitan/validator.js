const Joi = require('joi');

/**
 * ServiceTitan integration validation schemas
 * Validates job creation, status updates, and other ServiceTitan operations
 */

// Customer validation schema
const customerSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .min(10)
    .max(15)
    .required(),
  email: Joi.string().email().required(),
  customerType: Joi.string().valid('residential', 'commercial').default('residential'),
});

// Address validation schema
const addressSchema = Joi.object({
  address: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(50).required(),
  state: Joi.string().length(2).required(),
  zip: Joi.string()
    .pattern(/^\d{5}(-\d{4})?$/)
    .required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }).optional(),
});

// Job creation validation schema
const jobSchema = Joi.object({
  // Booking reference
  bookingId: Joi.string().optional(),

  // Customer information
  ...customerSchema.extract(['firstName', 'lastName', 'phone', 'email']),
  customerType: customerSchema.extract('customerType'),

  // Service location
  ...addressSchema.extract(['address', 'city', 'state', 'zip']),
  coordinates: addressSchema.extract('coordinates'),

  // Job details
  problemType: Joi.string()
    .valid(
      'broken_spring',
      'door_wont_open',
      'door_wont_close',
      'door_stuck_closed',
      'noisy_door',
      'remote_not_working',
      'new_door_installation',
      'other'
    )
    .required(),

  doorCount: Joi.number().integer().min(1).max(10).default(1),
  doorAge: Joi.number().integer().min(0).max(50).optional(),
  isRenter: Joi.boolean().default(false),

  // Scheduling
  scheduledDate: Joi.string().isoDate().required(),
  timeSlot: Joi.string().optional(),

  // Additional information
  specialInstructions: Joi.string().max(500).optional(),
  campaignId: Joi.string().optional(),
  source: Joi.string().default('online_booking_widget'),
});

// Job status update validation schema
const jobStatusSchema = Joi.object({
  status: Joi.string()
    .valid('scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled')
    .required(),
});

// Job cancellation validation schema
const jobCancellationSchema = Joi.object({
  reason: Joi.string().max(200).default('Customer request'),
});

// Date range query validation schema
const dateRangeSchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
});

// Batch job creation validation schema
const batchJobsSchema = Joi.object({
  bookings: Joi.array().items(jobSchema).min(1).max(100).required(),
});

/**
 * Validation middleware generator
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Show all validation errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errorDetails,
      });
    }

    // Replace validated data
    req[property] = value;
    next();
  };
};

/**
 * Specific validation middlewares
 */
const validateJob = validate(jobSchema, 'body');
const validateJobStatus = validate(jobStatusSchema, 'body');
const validateJobCancellation = validate(jobCancellationSchema, 'body');
const validateDateRange = validate(dateRangeSchema, 'query');
const validateBatchJobs = validate(batchJobsSchema, 'body');

/**
 * Custom validation for job ID parameter
 */
const validateJobId = (req, res, next) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Job ID is required',
    });
  }

  if (!/^\d+$/.test(jobId)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Job ID must be a number',
    });
  }

  next();
};

/**
 * Webhook validation (for future real implementation)
 */
const validateWebhook = (req, res, next) => {
  // In real implementation, validate ServiceTitan webhook signature
  const signature = req.headers['x-servicetitan-signature'];

  if (!signature) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing webhook signature',
    });
  }

  // For simulation, just log and continue
  logger.info('Webhook signature received:', signature);
  next();
};

module.exports = {
  validate,
  validateJob,
  validateJobStatus,
  validateJobCancellation,
  validateDateRange,
  validateBatchJobs,
  validateJobId,
  validateWebhook,

  // Export schemas for testing
  schemas: {
    jobSchema,
    jobStatusSchema,
    jobCancellationSchema,
    dateRangeSchema,
    batchJobsSchema,
    customerSchema,
    addressSchema,
  },
};
