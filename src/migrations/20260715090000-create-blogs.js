'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('blogs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      slug: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      excerpt: { type: Sequelize.TEXT, allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: true, comment: 'HTML string, rendered via dangerouslySetInnerHTML on the frontend' },
      image: { type: Sequelize.STRING(500), allowNull: true },
      category: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'Guides' },
      author_name: { type: Sequelize.STRING(150), defaultValue: 'Tapes For You Team' },
      author_avatar: { type: Sequelize.STRING(500), allowNull: true },
      published_date: { type: Sequelize.DATEONLY, allowNull: false },
      read_time: { type: Sequelize.STRING(30), defaultValue: '5 min read' },
      tags: { type: Sequelize.JSONB, defaultValue: [] },
      seo_title: { type: Sequelize.STRING(255), allowNull: true },
      seo_description: { type: Sequelize.STRING(500), allowNull: true },
      seo_keywords: { type: Sequelize.JSONB, defaultValue: [] },
      status: { type: Sequelize.ENUM('published', 'draft'), defaultValue: 'published' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('blogs', ['status', 'published_date']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('blogs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_blogs_status";');
  },
};
