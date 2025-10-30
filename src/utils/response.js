/**
 * Standardized API response wrapper
 */
class APIResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Created response (201)
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * No content response (204)
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   * @param {Array} errors - Validation errors (optional)
   */
  static error(res, message, statusCode = 500, code = 'INTERNAL_ERROR', errors = null) {
    const response = {
      success: false,
      message,
      error: {
        code,
        ...(errors && { details: errors }),
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Validation error response (400)
   * @param {Object} res - Express response object
   * @param {Array} errors - Validation error details
   * @param {string} message - Error message
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 400, 'VALIDATION_ERROR', errors);
  }

  /**
   * Not found response (404)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Internal server error response (500)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static serverError(res, message = 'Internal server error') {
    return this.error(res, message, 500, 'INTERNAL_ERROR');
  }
}

module.exports = APIResponse;
