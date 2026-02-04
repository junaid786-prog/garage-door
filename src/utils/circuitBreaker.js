const CircuitBreaker = require('opossum');
const logger = require('./logger');

/**
 * Circuit Breaker Configuration
 * Protects external services from cascading failures
 */
const DEFAULT_OPTIONS = {
  timeout: 30000, // 30 seconds - fail if function takes longer
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 5000, // 5 seconds - try again after this time
  rollingCountTimeout: 10000, // 10 second window for measuring failures
  rollingCountBuckets: 10, // Number of buckets in the window
  name: 'default', // Circuit breaker name for logging
  fallback: null, // Optional fallback function
};

/**
 * Create a circuit breaker for an async function
 * @param {Function} fn - Async function to protect
 * @param {Object} options - Circuit breaker options
 * @param {Function} fallback - Optional fallback function
 * @returns {CircuitBreaker} Configured circuit breaker
 */
function createCircuitBreaker(fn, options = {}, fallback = null) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Create circuit breaker with the function
  const breaker = new CircuitBreaker(fn, config);

  // Add fallback if provided
  if (fallback || config.fallback) {
    breaker.fallback(fallback || config.fallback);
  }

  // Event logging for monitoring
  breaker.on('open', () => {
    logger.warn(`Circuit breaker opened for ${config.name}`, {
      service: config.name,
      state: 'open',
      message: 'Too many failures, circuit opened',
    });
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open for ${config.name}`, {
      service: config.name,
      state: 'half-open',
      message: 'Testing if service recovered',
    });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${config.name}`, {
      service: config.name,
      state: 'closed',
      message: 'Service healthy, circuit closed',
    });
  });

  breaker.on('success', (result) => {
    logger.debug(`Circuit breaker success for ${config.name}`, {
      service: config.name,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed'
    });
  });

  breaker.on('failure', (error) => {
    logger.warn(`Circuit breaker failure for ${config.name}`, {
      service: config.name,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      error: error.message,
    });
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout for ${config.name}`, {
      service: config.name,
      timeout: config.timeout,
      message: 'Request exceeded timeout',
    });
  });

  breaker.on('fallback', (result) => {
    logger.info(`Circuit breaker fallback executed for ${config.name}`, {
      service: config.name,
      message: 'Fallback function called',
    });
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker rejected request for ${config.name}`, {
      service: config.name,
      state: 'open',
      message: 'Request rejected, circuit is open',
    });
  });

  return breaker;
}

/**
 * Get health status of a circuit breaker
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 * @returns {Object} Health status
 */
function getCircuitBreakerHealth(breaker) {
  const stats = breaker.stats;

  return {
    name: breaker.name,
    state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
    enabled: breaker.enabled,
    stats: {
      fires: stats.fires,
      successes: stats.successes,
      failures: stats.failures,
      timeouts: stats.timeouts,
      fallbacks: stats.fallbacks,
      rejects: stats.rejects,
      latencyMean: stats.latencyMean,
      percentiles: stats.percentiles,
    },
  };
}

/**
 * Get health status of multiple circuit breakers
 * @param {Object} breakers - Object with circuit breaker instances
 * @returns {Object} Health status of all breakers
 */
function getAllCircuitBreakerHealth(breakers) {
  const health = {};

  for (const [name, breaker] of Object.entries(breakers)) {
    health[name] = getCircuitBreakerHealth(breaker);
  }

  return health;
}

/**
 * Wrap a service method with a circuit breaker
 * Convenience function for wrapping individual service methods
 * @param {Object} service - Service object
 * @param {string} methodName - Method name to wrap
 * @param {Object} options - Circuit breaker options
 * @param {Function} fallback - Optional fallback function
 * @returns {CircuitBreaker} Circuit breaker instance
 */
function wrapServiceMethod(service, methodName, options = {}, fallback = null) {
  const originalMethod = service[methodName].bind(service);
  const breakerName = options.name || `${service.constructor.name}.${methodName}`;

  return createCircuitBreaker(
    originalMethod, { ...options, name: breakerName }, fallback
  );
}

module.exports = {
  createCircuitBreaker,
  getCircuitBreakerHealth,
  getAllCircuitBreakerHealth,
  wrapServiceMethod,
  DEFAULT_OPTIONS,
};
