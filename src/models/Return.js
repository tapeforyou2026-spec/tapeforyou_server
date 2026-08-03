module.exports = (sequelize, DataTypes) => sequelize.define('Return', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('requested', 'approved', 'rejected', 'refunded'), defaultValue: 'requested' },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  admin_note: { type: DataTypes.STRING(500), allowNull: true },
  refund_id: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  refunded_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'returns', timestamps: true, underscored: true });
