const logger = require('./logger');

/**
 * Timeout utilities for preventing hanging operations
 */

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message
 * @returns {Promise} Promise that rejects on timeout
 */
function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(errorMessage);
        error.code = 'TIMEOUT';
        error.timeout = ms;
        reject(error);
      }, ms);

      // Clear timeout if promise resolves first
      promise.finally(() => clearTimeout(timeoutId));
    }),
  ]);
}

/**
 * Wrap an async function with timeout protection
 * @param {Function} fn - Async function to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message
 * @returns {Function} Wrapped function with timeout
 */
function createTimeoutWrapper(fn, ms, errorMessage = 'Operation timed out') {
  return async function (...args) {
    return withTimeout(fn(...args), ms, errorMessage);
  };
}

/**
 * Execute multiple promises with a global timeout
 * @param {Array<Promise>} promises - Array of promises
 * @param {number} ms - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Array>} Promise.all with timeout
 */
function allWithTimeout(promises, ms, errorMessage = 'Operations timed out') {
  return withTimeout(Promise.all(promises), ms, errorMessage);
}

/**
 * Execute a function with retries and timeout
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.retries - Number of retries (default: 3)
 * @param {number} options.timeout - Timeout per attempt in ms (default: 5000)
 * @param {number} options.delay - Delay between retries in ms (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @returns {Promise} Result of function
 */
async function withRetryAndTimeout(fn, options = {}) {
  const { retries = 3, timeout = 5000, delay = 1000, shouldRetry = () => true } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      attempt++;
      logger.debug('Executing function with timeout', { attempt, timeout });
      return await withTimeout(fn(), timeout, `Operation timed out after ${timeout}ms`);
    } catch (error) {
      lastError = error;

      // Log the error
      logger.warn('Function execution failed', {
        attempt,
        maxRetries: retries,
        error: error.message,
        isTimeout: error.code === 'TIMEOUT',
      });

      // If we've exhausted retries, throw
      if (attempt > retries) {
        logger.error('Function failed after all retries', {
          attempts: attempt,
          error: error.message,
        });
        throw error;
      }

      // Check if error is retryable
      if (!shouldRetry(error)) {
        logger.info('Error not retryable, stopping attempts', {
          attempt,
          error: error.message,
        });
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const waitTime = delay * Math.pow(2, attempt - 1);
      logger.debug('Waiting before retry', { waitTime, nextAttempt: attempt + 1 });
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * Create a timeout error with standard format
 * @param {string} operation - Operation that timed out
 * @param {number} timeout - Timeout duration in ms
 * @returns {Error} Formatted timeout error
 */
function createTimeoutError(operation, timeout) {
  const error = new Error(`${operation} timed out after ${timeout}ms`);
  error.code = 'TIMEOUT';
  error.operation = operation;
  error.timeout = timeout;
  error.isOperational = true;
  return error;
}

module.exports = {
  withTimeout,
  createTimeoutWrapper,
  allWithTimeout,
  withRetryAndTimeout,
  createTimeoutError,
};
