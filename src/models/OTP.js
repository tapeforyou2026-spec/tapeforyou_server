module.exports = (sequelize, DataTypes) => sequelize.define('OTP', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  otp_hash: { type: DataTypes.STRING, allowNull: false },
  purpose: { type: DataTypes.ENUM('verify_mobile', 'reset_password'), allowNull: false },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_used: { type: DataTypes.BOOLEAN, defaultValue: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'otps', timestamps: true, underscored: true });
