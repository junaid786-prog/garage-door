'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bookings', 'service_titan_job_number', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'ServiceTitan job number (e.g., JOB-001234)'
    });

    await queryInterface.addColumn('bookings', 'service_titan_status', {
      type: Sequelize.ENUM('scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled', 'failed', 'error'),
      allowNull: true,
      comment: 'Current status of the ServiceTitan job'
    });

    await queryInterface.addColumn('bookings', 'service_titan_error', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Error message if ServiceTitan integration failed'
    });

  },

  async down(queryInterface, Sequelize) {
    // Remove columns
    await queryInterface.removeColumn('bookings', 'service_titan_error');
    await queryInterface.removeColumn('bookings', 'service_titan_status');
    await queryInterface.removeColumn('bookings', 'service_titan_job_number');
  }
};
