const app = require('./app');
const config = require('./config');
const { connectRedis } = require('./config/redis');
const { connectDB, closeDB } = require('./database/connection');
const workerManager = require('./workers');

const PORT = config.port;

/**
 * Start server with database connection
 */
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    await connectRedis();
    await workerManager.startWorkers();

    // Then start the server
    const server = app.listen(PORT, () => {
      console.log('=================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${config.env}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('=================================');
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer()
  .then((server) => {
    /**
     * Graceful shutdown
     */
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await closeDB();
        console.log('Server and database closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      server.close(async () => {
        await closeDB();
        console.log('Server and database closed');
        process.exit(0);
      });
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  });
