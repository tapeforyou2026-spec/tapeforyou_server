module.exports = (sequelize, DataTypes) => sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM('order', 'payment', 'shipment', 'promo', 'system'), defaultValue: 'system' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  data: { type: DataTypes.JSONB, allowNull: true },
  read_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'notifications', timestamps: true, underscored: true });
