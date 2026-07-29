module.exports = (sequelize, DataTypes) => sequelize.define('RefundTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  refund_id: { type: DataTypes.INTEGER, allowNull: false },
  raw_response: { type: DataTypes.JSONB, allowNull: false },
  status: { type: DataTypes.STRING(50), allowNull: false },
}, { tableName: 'refund_transactions', timestamps: true, underscored: true, updatedAt: false });
