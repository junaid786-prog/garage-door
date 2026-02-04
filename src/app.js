const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const validateApiKey = require('./middleware/apiKeyAuth');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { getMorganMiddleware } = require('./config/morgan');

// Import routes
const healthRoutes = require('./modules/health/routes');
const eventRoutes = require('./modules/events/routes');
const bookingRoutes = require('./modules/bookings/routes');
const geoRoutes = require('./modules/geo/routes');
const schedulingRoutes = require('./modules/scheduling/routes');
const errorRecoveryRoutes = require('./modules/admin/errorRecoveryRoutes');

/**
 * Create Express application
 */
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware (production-safe, no PII in logs)
app.use(getMorganMiddleware(config.env));

// Rate limiting middleware (applied to all routes)
const rateLimiter = createRateLimiter();
app.use(rateLimiter);

// Health Check endpoints (public - no API key required)
app.use('/health', healthRoutes);

// API routes (protected with API key)
app.use('/api/events', validateApiKey, eventRoutes);
app.use('/api/bookings', validateApiKey, bookingRoutes);
app.use('/api/geo', validateApiKey, geoRoutes);
app.use('/api/scheduling', validateApiKey, schedulingRoutes);

// Admin routes (protected with API key - should add role-based auth in production)
app.use('/admin/errors', validateApiKey, errorRecoveryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
