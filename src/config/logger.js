/**
 * Winston Logger Configuration
 *
 * Environment-based logging configuration:
 * - Development: Verbose, colorized console output for debugging
 * - Production: JSON formatted file output for log aggregation
 *
 * Environment Variables:
 * - LOG_LEVEL: error, warn, info, debug (default: warn in prod, debug in dev)
 * - LOG_FORMAT: json, pretty (default: json in prod, pretty in dev)
 * - LOG_TRANSPORT: console, file (default: file in prod, console in dev)
 */

const winston = require('winston');
const path = require('path');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Get log level from environment or use defaults
const getLogLevel = () => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }

  // Defaults based on environment
  if (isTest) return 'error'; // Quiet in tests
  if (isProduction) return 'warn'; // Only warnings/errors in production
  return 'debug'; // Verbose in development
};

// Get log format from environment or use defaults
const getLogFormat = () => {
  const format = process.env.LOG_FORMAT || (isProduction ? 'json' : 'pretty');

  if (format === 'json') {
    // Machine-readable JSON format for production
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
  }

  // Human-readable format for development
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;

      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        log += '\n' + JSON.stringify(meta, null, 2);
      }

      return log;
    })
  );
};

// Get transports based on environment
const getTransports = () => {
  const transportType = process.env.LOG_TRANSPORT || (isProduction ? 'file' : 'console');
  const transports = [];

  if (transportType === 'file' || isProduction) {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');

    // Separate files for different log levels
    transports.push(
      // All logs
      new winston.transports.File({
        filename: path.join(logsDir, 'app.log'),
        level: getLogLevel(),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
      // Error logs only
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true,
      })
    );
  }

  if (transportType === 'console' || !isProduction) {
    // Console output for development
    transports.push(
      new winston.transports.Console({
        level: getLogLevel(),
      })
    );
  }

  return transports;
};

// Create the Winston logger instance
const winstonLogger = winston.createLogger({
  level: getLogLevel(),
  format: getLogFormat(),
  transports: getTransports(),

  // Don't exit on handled exceptions
  exitOnError: false,

  // Silent in test environment
  silent: isTest,
});

// Handle uncaught exceptions and unhandled rejections
if (isProduction) {
  // Log uncaught exceptions to file
  winstonLogger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 5,
    })
  );

  // Log unhandled promise rejections to file
  winstonLogger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 5,
    })
  );
}

// Log startup configuration
if (!isTest) {
  winstonLogger.info('Logger initialized', {
    level: getLogLevel(),
    format: process.env.LOG_FORMAT || (isProduction ? 'json' : 'pretty'),
    transport: process.env.LOG_TRANSPORT || (isProduction ? 'file' : 'console'),
    environment: process.env.NODE_ENV || 'development',
  });
}

module.exports = winstonLogger;
