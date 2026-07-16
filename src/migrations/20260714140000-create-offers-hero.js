'use strict';

// Singleton table (same pattern as about_page) — only the Offers page's top
// banner/hero. The actual deals grid below it stays computed from real
// product data (discount%, product count) and is untouched.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('offers_hero', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      badge_text: { type: Sequelize.STRING(100), defaultValue: 'Limited Time Deals' },
      heading_line1: { type: Sequelize.STRING(150), allowNull: false },
      heading_line2: { type: Sequelize.STRING(150), allowNull: true },
      subheading: { type: Sequelize.STRING(300), allowNull: true },
      desktop_image: { type: Sequelize.STRING(500), allowNull: true },
      mobile_image: { type: Sequelize.STRING(500), allowNull: true },
      coupon_label: { type: Sequelize.STRING(50), defaultValue: 'Extra Savings' },
      coupon_discount_text: { type: Sequelize.STRING(50), allowNull: true },
      coupon_code: { type: Sequelize.STRING(30), allowNull: true },
      shipping_stat_value: { type: Sequelize.STRING(30), defaultValue: 'Free' },
      shipping_stat_label: { type: Sequelize.STRING(50), defaultValue: 'Ship on ₹499+' },
      flash_sale_chip_text: { type: Sequelize.STRING(50), allowNull: true },
      iso_chip_text: { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('offers_hero');
  },
};
