const Joi = require('joi');
const APIResponse = require('../../utils/response');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema
 * @returns {Function} Express middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return APIResponse.validationError(res, errors);
    }

    next();
  };
};

/**
 * Booking validation schemas
 */
const schemas = {
  create: Joi.object({
    customerName: Joi.string().min(2).max(100).required(),
    customerEmail: Joi.string().email().required(),
    customerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().length(2).required(),
      zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
    }).required(),
    serviceType: Joi.string().valid(
      'repair',
      'installation',
      'maintenance',
      'inspection'
    ).required(),
    preferredDateTime: Joi.date().iso().greater('now').required(),
    notes: Joi.string().max(500).optional(),
  }),
};

module.exports = {
  create: validateRequest(schemas.create),
};
