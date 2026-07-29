'use strict';

// New, structured (decimal grams) weight fields — separate from the existing
// free-text `weight` column (e.g. "500 gram", "9-9.5 KG"), which is kept
// as-is since it's still referenced elsewhere. net_weight/gross_weight are
// numeric specifically so they can eventually be used for real shipping
// weight calculations (ShippingService.js currently can't parse the old
// free-text field at all).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('product_variants', 'net_weight', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('product_variants', 'gross_weight', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('product_variants', 'net_weight');
    await queryInterface.removeColumn('product_variants', 'gross_weight');
  },
};
