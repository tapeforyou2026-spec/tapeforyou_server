'use strict';

// Singleton table — always exactly one row, same pattern as a settings
// table. `stats` and `values` are small, fixed-shape repeating lists
// (4 items, 3 items) that don't warrant their own tables/CRUD endpoints;
// stored as JSONB and edited via a dynamic list in the admin form instead.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('about_page', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      hero_label: { type: Sequelize.STRING(100), defaultValue: 'Our Story' },
      hero_heading: { type: Sequelize.STRING(200), allowNull: false },
      hero_paragraph1: { type: Sequelize.TEXT, allowNull: true },
      hero_paragraph2: { type: Sequelize.TEXT, allowNull: true },
      hero_image: { type: Sequelize.STRING(500), allowNull: true },
      hero_button_text: { type: Sequelize.STRING(50), defaultValue: 'Shop Our Products' },
      hero_button_link: { type: Sequelize.STRING(200), defaultValue: '/shop' },
      vision_label: { type: Sequelize.STRING(100), defaultValue: 'Who We Are' },
      vision_subheading: { type: Sequelize.STRING(200), allowNull: true },
      vision_title: { type: Sequelize.STRING(300), allowNull: true },
      vision_body: { type: Sequelize.TEXT, allowNull: true },
      mission_title: { type: Sequelize.STRING(300), allowNull: true },
      mission_body: { type: Sequelize.TEXT, allowNull: true },
      values_label: { type: Sequelize.STRING(100), defaultValue: 'What We Stand For' },
      values_heading: { type: Sequelize.STRING(100), defaultValue: 'Our Values' },
      stats: { type: Sequelize.JSONB, defaultValue: [] },
      values: { type: Sequelize.JSONB, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('about_page');
  },
};
