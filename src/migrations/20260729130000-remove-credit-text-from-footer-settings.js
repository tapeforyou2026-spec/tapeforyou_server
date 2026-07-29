'use strict';

// Per explicit request, the "Created by ..." footer credit line is static
// (not admin-editable) — removing the column rather than just hiding the
// admin field, since nothing would ever read/write it otherwise.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeColumn('footer_settings', 'credit_text');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('footer_settings', 'credit_text', { type: Sequelize.STRING(200), allowNull: true });
  },
};
