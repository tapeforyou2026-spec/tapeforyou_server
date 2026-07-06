'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admins', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      avatar: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING(15), allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      last_login: { type: Sequelize.DATE, allowNull: true },
      is_super_admin: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('admins'); },
};
