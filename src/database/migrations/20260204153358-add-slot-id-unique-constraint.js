'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add partial unique index on slot_id
    // This prevents double-booking by ensuring one active booking per slot
    // Excludes cancelled bookings since cancelled slots can be reused
    await queryInterface.addIndex('bookings', {
      fields: ['slot_id'],
      unique: true,
      where: {
        slot_id: {
          [Sequelize.Op.ne]: null,
        },
        status: {
          [Sequelize.Op.ne]: 'cancelled',
        },
      },
      name: 'bookings_slot_id_active_unique',
    });

    console.log('✓ Added unique constraint on slot_id for active bookings');
  },

  async down(queryInterface, Sequelize) {
    // Remove the unique index
    await queryInterface.removeIndex('bookings', 'bookings_slot_id_active_unique');

    console.log('✓ Removed unique constraint on slot_id');
  },
};
