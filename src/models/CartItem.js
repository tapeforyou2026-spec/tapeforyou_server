module.exports = (sequelize, DataTypes) => sequelize.define('CartItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cart_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
}, { tableName: 'cart_items', timestamps: true, underscored: true });
