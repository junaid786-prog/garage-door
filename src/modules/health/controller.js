const serviceTitanService = require('../integrations/servicetitan/service');
const schedulingProIntegration = require('../integrations/schedulingpro/integration');
const redis = require('../../config/redis');
const { sequelize } = require('../../database/models');
const logger = require('../../utils/logger');

/**
 * Health Check Controller
 * Provides system health status and circuit breaker monitoring
 */
class HealthController {
  /**
   * Basic health check
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getHealth(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Detailed health check with dependencies
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getDetailedHealth(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      services: {},
    };

    // Check database connection
    try {
      await sequelize.authenticate();
      health.services.database = {
        status: 'healthy',
        type: 'PostgreSQL',
      };
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Check Redis connection
    try {
      const redisClient = redis.getRedisClient();
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.ping();
        health.services.redis = {
          status: 'healthy',
          type: 'Redis',
        };
      } else {
        health.services.redis = {
          status: 'unhealthy',
          error: 'Redis client not ready',
        };
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.redis = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Get circuit breaker status
    try {
      health.circuitBreakers = {
        serviceTitan: serviceTitanService.getCircuitBreakerHealth(),
        schedulingPro: schedulingProIntegration.getCircuitBreakerHealth(),
      };

      // Check if any circuit breakers are open
      const allBreakers = [
        ...Object.values(health.circuitBreakers.serviceTitan),
        ...Object.values(health.circuitBreakers.schedulingPro),
      ];

      const openBreakers = allBreakers.filter((b) => b.state === 'open').length;
      if (openBreakers > 0) {
        health.status = 'degraded';
        health.circuitBreakersOpen = openBreakers;
      }
    } catch (error) {
      logger.error('Failed to get circuit breaker health', { error: error.message });
      health.circuitBreakers = {
        error: 'Failed to retrieve circuit breaker status',
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  }

  /**
   * Get circuit breaker status only
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCircuitBreakerStatus(req, res) {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        circuitBreakers: {
          serviceTitan: serviceTitanService.getCircuitBreakerHealth(),
          schedulingPro: schedulingProIntegration.getCircuitBreakerHealth(),
        },
      };

      // Add summary
      const allBreakers = [
        ...Object.values(status.circuitBreakers.serviceTitan),
        ...Object.values(status.circuitBreakers.schedulingPro),
      ];

      status.summary = {
        total: allBreakers.length,
        closed: allBreakers.filter((b) => b.state === 'closed').length,
        open: allBreakers.filter((b) => b.state === 'open').length,
        halfOpen: allBreakers.filter((b) => b.state === 'half-open').length,
      };

      res.json(status);
    } catch (error) {
      logger.error('Failed to get circuit breaker status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve circuit breaker status',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new HealthController();
