module.exports = (sequelize, DataTypes) => sequelize.define('LoginHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  identifier: { type: DataTypes.STRING(150), allowNull: false },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  device_info: { type: DataTypes.STRING(500), allowNull: true },
  success: { type: DataTypes.BOOLEAN, allowNull: false },
  failure_reason: { type: DataTypes.STRING(150), allowNull: true },
  logged_in_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  logged_out_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'login_history', timestamps: true, underscored: true });
