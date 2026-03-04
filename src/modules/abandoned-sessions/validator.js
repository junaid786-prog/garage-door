const Joi = require('joi');

// Abandoned session schema
// Most fields are optional since user may abandon at different steps
// Only requirement: must have at least email OR phone (for ServiceTitan contact)
const abandonedSessionSchema = Joi.object({
  sessionId: Joi.string().max(255).required(),

  // Contact info (at least email OR phone required)
  firstName: Joi.string().max(100).optional().allow(''),
  lastName: Joi.string().max(100).optional().allow(''),
  email: Joi.string().email().max(255).optional().allow(''),
  phone: Joi.string().max(20).optional().allow(''),
  smsOptIn: Joi.boolean().optional().default(false),
  contactPref: Joi.string().max(50).optional().allow(''),

  // Address (all optional - partial address allowed)
  address: Joi.string().max(255).optional().allow(''),
  unit: Joi.string().max(50).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(50).optional().allow(''),
  zipCode: Joi.string().max(20).optional().allow(''),

  // Campaign context (optional)
  utms: Joi.object({
    utm_source: Joi.string().max(100).optional().allow(''),
    utm_medium: Joi.string().max(100).optional().allow(''),
    utm_campaign: Joi.string().max(255).optional().allow(''),
    utm_term: Joi.string().max(255).optional().allow(''),
    utm_content: Joi.string().max(255).optional().allow(''),
  }).optional(),
  campaignId: Joi.string().max(100).optional().allow(''),
  flowSource: Joi.string().max(50).optional().allow(''),
  referrer: Joi.string().optional().allow(''),

  // Booking context (optional)
  serviceType: Joi.string().max(50).optional().allow(''),
  serviceSymptom: Joi.string().max(50).optional().allow(''),
  doorCount: Joi.alternatives().try(Joi.number().integer().min(1).max(10), Joi.string()).optional(),
  selectedDate: Joi.date().optional().allow(null),
  selectedSlotId: Joi.string().max(100).optional().allow(''),

  // Abandonment tracking
  lastStepNumber: Joi.number().integer().min(0).optional(),
  lastStepName: Joi.string().max(100).optional().allow(''),
  timeElapsedMs: Joi.number().integer().min(0).optional(),
  idleTimeMs: Joi.number().integer().min(0).optional(),
  abandonmentReason: Joi.string().valid('page_hide', 'idle_timeout', 'beforeunload', 'unknown').optional(),
}).custom((value, helpers) => {
  // Validate that at least email OR phone is provided
  // This is required for ServiceTitan booking creation
  if (!value.email && !value.phone) {
    return helpers.error('any.custom', {
      message: 'At least one contact method (email or phone) is required',
    });
  }
  return value;
});

/**
 * Middleware to validate abandoned session creation request
 */
const validateAbandonedSession = (req, res, next) => {
  const { error, value } = abandonedSessionSchema.validate(req.body, {
    abortEarly: false, // Return all errors, not just the first one
    stripUnknown: true, // Remove unknown fields
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid abandoned session data',
        details: errors,
      },
    });
  }

  // Replace req.body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = {
  abandonedSessionSchema,
  validateAbandonedSession,
};
