module.exports = (sequelize, DataTypes) => sequelize.define('RefreshToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  is_revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  device_info: { type: DataTypes.STRING(500), allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
}, { tableName: 'refresh_tokens', timestamps: true, underscored: true });
