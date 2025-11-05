const app = require('./app');
const config = require('./config');
const { connectDB, closeDB } = require('./database/connection');

const PORT = config.port;

/**
 * Start server with database connection
 */
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Then start the server
    const server = app.listen(PORT, () => {
      console.log('=================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${config.env}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('=================================');
      console.log('Available endpoints:');
      console.log(`  POST   http://localhost:${PORT}/api/bookings`);
      console.log(`  GET    http://localhost:${PORT}/api/bookings/:id`);
      console.log(`  POST   http://localhost:${PORT}/api/events`);
      console.log(`  GET    http://localhost:${PORT}/api/events`);
      console.log(`  GET    http://localhost:${PORT}/api/events/stats`);
      console.log('=================================');
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer().then(server => {
  /**
   * Graceful shutdown
   */
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
      await closeDB();
      console.log('Server and database closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(async () => {
      await closeDB();
      console.log('Server and database closed');
      process.exit(0);
    });
  });
}).catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
