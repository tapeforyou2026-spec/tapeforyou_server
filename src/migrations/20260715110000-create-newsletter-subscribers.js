'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('newsletter_subscribers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      status: { type: Sequelize.ENUM('subscribed', 'unsubscribed'), defaultValue: 'subscribed' },
      subscribed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('newsletter_subscribers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_newsletter_subscribers_status";');
  },
};
