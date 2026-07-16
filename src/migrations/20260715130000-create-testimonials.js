'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('testimonials', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      role: { type: Sequelize.STRING(150), allowNull: true },
      company: { type: Sequelize.STRING(150), allowNull: true },
      avatar: { type: Sequelize.STRING(500), allowNull: true },
      rating: { type: Sequelize.INTEGER, defaultValue: 5 },
      review: { type: Sequelize.TEXT, allowNull: false },
      product: { type: Sequelize.STRING(150), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('testimonials', ['status', 'sort_order']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('testimonials');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_testimonials_status";');
  },
};
