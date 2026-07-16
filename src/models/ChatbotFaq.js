module.exports = (sequelize, DataTypes) => sequelize.define('ChatbotFaq', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  question: { type: DataTypes.STRING(300), allowNull: false },
  answer: { type: DataTypes.TEXT, allowNull: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
}, { tableName: 'chatbot_faqs', timestamps: true, underscored: true });
