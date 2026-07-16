'use strict';

// Postgres requires new enum values added one at a time, and (in older PG
// versions) outside a transaction block — sequelize-cli's default migration
// runner does not wrap `up`/`down` in a transaction unless the migration
// opts in, so this runs as plain sequential statements.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'low_stock'`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'return'`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'review'`);
  },
  down: async () => {
    // Postgres cannot drop a single enum value without recreating the type
    // and every column/dependency using it — not worth the risk for a
    // reversible-in-theory-only migration. No-op down.
  },
};
