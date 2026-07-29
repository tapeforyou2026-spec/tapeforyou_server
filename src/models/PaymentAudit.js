// High-frequency system-level payment events (every verify/webhook call) —
// deliberately separate from the existing ActivityLog table, which stays
// reserved for admin-initiated actions (refund, manual retry). See
// PAYMENT_DOCUMENTATION.md Part 5 for the reasoning.
module.exports = (sequelize, DataTypes) => sequelize.define('PaymentAudit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: false },
  actor_id: { type: DataTypes.INTEGER, allowNull: true },
  actor_type: { type: DataTypes.ENUM('admin', 'user', 'system'), defaultValue: 'system' },
  action: { type: DataTypes.STRING(100), allowNull: false },
  old_values: { type: DataTypes.JSONB, allowNull: true },
  new_values: { type: DataTypes.JSONB, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
}, { tableName: 'payment_audit', timestamps: true, underscored: true, updatedAt: false });
