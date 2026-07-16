module.exports = (sequelize, DataTypes) => sequelize.define('ProductReview', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  title: { type: DataTypes.STRING(200), allowNull: true },
  body: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  verified_purchase: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'product_reviews',
  timestamps: true,
  underscored: true,
  hooks: {
    afterCreate: async (review) => {
      const NotificationService = require('../services/NotificationService');
      await NotificationService.notifyAdmins({
        type: 'review',
        title: 'New Customer Review',
        body: `A ${review.rating}-star review was submitted${review.title ? `: "${review.title}"` : ''}`,
        data: { review_id: review.id, product_id: review.product_id },
      });
    },
  },
});
