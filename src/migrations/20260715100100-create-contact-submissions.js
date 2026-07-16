'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contact_submissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      subject: { type: Sequelize.STRING(50), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.ENUM('new', 'read', 'replied'), defaultValue: 'new' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('contact_submissions', ['status', 'created_at']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('contact_submissions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contact_submissions_status";');
  },
};
