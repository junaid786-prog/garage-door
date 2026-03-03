'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('abandoned_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      // Contact info (required for ServiceTitan)
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      phone_e164: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      sms_opt_in: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      contact_pref: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      // Address (partial allowed)
      street: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      zip: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },

      // Campaign context
      utm_source: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      utm_medium: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      utm_campaign: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      utm_term: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      utm_content: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      campaign_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      flow_source: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      referrer: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // Booking context
      service_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      service_symptom: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      door_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      selected_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      selected_slot_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      // Abandonment tracking
      last_step_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      last_step_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      time_elapsed_ms: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      idle_time_ms: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      abandonment_reason: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'page_hide, idle_timeout, beforeunload',
      },

      // ServiceTitan integration
      servicetitan_booking_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      servicetitan_status: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'pending, success, failed',
      },
      servicetitan_error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sent_to_servicetitan_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // Timestamps
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for performance and queries
    await queryInterface.addIndex('abandoned_sessions', ['session_id']);
    await queryInterface.addIndex('abandoned_sessions', ['created_at']);
    await queryInterface.addIndex('abandoned_sessions', ['servicetitan_status']);
    await queryInterface.addIndex('abandoned_sessions', ['last_step_number']);
    await queryInterface.addIndex('abandoned_sessions', ['email']);
    await queryInterface.addIndex('abandoned_sessions', ['phone_e164']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('abandoned_sessions', ['session_id']);
    await queryInterface.removeIndex('abandoned_sessions', ['created_at']);
    await queryInterface.removeIndex('abandoned_sessions', ['servicetitan_status']);
    await queryInterface.removeIndex('abandoned_sessions', ['last_step_number']);
    await queryInterface.removeIndex('abandoned_sessions', ['email']);
    await queryInterface.removeIndex('abandoned_sessions', ['phone_e164']);

    // Drop the table
    await queryInterface.dropTable('abandoned_sessions');
  },
};
