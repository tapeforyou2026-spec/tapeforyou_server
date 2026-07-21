'use strict';

// Additive only — existing shiprocket_* columns are untouched so historical
// shipments booked via Shiprocket keep working. See
// src/services/bigship/claude.md for why this integration is additive.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('shipments', 'bigship_custom_order_id', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('shipments', 'bigship_courier_id', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('shipments', 'bigship_courier_name', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('shipments', 'segment_type', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('shipments', 'invoice_uploaded', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('shipments', 'eway_bill_no', { type: Sequelize.STRING(50), allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('shipments', 'bigship_custom_order_id');
    await queryInterface.removeColumn('shipments', 'bigship_courier_id');
    await queryInterface.removeColumn('shipments', 'bigship_courier_name');
    await queryInterface.removeColumn('shipments', 'segment_type');
    await queryInterface.removeColumn('shipments', 'invoice_uploaded');
    await queryInterface.removeColumn('shipments', 'eway_bill_no');
  },
};
