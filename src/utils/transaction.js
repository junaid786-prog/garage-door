const sequelize = require('../database/connection');
const logger = require('./logger');

/**
 * Transaction wrapper utility
 * Provides a reusable transaction wrapper with automatic commit/rollback
 */

/**
 * Execute a callback function within a database transaction
 *
 * @param {Function} callback - Async function that receives the transaction object
 * @param {Object} options - Transaction options
 * @param {number} options.timeout - Transaction timeout in milliseconds (default: 30000)
 * @param {string} options.isolationLevel - Transaction isolation level
 * @returns {Promise<*>} Result of the callback function
 *
 * @example
 * const result = await withTransaction(async (transaction) => {
 *   const booking = await Booking.create({ ... }, { transaction });
 *   await sendNotification(booking.id, { transaction });
 *   return booking;
 * });
 */
const withTransaction = async (callback, options = {}) => {
  const { timeout = 30000, isolationLevel } = options;

  // Validate callback is a function
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }

  let transaction;
  const timeoutError = new Error('Transaction timeout exceeded');
  let hasTimedOut = false;

  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      hasTimedOut = true;
      reject(timeoutError);
    }, timeout);
  });

  try {
    // Start transaction with options
    const transactionOptions = {};
    if (isolationLevel) {
      transactionOptions.isolationLevel = isolationLevel;
    }

    transaction = await sequelize.transaction(transactionOptions);

    // Execute callback with transaction, racing against timeout
    const result = await Promise.race([callback(transaction), timeoutPromise]);

    // If we got here without timeout, commit
    if (!hasTimedOut) {
      await transaction.commit();
      return result;
    }
  } catch (error) {
    // Rollback transaction if it exists and hasn't been committed
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // Log rollback error but throw original error
        logger.error('Transaction rollback failed', { error: rollbackError });
      }
    }

    // Re-throw the original error
    throw error;
  }
};

/**
 * Execute multiple operations in a single transaction
 *
 * @param {Array<Function>} operations - Array of async functions that receive the transaction
 * @param {Object} options - Transaction options
 * @returns {Promise<Array<*>>} Array of results from each operation
 *
 * @example
 * const [booking, notification, job] = await withTransactionBatch([
 *   (tx) => Booking.create({ ... }, { transaction: tx }),
 *   (tx) => Notification.create({ ... }, { transaction: tx }),
 *   (tx) => Job.create({ ... }, { transaction: tx }),
 * ]);
 */
const withTransactionBatch = async (operations, options = {}) => {
  if (!Array.isArray(operations)) {
    throw new TypeError('Operations must be an array');
  }

  if (operations.length === 0) {
    return [];
  }

  return withTransaction(async (transaction) => {
    const results = [];

    // Execute operations sequentially
    for (const operation of operations) {
      if (typeof operation !== 'function') {
        throw new TypeError('Each operation must be a function');
      }
      const result = await operation(transaction);
      results.push(result);
    }

    return results;
  }, options);
};

/**
 * Retry a transaction if it fails with a retryable error
 *
 * @param {Function} callback - Async function that receives the transaction object
 * @param {Object} options - Options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @param {Function} options.isRetryable - Function to determine if error is retryable
 * @returns {Promise<*>} Result of the callback function
 */
const withTransactionRetry = async (callback, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    isRetryable = (error) => {
      // Default: retry on deadlock, serialization failure, or connection errors
      const retryableErrors = [
        'SequelizeConnectionError',
        'SequelizeConnectionRefusedError',
        'SequelizeHostNotFoundError',
        'SequelizeHostNotReachableError',
        'SequelizeInvalidConnectionError',
        'SequelizeConnectionTimedOutError',
        'SequelizeTimeoutError',
      ];
      return (
        retryableErrors.includes(error.name) ||
        error.message?.includes('deadlock') ||
        error.message?.includes('serialization failure')
      );
    },
    ...transactionOptions
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await withTransaction(callback, transactionOptions);
    } catch (error) {
      lastError = error;
      attempt++;

      // If max retries reached or error is not retryable, throw
      if (attempt > maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

module.exports = {
  withTransaction,
  withTransactionBatch,
  withTransactionRetry,
};
