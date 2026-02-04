'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('error_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      error_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Type of error (e.g., BOOKING_FAILED, EXTERNAL_API_ERROR)',
      },
      operation: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Operation that failed (e.g., createBooking, createServiceTitanJob)',
      },
      service_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'External service name if applicable (e.g., ServiceTitan, SchedulingPro)',
      },
      context: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Error context data (sanitized, no PII)',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Error message (sanitized)',
      },
      error_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Error code if available',
      },
      stack_trace: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Stack trace (sanitized file paths)',
      },
      retryable: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this error is retryable',
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of retry attempts made',
      },
      resolved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the error has been resolved',
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the error was resolved',
      },
      resolved_by: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'How the error was resolved (manual, auto-retry, etc.)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index for finding unresolved errors
    await queryInterface.addIndex('error_logs', ['resolved', 'created_at'], {
      name: 'error_logs_unresolved_idx',
    });

    // Index for finding errors by operation
    await queryInterface.addIndex('error_logs', ['operation', 'created_at'], {
      name: 'error_logs_operation_idx',
    });

    // Index for finding errors by service
    await queryInterface.addIndex('error_logs', ['service_name', 'created_at'], {
      name: 'error_logs_service_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('error_logs');
  },
};
