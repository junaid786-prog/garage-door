const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const AbandonedSession = sequelize.define(
  'AbandonedSession',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'session_id',
    },

    // Contact info (required for ServiceTitan)
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_name',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phoneE164: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isPhoneNumber(value) {
          if (value && !/^\+?[1-9]\d{1,14}$/.test(value)) {
            throw new Error('Phone number must be in E.164 format (or close to it)');
          }
        },
      },
      field: 'phone_e164',
    },
    smsOptIn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'sms_opt_in',
    },
    contactPref: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'contact_pref',
    },

    // Address (partial allowed)
    street: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    zip: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // Campaign context
    utmSource: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utm_source',
    },
    utmMedium: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utm_medium',
    },
    utmCampaign: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'utm_campaign',
    },
    utmTerm: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'utm_term',
    },
    utmContent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'utm_content',
    },
    campaignId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'campaign_id',
    },
    flowSource: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'flow_source',
    },
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Booking context
    serviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'service_type',
    },
    serviceSymptom: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'service_symptom',
    },
    doorCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'door_count',
    },
    selectedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'selected_date',
    },
    selectedSlotId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'selected_slot_id',
    },

    // Abandonment tracking
    lastStepNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'last_step_number',
    },
    lastStepName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_step_name',
    },
    timeElapsedMs: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'time_elapsed_ms',
    },
    idleTimeMs: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'idle_time_ms',
    },
    abandonmentReason: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'abandonment_reason',
      validate: {
        isIn: [['page_hide', 'idle_timeout', 'beforeunload', 'unknown']],
      },
    },

    // ServiceTitan integration
    servicetitanBookingId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'servicetitan_booking_id',
    },
    servicetitanStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'servicetitan_status',
      validate: {
        isIn: [['pending', 'success', 'failed']],
      },
    },
    servicetitanError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'servicetitan_error',
    },
    sentToServicetitanAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_to_servicetitan_at',
    },
  },
  {
    tableName: 'abandoned_sessions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

module.exports = AbandonedSession;
