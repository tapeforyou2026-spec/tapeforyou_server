'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hero_slides', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      heading_line1: { type: Sequelize.STRING(150), allowNull: false },
      heading_line2: { type: Sequelize.STRING(150), allowNull: true },
      colored_line: { type: Sequelize.INTEGER, defaultValue: 1, comment: '0 = heading_line1 is the accent-colored line, 1 = heading_line2' },
      description_line1: { type: Sequelize.STRING(300), allowNull: false },
      description_line2: { type: Sequelize.STRING(300), allowNull: true },
      desktop_image: { type: Sequelize.STRING(500), allowNull: true },
      mobile_image: { type: Sequelize.STRING(500), allowNull: true },
      offer_label: { type: Sequelize.STRING(50), allowNull: true },
      offer_discount: { type: Sequelize.STRING(30), allowNull: true },
      offer_context_line1: { type: Sequelize.STRING(50), allowNull: true },
      offer_context_line2: { type: Sequelize.STRING(50), allowNull: true },
      coupon_code: { type: Sequelize.STRING(30), allowNull: true },
      button_text: { type: Sequelize.STRING(50), defaultValue: 'Shop Now' },
      button_link: { type: Sequelize.STRING(200), defaultValue: '/shop' },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('hero_slides', ['status', 'sort_order']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('hero_slides');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hero_slides_status";');
  },
};
