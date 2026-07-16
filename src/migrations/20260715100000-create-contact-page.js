'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contact_page', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      hero_label: { type: Sequelize.STRING(100), defaultValue: 'Reach Out' },
      hero_heading: { type: Sequelize.STRING(150), defaultValue: 'Get in Touch' },
      hero_description: { type: Sequelize.STRING(300), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      address: { type: Sequelize.STRING(300), allowNull: true },
      bulk_heading: { type: Sequelize.STRING(100), defaultValue: 'Bulk Orders?' },
      bulk_description: { type: Sequelize.STRING(300), allowNull: true },
      bulk_email: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('contact_page');
  },
};
