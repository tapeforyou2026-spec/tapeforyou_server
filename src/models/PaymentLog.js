module.exports = (sequelize, DataTypes) => sequelize.define('PaymentLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: true },
  direction: { type: DataTypes.ENUM('outbound', 'inbound'), allowNull: false },
  endpoint: { type: DataTypes.STRING(200), allowNull: false },
  http_status: { type: DataTypes.INTEGER, allowNull: true },
  request_body: { type: DataTypes.JSONB, allowNull: true },
  response_body: { type: DataTypes.JSONB, allowNull: true },
}, { tableName: 'payment_logs', timestamps: true, underscored: true, updatedAt: false });
