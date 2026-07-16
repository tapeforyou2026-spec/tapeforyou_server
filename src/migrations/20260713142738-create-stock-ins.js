'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_ins', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      variant_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      supplier_name: { type: Sequelize.STRING(150), allowNull: true },
      expected_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('ordered', 'received', 'cancelled'), allowNull: false, defaultValue: 'ordered' },
      received_quantity: { type: Sequelize.INTEGER, allowNull: true },
      received_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('stock_ins', ['variant_id']);
    await queryInterface.addIndex('stock_ins', ['status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('stock_ins');
  },
};
