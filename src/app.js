const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const validateApiKey = require('./middleware/apiKeyAuth');
const { createRateLimiter } = require('./middleware/rateLimiter');

// Import routes
const eventRoutes = require('./modules/events/routes');
const bookingRoutes = require('./modules/bookings/routes');
const geoRoutes = require('./modules/geo/routes');
const schedulingRoutes = require('./modules/scheduling/routes');

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

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting middleware (applied to all routes)
const rateLimiter = createRateLimiter();
app.use(rateLimiter);

// Health check endpoint (public - no API key required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: config.env,
  });
});

// API routes (protected with API key)
app.use('/api/events', validateApiKey, eventRoutes);
app.use('/api/bookings', validateApiKey, bookingRoutes);
app.use('/api/geo', validateApiKey, geoRoutes);
app.use('/api/scheduling', validateApiKey, schedulingRoutes);

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
