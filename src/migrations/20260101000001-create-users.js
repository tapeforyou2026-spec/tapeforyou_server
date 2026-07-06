'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(15), allowNull: true, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      avatar: { type: Sequelize.STRING, allowNull: true },
      email_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      email_verify_token: { type: Sequelize.STRING, allowNull: true },
      email_verify_expires: { type: Sequelize.DATE, allowNull: true },
      reset_password_token: { type: Sequelize.STRING, allowNull: true },
      reset_password_expires: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive', 'banned', 'pending'), defaultValue: 'active' },
      last_login: { type: Sequelize.DATE, allowNull: true },
      login_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  },
};
