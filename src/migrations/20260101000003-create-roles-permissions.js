'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false },
      slug: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.createTable('permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      module: { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.createTable('role_permissions', {
      role_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE' },
      permission_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'permissions', key: 'id' }, onDelete: 'CASCADE' },
    });
    await queryInterface.createTable('admin_roles', {
      admin_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'admins', key: 'id' }, onDelete: 'CASCADE' },
      role_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE' },
    });
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      is_revoked: { type: Sequelize.BOOLEAN, defaultValue: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      device_info: { type: Sequelize.STRING(500), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('admin_roles');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('roles');
  },
};
