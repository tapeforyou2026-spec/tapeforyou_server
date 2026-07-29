// unique_request_id max length (21) matches HDFC's own documented constraint
// exactly — see PAYMENT_DOCUMENTATION.md Part 5.
module.exports = (sequelize, DataTypes) => sequelize.define('Refund', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: false },
  unique_request_id: { type: DataTypes.STRING(21), allowNull: false, unique: true },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'success', 'failed'), defaultValue: 'pending' },
  hdfc_refund_id: { type: DataTypes.STRING(100), allowNull: true },
  error_code: { type: DataTypes.STRING(50), allowNull: true },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  initiated_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'refunds', timestamps: true, underscored: true });
