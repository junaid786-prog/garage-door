'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bookings', 'service_titan_customer_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'ServiceTitan customer ID returned by the integration service',
    });

    await queryInterface.addColumn('bookings', 'service_titan_appointment_number', {
      type: Sequelize.STRING(30),
      allowNull: true,
      comment: 'ServiceTitan appointment number returned by the integration service (e.g., 2631242700-2)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('bookings', 'service_titan_appointment_number');
    await queryInterface.removeColumn('bookings', 'service_titan_customer_id');
  },
};
