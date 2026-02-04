const ErrorLog = require('../database/models/ErrorLog');
const { sanitizeError } = require('../utils/errorSanitizer');
const logger = require('../utils/logger');

/**
 * Error Logging Service
 * Records critical failures for manual review and recovery
 */
class ErrorLogService {
  /**
   * Log an error to the database
   * @param {Object} params - Error parameters
   * @param {string} params.errorType - Type of error
   * @param {string} params.operation - Operation that failed
   * @param {string} params.serviceName - External service name (optional)
   * @param {Object} params.context - Error context (sanitized automatically)
   * @param {Error} params.error - The error object
   * @param {boolean} params.retryable - Whether error is retryable
   * @returns {Promise<Object>} Created error log
   */
  async logError({
    errorType,
    operation,
    serviceName = null,
    context = {},
    error,
    retryable = true,
  }) {
    try {
      // Sanitize error data
      const sanitized = sanitizeError(error);

      // Create error log entry
      const errorLog = await ErrorLog.create({
        errorType,
        operation,
        serviceName,
        context: {
          ...context,
          // Remove any potential PII from context
          timestamp: new Date().toISOString(),
        },
        errorMessage: sanitized.message,
        errorCode: error.code || error.errorCode || null,
        stackTrace: sanitized.stack,
        retryable,
        retryCount: 0,
        resolved: false,
      });

      logger.warn('Critical error logged to database', {
        errorLogId: errorLog.id,
        errorType,
        operation,
        serviceName,
        retryable,
      });

      return errorLog;
    } catch (logError) {
      // If we can't log to database, at least log to file
      logger.error('Failed to log error to database', {
        originalError: error.message,
        logError: logError.message,
        errorType,
        operation,
      });
      throw logError;
    }
  }

  /**
   * Get all unresolved errors
   * @param {Object} filters - Optional filters
   * @param {string} filters.operation - Filter by operation
   * @param {string} filters.serviceName - Filter by service
   * @param {boolean} filters.retryable - Filter by retryable status
   * @param {number} filters.limit - Limit results
   * @returns {Promise<Array>} Array of unresolved errors
   */
  async getUnresolvedErrors(filters = {}) {
    try {
      const where = { resolved: false };

      if (filters.operation) {
        where.operation = filters.operation;
      }

      if (filters.serviceName) {
        where.serviceName = filters.serviceName;
      }

      if (filters.retryable !== undefined) {
        where.retryable = filters.retryable;
      }

      const errors = await ErrorLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 100,
      });

      return errors;
    } catch (error) {
      logger.error('Failed to fetch unresolved errors', { error: error.message });
      throw error;
    }
  }

  /**
   * Get error by ID
   * @param {string} id - Error log ID
   * @returns {Promise<Object>} Error log
   */
  async getErrorById(id) {
    try {
      const errorLog = await ErrorLog.findByPk(id);

      if (!errorLog) {
        const error = new Error(`Error log not found: ${id}`);
        error.code = 'ERROR_LOG_NOT_FOUND';
        throw error;
      }

      return errorLog;
    } catch (error) {
      logger.error('Failed to fetch error log', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Mark error as resolved
   * @param {string} id - Error log ID
   * @param {string} resolvedBy - How it was resolved
   * @returns {Promise<Object>} Updated error log
   */
  async markResolved(id, resolvedBy = 'manual') {
    try {
      const errorLog = await this.getErrorById(id);

      await errorLog.update({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      });

      logger.info('Error log marked as resolved', {
        errorLogId: id,
        resolvedBy,
      });

      return errorLog;
    } catch (error) {
      logger.error('Failed to mark error as resolved', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Increment retry count for an error
   * @param {string} id - Error log ID
   * @returns {Promise<Object>} Updated error log
   */
  async incrementRetryCount(id) {
    try {
      const errorLog = await this.getErrorById(id);

      await errorLog.increment('retryCount');

      logger.debug('Error log retry count incremented', {
        errorLogId: id,
        newCount: errorLog.retryCount + 1,
      });

      return errorLog;
    } catch (error) {
      logger.error('Failed to increment retry count', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get error statistics
   * @param {Object} filters - Optional filters
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @returns {Promise<Object>} Error statistics
   */
  async getErrorStats(filters = {}) {
    try {
      const where = {};

      if (filters.startDate) {
        where.createdAt = { ...where.createdAt, [ErrorLog.sequelize.Op.gte]: filters.startDate };
      }

      if (filters.endDate) {
        where.createdAt = { ...where.createdAt, [ErrorLog.sequelize.Op.lte]: filters.endDate };
      }

      const [total, resolved, unresolved, retryable] = await Promise.all([
        ErrorLog.count({ where }),
        ErrorLog.count({ where: { ...where, resolved: true } }),
        ErrorLog.count({ where: { ...where, resolved: false } }),
        ErrorLog.count({ where: { ...where, retryable: true, resolved: false } }),
      ]);

      return {
        total,
        resolved,
        unresolved,
        retryable,
        resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0,
      };
    } catch (error) {
      logger.error('Failed to fetch error statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete old resolved errors
   * @param {number} daysOld - Delete errors older than this many days
   * @returns {Promise<number>} Number of deleted errors
   */
  async cleanupOldErrors(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await ErrorLog.destroy({
        where: {
          resolved: true,
          resolvedAt: {
            [ErrorLog.sequelize.Op.lt]: cutoffDate,
          },
        },
      });

      logger.info('Old error logs cleaned up', {
        deleted,
        olderThan: daysOld,
      });

      return deleted;
    } catch (error) {
      logger.error('Failed to cleanup old errors', { error: error.message });
      throw error;
    }
  }
}

module.exports = new ErrorLogService();
