// Append-only timeline — powers the customer Order Timeline and the admin
// Payment Dashboard's detail view. Never updated after insert.
module.exports = (sequelize, DataTypes) => sequelize.define('PaymentStatusHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: false },
  from_status: { type: DataTypes.STRING(50), allowNull: true },
  to_status: { type: DataTypes.STRING(50), allowNull: false },
  trigger_source: { type: DataTypes.ENUM('redirect', 'webhook', 'cron', 'admin'), allowNull: false },
}, { tableName: 'payment_status_history', timestamps: true, underscored: true, updatedAt: false });
