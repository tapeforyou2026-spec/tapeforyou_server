'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('login_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      identifier: { type: Sequelize.STRING(150), allowNull: false },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      device_info: { type: Sequelize.STRING(500), allowNull: true },
      success: { type: Sequelize.BOOLEAN, allowNull: false },
      failure_reason: { type: Sequelize.STRING(150), allowNull: true },
      logged_in_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      logged_out_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('login_history', ['user_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('login_history');
  },
};
