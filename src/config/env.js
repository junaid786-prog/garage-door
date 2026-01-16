const env = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // Security
  API_KEY: process.env.API_KEY,

  // Database
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_NAME: process.env.DB_NAME || 'a1_garage_dev',
  DB_NAME_TEST: process.env.DB_NAME_TEST || 'a1_garage_test',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_SSL: process.env.DB_SSL === 'true',

  // Database Pool
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX) || 10,
  DB_POOL_IDLE: parseInt(process.env.DB_POOL_IDLE) || 10000,
  DB_POOL_ACQUIRE: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,

  // Redis
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0'),
  REDIS_QUEUE_DB: parseInt(process.env.REDIS_QUEUE_DB || '1'),

  // Workers
  ENABLE_QUEUE_WORKERS: process.env.ENABLE_QUEUE_WORKERS,

  // ServiceTitan Integration
  SERVICETITAN_API_URL: process.env.SERVICETITAN_API_URL,
  SERVICETITAN_API_KEY: process.env.SERVICETITAN_API_KEY,
  SERVICETITAN_TENANT_ID: process.env.SERVICETITAN_TENANT_ID,
  SERVICETITAN_APP_KEY: process.env.SERVICETITAN_APP_KEY,

  // SchedulingPro Integration
  SCHEDULINGPRO_API_URL: process.env.SCHEDULINGPRO_API_URL,
  SCHEDULINGPRO_API_KEY: process.env.SCHEDULINGPRO_API_KEY,
  SCHEDULINGPRO_TENANT_ID: process.env.SCHEDULINGPRO_TENANT_ID,

  // Scheduling Configuration
  SCHEDULING_CACHE_TTL_MINUTES: parseInt(process.env.SCHEDULING_CACHE_TTL_MINUTES) || 10,
  SCHEDULING_RESERVATION_TIMEOUT_MINUTES: parseInt(process.env.SCHEDULING_RESERVATION_TIMEOUT_MINUTES) || 15,
  SCHEDULING_AUTO_CONFIRM_SLOTS: process.env.SCHEDULING_AUTO_CONFIRM_SLOTS === 'true' || true,
};

module.exports = env;
