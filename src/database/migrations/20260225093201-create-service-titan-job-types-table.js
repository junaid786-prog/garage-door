'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_titan_job_types', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: false,
        comment: 'ServiceTitan job type ID (provided by ServiceTitan)',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'ServiceTitan job type name',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this job type is currently active',
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

    // Index for searching by job type name
    await queryInterface.addIndex('service_titan_job_types', ['name'], {
      name: 'service_titan_job_types_name_idx',
    });

    // Index for filtering active job types
    await queryInterface.addIndex('service_titan_job_types', ['is_active'], {
      name: 'service_titan_job_types_is_active_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('service_titan_job_types');
  },
};
