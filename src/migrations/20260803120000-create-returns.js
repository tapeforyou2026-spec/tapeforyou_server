'use strict';

// Order Return Flow — additive only. See the analysis conversation for the
// full design ("whole order only" scope, 7-day return window). Nothing
// existing is renamed or dropped.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('returns', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      // One return request per order — whole-order-only scope (see claude.md
      // decision). A rejected request is terminal; the customer would need
      // to contact support for anything further, matching this project's
      // existing "no re-cancel after cancel" precedent.
      order_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      status: { type: Sequelize.ENUM('requested', 'approved', 'rejected', 'refunded'), allowNull: false, defaultValue: 'requested' },
      reason: { type: Sequelize.STRING(500), allowNull: false },
      admin_note: { type: Sequelize.STRING(500), allowNull: true },
      // Nullable FK to the existing `refunds` table — only set once an HDFC
      // refund is actually initiated (RazorpayService/HDFC refund reuse, not
      // a new refund mechanism).
      refund_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'refunds', key: 'id' }, onDelete: 'SET NULL' },
      reviewed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'admins', key: 'id' }, onDelete: 'SET NULL' },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      refunded_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('returns', ['status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('returns');
  },
};
