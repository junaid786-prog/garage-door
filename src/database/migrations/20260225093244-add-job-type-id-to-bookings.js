'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add service_titan_job_type_id column to bookings table
    await queryInterface.addColumn('bookings', 'service_titan_job_type_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'ServiceTitan job type ID - maps to service_titan_job_types.id',
      references: {
        model: 'service_titan_job_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // If job type is deleted, keep the booking but set this to NULL
    });

    // Add index for faster joins and lookups
    await queryInterface.addIndex('bookings', ['service_titan_job_type_id'], {
      name: 'bookings_service_titan_job_type_id_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('bookings', 'bookings_service_titan_job_type_id_idx');

    // Remove column
    await queryInterface.removeColumn('bookings', 'service_titan_job_type_id');
  },
};
