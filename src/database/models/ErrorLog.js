const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

/**
 * ErrorLog Model
 * Stores failed operations for manual review and retry
 */
const ErrorLog = sequelize.define(
  'ErrorLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    errorType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'error_type',
      comment: 'Type of error (e.g., BOOKING_FAILED, EXTERNAL_API_ERROR)',
    },
    operation: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Operation that failed (e.g., createBooking, createServiceTitanJob)',
    },
    serviceName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'service_name',
      comment: 'External service name if applicable',
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Error context data (sanitized, no PII)',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'error_message',
      comment: 'Error message (sanitized)',
    },
    errorCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'error_code',
      comment: 'Error code if available',
    },
    stackTrace: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'stack_trace',
      comment: 'Stack trace (sanitized file paths)',
    },
    retryable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this error is retryable',
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'retry_count',
      comment: 'Number of retry attempts made',
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the error has been resolved',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
      comment: 'When the error was resolved',
    },
    resolvedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'resolved_by',
      comment: 'How the error was resolved',
    },
  },
  {
    tableName: 'error_logs',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        name: 'error_logs_unresolved_idx',
        fields: ['resolved', 'created_at'],
      },
      {
        name: 'error_logs_operation_idx',
        fields: ['operation', 'created_at'],
      },
      {
        name: 'error_logs_service_idx',
        fields: ['service_name', 'created_at'],
      },
    ],
  }
);

module.exports = ErrorLog;
