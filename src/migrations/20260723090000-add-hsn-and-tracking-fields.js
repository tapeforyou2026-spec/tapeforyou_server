'use strict';

// Two independent additions bundled in one migration:
// 1. order_items.hsn_code — was never captured at order-creation time even
//    though Product.hsn_code exists, so every Bigship shipment payload sent
//    an empty HSN field (services/bigship/BigshipService.js's
//    buildB2cOrderPayload reads item.hsn_code).
// 2. shipments.courier_status_raw / tracking_response / last_tracked_at —
//    support columns for the new tracking-sync feature (BigshipService.
//    syncShipmentStatus). tracking_response keeps the full raw Bigship
//    payload since no sandbox/sample response was available to hand-derive
//    an exact field mapping from — courier_status_raw is a best-effort
//    human-readable string extracted from it for the admin UI.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('order_items', 'hsn_code', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('shipments', 'courier_status_raw', { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.addColumn('shipments', 'tracking_response', { type: Sequelize.JSONB, allowNull: true });
    await queryInterface.addColumn('shipments', 'last_tracked_at', { type: Sequelize.DATE, allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('order_items', 'hsn_code');
    await queryInterface.removeColumn('shipments', 'courier_status_raw');
    await queryInterface.removeColumn('shipments', 'tracking_response');
    await queryInterface.removeColumn('shipments', 'last_tracked_at');
  },
};
