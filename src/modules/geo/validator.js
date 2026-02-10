const Joi = require('joi');

/**
 * Geo module validation schemas
 * Validates geolocation and service area requests
 */

const zipCodeSchema = Joi.object({
  zipCode: Joi.string()
    .pattern(/^\d{5}(-\d{4})?$/)
    .required()
    .messages({
      'string.pattern.base': 'ZIP code must be in format 12345 or 12345-1234',
      'string.empty': 'ZIP code is required',
      'any.required': 'ZIP code is required',
    }),
});

const coordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
    'any.required': 'Latitude is required',
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
    'any.required': 'Longitude is required',
  }),
});

const distanceSchema = Joi.object({
  point1: coordinatesSchema.required(),
  point2: coordinatesSchema.required(),
});

/**
 * Validation middleware generator
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
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
};

/**
 * Specific validation middlewares
 */
const validateZipCode = validate(zipCodeSchema, 'params');
const validateCoordinates = validate(coordinatesSchema, 'query');
const validateDistance = validate(distanceSchema, 'body');

// Legacy geo data validation (query params)
const validateGeoDataQuery = (req, res, next) => {
  if (req.query.zip) {
    const { error } = Joi.string()
      .pattern(/^\d{5}(-\d{4})?$/)
      .validate(req.query.zip);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'ZIP code must be in format 12345 or 12345-1234',
        error: {
          code: 'VALIDATION_ERROR',
          details: [{
            field: 'zip',
            message: 'ZIP code must be in format 12345 or 12345-1234',
          }],
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

module.exports = {
  validate,
  validateZipCode,
  validateCoordinates,
  validateDistance,
  validateGeoDataQuery,

  // Export schemas for testing
  schemas: {
    zipCodeSchema,
    coordinatesSchema,
    distanceSchema,
  },
};
