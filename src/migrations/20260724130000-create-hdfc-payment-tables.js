'use strict';

// HDFC SmartGateway payment module — additive only. See
// PAYMENT_DOCUMENTATION.md and src/services/hdfc/claude.md for the full
// design. Nothing existing is renamed or dropped; `payments` only gains
// nullable columns so historical Razorpay rows need no backfill.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Postgres enums are strict — the JS-level PAYMENT_METHOD.HDFC constant
    // alone isn't enough, same lesson already learned once for
    // enum_otps_purpose (see 20260722120000-add-login-to-otp-purpose-enum.js).
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_orders_payment_method\" ADD VALUE IF NOT EXISTS 'hdfc';"
    );

    // --- Additive columns on the existing `payments` table ---
    await queryInterface.addColumn('payments', 'gateway', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('payments', 'hdfc_order_id', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('payments', 'idempotency_key', { type: Sequelize.STRING(64), allowNull: true, unique: true });

    // --- payment_sessions ---
    await queryInterface.createTable('payment_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      session_id: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      redirect_url: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('created', 'active', 'expired', 'superseded', 'consumed'), allowNull: false, defaultValue: 'created' },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('payment_sessions', ['payment_id', 'status']);

    // --- payment_transactions (HDFC's own txn_id/txn_uuid granularity) ---
    await queryInterface.createTable('payment_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      txn_id: { type: Sequelize.STRING(150), allowNull: true },
      txn_uuid: { type: Sequelize.STRING(150), allowNull: true },
      hdfc_status: { type: Sequelize.STRING(50), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      raw_response: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('payment_transactions', ['payment_id']);
    await queryInterface.addIndex('payment_transactions', ['txn_id']);

    // --- payment_logs (every outbound/inbound HDFC API call) ---
    await queryInterface.createTable('payment_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      direction: { type: Sequelize.ENUM('outbound', 'inbound'), allowNull: false },
      endpoint: { type: Sequelize.STRING(200), allowNull: false },
      http_status: { type: Sequelize.INTEGER, allowNull: true },
      request_body: { type: Sequelize.JSONB, allowNull: true },
      response_body: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('payment_logs', ['payment_id', 'created_at']);

    // --- payment_webhooks (event_id uniqueness is the real dedup mechanism) ---
    await queryInterface.createTable('payment_webhooks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      event_id: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      event_name: { type: Sequelize.STRING(100), allowNull: false },
      raw_payload: { type: Sequelize.JSONB, allowNull: false },
      processed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      processed_at: { type: Sequelize.DATE, allowNull: true },
    });

    // --- refunds (one row per refund request — unique_request_id matches
    // HDFC's own max-21-char uniqueness rule exactly) ---
    await queryInterface.createTable('refunds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      unique_request_id: { type: Sequelize.STRING(21), allowNull: false, unique: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: { type: Sequelize.ENUM('pending', 'success', 'failed'), allowNull: false, defaultValue: 'pending' },
      hdfc_refund_id: { type: Sequelize.STRING(100), allowNull: true },
      error_code: { type: Sequelize.STRING(50), allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      initiated_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'admins', key: 'id' }, onDelete: 'RESTRICT' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('refunds', ['payment_id']);

    // --- refund_transactions (raw gateway responses per refund attempt) ---
    await queryInterface.createTable('refund_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      refund_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'refunds', key: 'id' }, onDelete: 'RESTRICT' },
      raw_response: { type: Sequelize.JSONB, allowNull: false },
      status: { type: Sequelize.STRING(50), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // --- payment_status_history (append-only timeline) ---
    await queryInterface.createTable('payment_status_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      from_status: { type: Sequelize.STRING(50), allowNull: true },
      to_status: { type: Sequelize.STRING(50), allowNull: false },
      trigger_source: { type: Sequelize.ENUM('redirect', 'webhook', 'cron', 'admin'), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('payment_status_history', ['payment_id', 'created_at']);

    // --- payment_audit (high-frequency system events — see
    // PAYMENT_DOCUMENTATION.md Part 5 for why this is separate from the
    // existing activity_logs table) ---
    await queryInterface.createTable('payment_audit', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'RESTRICT' },
      actor_id: { type: Sequelize.INTEGER, allowNull: true },
      actor_type: { type: Sequelize.ENUM('admin', 'user', 'system'), allowNull: false, defaultValue: 'system' },
      action: { type: Sequelize.STRING(100), allowNull: false },
      old_values: { type: Sequelize.JSONB, allowNull: true },
      new_values: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('payment_audit');
    await queryInterface.dropTable('payment_status_history');
    await queryInterface.dropTable('refund_transactions');
    await queryInterface.dropTable('refunds');
    await queryInterface.dropTable('payment_webhooks');
    await queryInterface.dropTable('payment_logs');
    await queryInterface.dropTable('payment_transactions');
    await queryInterface.dropTable('payment_sessions');
    await queryInterface.removeColumn('payments', 'idempotency_key');
    await queryInterface.removeColumn('payments', 'hdfc_order_id');
    await queryInterface.removeColumn('payments', 'gateway');
    // Postgres doesn't support removing an enum value — 'hdfc' stays in
    // enum_orders_payment_method even on down(), same accepted limitation as
    // the earlier enum_otps_purpose 'login' migration.
  },
};
