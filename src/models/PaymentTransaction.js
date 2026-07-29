module.exports = (sequelize, DataTypes) => sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: false },
  txn_id: { type: DataTypes.STRING(150), allowNull: true },
  txn_uuid: { type: DataTypes.STRING(150), allowNull: true },
  hdfc_status: { type: DataTypes.STRING(50), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  raw_response: { type: DataTypes.JSONB, allowNull: true },
}, { tableName: 'payment_transactions', timestamps: true, underscored: true, updatedAt: false });
