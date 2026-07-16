'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chatbot_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      customer_name: { type: Sequelize.STRING(150), allowNull: true },
      customer_email: { type: Sequelize.STRING(150), allowNull: true },
      guest_id: { type: Sequelize.STRING(64), allowNull: true },
      question: { type: Sequelize.TEXT, allowNull: false },
      answer: { type: Sequelize.TEXT, allowNull: true },
      matched: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('chatbot_logs', ['customer_id']);
    await queryInterface.addIndex('chatbot_logs', ['guest_id']);
    await queryInterface.addIndex('chatbot_logs', ['created_at']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('chatbot_logs');
  },
};
