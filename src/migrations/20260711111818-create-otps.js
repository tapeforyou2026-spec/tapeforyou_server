'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('otps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      phone: { type: Sequelize.STRING(15), allowNull: false },
      otp_hash: { type: Sequelize.STRING, allowNull: false },
      purpose: { type: Sequelize.ENUM('verify_mobile', 'reset_password'), allowNull: false },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_used: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('otps', ['user_id', 'purpose']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('otps');
  },
};
