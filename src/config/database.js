require('dotenv').config();
const env = require('./env');

const config = {
  development: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: env.DB_SSL
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    },
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      idle: env.DB_POOL_IDLE,
      acquire: env.DB_POOL_ACQUIRE,
      evict: 1000,
    },
    logging: env.NODE_ENV === 'development' ? console.log : false,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: false,
    },
  },
  test: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME_TEST,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: false,
    },
  },
  production: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      idle: env.DB_POOL_IDLE,
      acquire: env.DB_POOL_ACQUIRE,
      evict: 1000,
    },
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: false,
    },
  },
};

module.exports = config[env.NODE_ENV];
module.exports.config = config;
