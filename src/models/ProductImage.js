module.exports = (sequelize, DataTypes) => sequelize.define('ProductImage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  url: { type: DataTypes.STRING(500), allowNull: false },
  alt: { type: DataTypes.STRING(200), allowNull: true },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'product_images', timestamps: true, underscored: true });
