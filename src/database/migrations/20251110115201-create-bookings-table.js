'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      
      // Service fields
      service_type: {
        type: Sequelize.ENUM('repair', 'replacement'),
        allowNull: false
      },
      service_symptom: {
        type: Sequelize.ENUM('wont_open', 'wont_close', 'spring_bang', 'tune_up', 'other'),
        allowNull: false
      },
      can_open_close: {
        type: Sequelize.ENUM('yes', 'no', 'partial'),
        allowNull: false
      },
      
      // Door fields
      door_age_bucket: {
        type: Sequelize.ENUM('lt_8', 'gte_8'),
        allowNull: false
      },
      door_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          isIn: [[1, 2]]
        }
      },
      
      // Replacement preference (nullable)
      replacement_pref: {
        type: Sequelize.ENUM('basic', 'nicer'),
        allowNull: true
      },
      
      // Address fields
      street: {
        type: Sequelize.STRING,
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false
      },
      zip: {
        type: Sequelize.STRING,
        allowNull: false
      },
      
      // Occupancy fields
      occupancy_type: {
        type: Sequelize.ENUM('homeowner', 'renter', 'pm', 'unknown'),
        allowNull: false,
        defaultValue: 'unknown'
      },
      renter_permission: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      
      // Contact fields
      phone_e164: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contact_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Scheduling fields
      slot_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      asap_selected: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      priority_score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      
      // Additional notes
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      suspected_issue: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Booking status
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      
      // External system IDs
      service_titan_job_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scheduling_pro_job_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Timestamps
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('bookings', ['phone_e164']);
    await queryInterface.addIndex('bookings', ['zip']);
    await queryInterface.addIndex('bookings', ['status']);
    await queryInterface.addIndex('bookings', ['created_at']);
    
    // Unique index for ServiceTitan job ID when not null
    await queryInterface.addIndex('bookings', {
      fields: ['service_titan_job_id'],
      unique: true,
      where: {
        service_titan_job_id: {
          [Sequelize.Op.ne]: null
        }
      },
      name: 'bookings_service_titan_job_id_unique'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('bookings', ['phone_e164']);
    await queryInterface.removeIndex('bookings', ['zip']);
    await queryInterface.removeIndex('bookings', ['status']);
    await queryInterface.removeIndex('bookings', ['created_at']);
    await queryInterface.removeIndex('bookings', 'bookings_service_titan_job_id_unique');
    
    // Drop the table
    await queryInterface.dropTable('bookings');
  }
};
