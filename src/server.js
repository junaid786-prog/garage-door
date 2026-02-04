const app = require('./app');
const config = require('./config');
const { connectRedis } = require('./config/redis');
const { connectDB, closeDB } = require('./database/connection');
const workerManager = require('./workers');
const { initializeRateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const PORT = config.port;

/**
 * Global error handlers for unhandled errors
 * These catch errors that slip through normal error handling
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });

  // In production, we might want to gracefully shutdown
  // For now, log and continue (circuit breakers will handle service failures)
  if (config.env === 'production') {
    logger.warn('Unhandled rejection in production - monitoring for cascading failures');
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - Critical Error', {
    error: error.message,
    stack: error.stack,
    code: error.code,
  });

  // Uncaught exceptions are serious - attempt graceful shutdown
  logger.error('Attempting graceful shutdown due to uncaught exception');

  // Give the logger time to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

/**
 * Start server with database connection
 */
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    await connectRedis();

    // Initialize rate limiter after Redis connection
    initializeRateLimiter();

    await workerManager.startWorkers();

    // Then start the server
    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: config.env,
        healthCheck: `http://localhost:${PORT}/health`,
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer()
  .then((server) => {
    /**
     * Graceful shutdown
     */
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await closeDB();
        logger.info('Server and database closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await closeDB();
        logger.info('Server and database closed');
        process.exit(0);
      });
    });
  })
  .catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
