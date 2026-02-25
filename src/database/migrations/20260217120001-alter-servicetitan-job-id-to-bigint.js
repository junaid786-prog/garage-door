'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE bookings ALTER COLUMN service_titan_job_id TYPE BIGINT USING service_titan_job_id::BIGINT'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE bookings ALTER COLUMN service_titan_job_id TYPE INTEGER USING service_titan_job_id::INTEGER'
    );
  },
};
