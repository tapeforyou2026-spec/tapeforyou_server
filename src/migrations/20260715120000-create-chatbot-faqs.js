'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chatbot_faqs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      question: { type: Sequelize.STRING(300), allowNull: false },
      answer: { type: Sequelize.TEXT, allowNull: false },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('chatbot_faqs', ['status', 'sort_order']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('chatbot_faqs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_chatbot_faqs_status";');
  },
};
