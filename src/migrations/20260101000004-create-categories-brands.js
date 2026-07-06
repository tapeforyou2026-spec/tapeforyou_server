'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.STRING, allowNull: true },
      parent_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'categories', key: 'id' }, onDelete: 'SET NULL' },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      seo_title: { type: Sequelize.STRING(200), allowNull: true },
      seo_description: { type: Sequelize.TEXT, allowNull: true },
      seo_keywords: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.createTable('brands', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      logo: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('brands');
    await queryInterface.dropTable('categories');
  },
};
