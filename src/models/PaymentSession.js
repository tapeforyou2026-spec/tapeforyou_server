module.exports = (sequelize, DataTypes) => sequelize.define('PaymentSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: false },
  session_id: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  redirect_url: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('created', 'active', 'expired', 'superseded', 'consumed'),
    defaultValue: 'created',
  },
  expires_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'payment_sessions', timestamps: true, underscored: true });
