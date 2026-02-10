const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const Booking = sequelize.define(
  'Booking',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Service fields
    serviceType: {
      type: DataTypes.ENUM('repair', 'replacement'),
      allowNull: false,
      field: 'service_type',
    },
    serviceSymptom: {
      type: DataTypes.ENUM('wont_open', 'wont_close', 'spring_bang', 'tune_up', 'other'),
      allowNull: false,
      field: 'service_symptom',
    },
    canOpenClose: {
      type: DataTypes.ENUM('yes', 'no', 'partial'),
      allowNull: false,
      field: 'can_open_close',
    },

    // Door fields
    doorAgeBucket: {
      type: DataTypes.ENUM('lt_8', 'gte_8'),
      allowNull: false,
      field: 'door_age_bucket',
    },
    doorCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isIn: [[1, 2, 3]], // Accept 1, 2, or 3 doors
      },
      field: 'door_count',
    },

    // Replacement preference (nullable)
    replacementPref: {
      type: DataTypes.ENUM('basic', 'nicer'),
      allowNull: true,
      field: 'replacement_pref',
    },

    // Address fields
    street: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zip: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Occupancy fields
    occupancyType: {
      type: DataTypes.ENUM('homeowner', 'renter', 'pm', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      field: 'occupancy_type',
    },
    renterPermission: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'renter_permission',
    },

    // Contact fields
    phoneE164: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isPhoneNumber(value) {
          if (!/^\+[1-9]\d{1,14}$/.test(value)) {
            throw new Error('Phone number must be in E.164 format');
          }
        },
      },
      field: 'phone_e164',
    },
    contactName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_name',
    },

    // Scheduling fields
    // NOTE: slot_id has a unique constraint for non-cancelled bookings
    // This prevents double-booking at the database level
    slotId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'slot_id',
    },
    asapSelected: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'asap_selected',
    },
    priorityScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'priority_score',
    },

    // Additional notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    suspectedIssue: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'suspected_issue',
    },

    // Booking status
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },

    // External system IDs and status
    serviceTitanJobId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'service_titan_job_id',
    },
    serviceTitanJobNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'service_titan_job_number',
    },
    serviceTitanStatus: {
      type: DataTypes.ENUM(
        'scheduled',
        'dispatched',
        'in_progress',
        'completed',
        'cancelled',
        'failed',
        'error'
      ),
      allowNull: true,
      field: 'service_titan_status',
    },
    serviceTitanError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'service_titan_error',
    },
    schedulingProJobId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'scheduling_pro_job_id',
    },
  },
  {
    tableName: 'bookings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['phone_e164'],
      },
      {
        fields: ['zip'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['service_titan_job_id'],
        unique: true,
        where: {
          service_titan_job_id: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
      {
        // Unique constraint on slot_id for active bookings (prevents double-booking)
        // Cancelled bookings are excluded since cancelled slots can be reused
        name: 'bookings_slot_id_active_unique',
        fields: ['slot_id'],
        unique: true,
        where: {
          slot_id: {
            [sequelize.Sequelize.Op.ne]: null,
          },
          status: {
            [sequelize.Sequelize.Op.ne]: 'cancelled',
          },
        },
      },
      {
        fields: ['created_at'],
      },
    ],
    validate: {
      renterPermissionRequired() {
        if (this.occupancyType === 'renter' && this.renterPermission === null) {
          throw new Error('Renter permission is required when occupancy type is renter');
        }
      },
    },
  }
);

module.exports = Booking;
