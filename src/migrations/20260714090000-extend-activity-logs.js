'use strict';

// Additive only — the original `activity_logs` table (created in
// 20260101000007-create-orders.js) already had actor_id/actor_type/action/
// model/model_id/description/old_values/new_values/ip_address/user_agent.
// This adds what the full Activity Logs / Audit Trail module needs on top,
// without touching any existing column: denormalized actor identity (so a
// log still reads correctly even if the admin who did it is later deleted),
// parsed browser/os/device (raw `user_agent` stays as-is for reference),
// a success/failed status, and a full JSON snapshot for "record was deleted
// but the log must still show everything" (see ActivityLogService).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('activity_logs', 'actor_name', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('activity_logs', 'actor_email', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('activity_logs', 'actor_role', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('activity_logs', 'browser', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('activity_logs', 'os', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('activity_logs', 'device', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('activity_logs', 'status', {
      type: Sequelize.ENUM('success', 'failed'),
      allowNull: false,
      defaultValue: 'success',
    });
    await queryInterface.addColumn('activity_logs', 'snapshot', { type: Sequelize.JSONB, allowNull: true });

    // Every filter this module exposes (user, module, action, status, date
    // range) hits one of these columns — indexed for pagination/filtering
    // to stay fast as the table grows (see "Performance" requirement).
    await queryInterface.addIndex('activity_logs', ['actor_id']);
    await queryInterface.addIndex('activity_logs', ['model']);
    await queryInterface.addIndex('activity_logs', ['action']);
    await queryInterface.addIndex('activity_logs', ['status']);
    await queryInterface.addIndex('activity_logs', ['created_at']);
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('activity_logs', ['actor_id']);
    await queryInterface.removeIndex('activity_logs', ['model']);
    await queryInterface.removeIndex('activity_logs', ['action']);
    await queryInterface.removeIndex('activity_logs', ['status']);
    await queryInterface.removeIndex('activity_logs', ['created_at']);
    await queryInterface.removeColumn('activity_logs', 'actor_name');
    await queryInterface.removeColumn('activity_logs', 'actor_email');
    await queryInterface.removeColumn('activity_logs', 'actor_role');
    await queryInterface.removeColumn('activity_logs', 'browser');
    await queryInterface.removeColumn('activity_logs', 'os');
    await queryInterface.removeColumn('activity_logs', 'device');
    await queryInterface.removeColumn('activity_logs', 'status');
    await queryInterface.removeColumn('activity_logs', 'snapshot');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_activity_logs_status";');
  },
};
