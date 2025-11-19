const Joi = require('joi');

/**
 * Scheduling module validation schemas
 * Validates scheduling requests and slot reservations
 */

// ZIP code validation (reusable)
const zipCodeSchema = Joi.string()
  .pattern(/^\d{5}(-\d{4})?$/)
  .required()
  .messages({
    'string.pattern.base': 'ZIP code must be in format 12345 or 12345-1234',
    'string.empty': 'ZIP code is required',
    'any.required': 'ZIP code is required',
  });

// Date validation (YYYY-MM-DD format)
const dateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  });

// Slot reservation validation
const slotReservationSchema = Joi.object({
  slotId: Joi.string()
    .pattern(/^slot_\d{4}-\d{2}-\d{2}_\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Slot ID must be in format slot_YYYY-MM-DD_HHMM',
      'any.required': 'Slot ID is required',
    }),
  
  bookingId: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Booking ID is required',
      'string.max': 'Booking ID cannot exceed 100 characters',
      'any.required': 'Booking ID is required',
    }),
  
  customerInfo: Joi.object({
    name: Joi.string().max(200).optional(),
    phone: Joi.string().max(20).optional(),
    email: Joi.string().email().optional(),
    notes: Joi.string().max(500).optional(),
  }).optional(),
});

// Slot cancellation validation
const slotCancellationSchema = Joi.object({
  bookingId: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Booking ID is required',
      'string.max': 'Booking ID cannot exceed 100 characters',
      'any.required': 'Booking ID is required',
    }),
});

// Get available slots query validation
const availableSlotsQuerySchema = Joi.object({
  zip: zipCodeSchema,
  date: dateSchema,
  days: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .optional()
    .default(7)
    .messages({
      'number.min': 'Days must be at least 1',
      'number.max': 'Days cannot exceed 30',
      'number.integer': 'Days must be a whole number',
    }),
});

// Service availability query validation
const serviceAvailabilityQuerySchema = Joi.object({
  zip: zipCodeSchema,
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
      const errorDetails = error.details.map(detail => ({
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
const validateAvailableSlotsQuery = validate(availableSlotsQuerySchema, 'query');
const validateSlotReservation = validate(slotReservationSchema, 'body');
const validateSlotCancellation = validate(slotCancellationSchema, 'body');
const validateServiceAvailabilityQuery = validate(serviceAvailabilityQuerySchema, 'query');

/**
 * Custom validation for slot ID parameter
 */
const validateSlotIdParam = (req, res, next) => {
  const { slotId } = req.params;
  
  if (!slotId) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Slot ID is required',
    });
  }

  // Validate slot ID format
  const slotIdPattern = /^slot_\d{4}-\d{2}-\d{2}_\d{4}$/;
  if (!slotIdPattern.test(slotId)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Slot ID must be in format slot_YYYY-MM-DD_HHMM',
    });
  }

  next();
};

/**
 * Validate date range (start date cannot be in the past)
 */
const validateDateNotInPast = (req, res, next) => {
  const { date } = req.query;
  
  if (date) {
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Date cannot be in the past',
      });
    }
  }

  next();
};

/**
 * Rate limiting validation (basic)
 * Prevents too many slot lookups from same IP
 */
const validateRateLimit = (req, res, next) => {
  // This is a basic implementation
  // In production, use Redis-based rate limiting
  const ip = req.ip;
  const currentTime = Date.now();
  
  // Allow this for now, but structure for future implementation
  req.rateLimitInfo = {
    ip,
    timestamp: currentTime,
    // In production: check Redis for request count
  };
  
  next();
};

module.exports = {
  validate,
  validateAvailableSlotsQuery,
  validateSlotReservation,
  validateSlotCancellation,
  validateServiceAvailabilityQuery,
  validateSlotIdParam,
  validateDateNotInPast,
  validateRateLimit,
  
  // Export schemas for testing
  schemas: {
    availableSlotsQuerySchema,
    slotReservationSchema,
    slotCancellationSchema,
    serviceAvailabilityQuerySchema,
    zipCodeSchema,
    dateSchema,
  },
};