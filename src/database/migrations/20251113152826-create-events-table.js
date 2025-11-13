'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('events', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Event name/type (e.g., step_viewed, form_submitted)',
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Frontend session identifier',
      },
      properties: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Flexible event properties as JSON',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser user agent string',
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
        comment: 'Client IP address',
      },
      referrer: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'HTTP referer URL',
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Current page URL when event occurred',
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Event occurrence timestamp',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for common query patterns
    await queryInterface.addIndex('events', ['name'], {
      name: 'idx_events_name',
    });

    await queryInterface.addIndex('events', ['session_id'], {
      name: 'idx_events_session_id',
    });

    await queryInterface.addIndex('events', ['timestamp'], {
      name: 'idx_events_timestamp',
    });

    await queryInterface.addIndex('events', ['created_at'], {
      name: 'idx_events_created_at',
    });

    // JSONB GIN index for efficient property queries
    await queryInterface.addIndex('events', ['properties'], {
      using: 'gin',
      name: 'idx_events_properties_gin',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('events');
  },
};
