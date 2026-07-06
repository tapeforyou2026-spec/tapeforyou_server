module.exports = (sequelize, DataTypes) => sequelize.define('Wishlist', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'wishlists',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'variant_id'] }],
});
