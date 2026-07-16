'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::int AS count FROM users WHERE phone IS NULL'
    );
    if (rows[0].count > 0) {
      throw new Error(
        `Cannot make "phone" NOT NULL: ${rows[0].count} existing user(s) have no phone number on file. ` +
        'Backfill those rows before running this migration.'
      );
    }
    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING(15),
      allowNull: false,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING(15),
      allowNull: true,
    });
  },
};
