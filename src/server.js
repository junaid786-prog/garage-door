const app = require('./app');
const config = require('./config');
const { connectRedis } = require('./config/redis');
const { connectDB, closeDB } = require('./database/connection');
const workerManager = require('./workers');
const { initializeRateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const PORT = config.port;

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
