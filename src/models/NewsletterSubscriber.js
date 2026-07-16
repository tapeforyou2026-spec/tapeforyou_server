module.exports = (sequelize, DataTypes) => sequelize.define('NewsletterSubscriber', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('subscribed', 'unsubscribed'), defaultValue: 'subscribed' },
  subscribed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'newsletter_subscribers', timestamps: true, underscored: true });
