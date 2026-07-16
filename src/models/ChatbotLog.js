module.exports = (sequelize, DataTypes) => sequelize.define('ChatbotLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  customer_name: { type: DataTypes.STRING(150), allowNull: true },
  customer_email: { type: DataTypes.STRING(150), allowNull: true },
  guest_id: { type: DataTypes.STRING(64), allowNull: true },
  question: { type: DataTypes.TEXT, allowNull: false },
  answer: { type: DataTypes.TEXT, allowNull: true },
  matched: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'chatbot_logs', timestamps: true, underscored: true });
