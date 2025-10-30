const app = require('./app');
const config = require('./config');

const PORT = config.port;

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${config.env}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('=================================');
  console.log('Available endpoints:');
  console.log(`  POST   http://localhost:${PORT}/api/bookings`);
  console.log(`  GET    http://localhost:${PORT}/api/bookings/:id`);
  console.log(`  POST   http://localhost:${PORT}/api/mock/servicetitan/jobs`);
  console.log(`  GET    http://localhost:${PORT}/api/mock/servicetitan/jobs/:jobId`);
  console.log(`  POST   http://localhost:${PORT}/api/events`);
  console.log(`  GET    http://localhost:${PORT}/api/events`);
  console.log(`  GET    http://localhost:${PORT}/api/events/stats`);
  console.log('=================================');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
