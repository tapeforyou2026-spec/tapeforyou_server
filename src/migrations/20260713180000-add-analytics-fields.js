'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'view_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });

    // Nullable + no default: an order with no attributable first-touch
    // source (e.g. placed before this column existed) stays NULL rather than
    // being miscounted as "direct".
    await queryInterface.addColumn('orders', 'traffic_source', {
      type: Sequelize.ENUM('direct', 'organic', 'social', 'referral', 'paid', 'email', 'other'),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'view_count');
    await queryInterface.removeColumn('orders', 'traffic_source');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_traffic_source";');
  },
};
