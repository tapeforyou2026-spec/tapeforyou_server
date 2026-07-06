module.exports = (sequelize, DataTypes) => sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  image: { type: DataTypes.STRING, allowNull: true },
  parent_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'categories', key: 'id' } },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  seo_title: { type: DataTypes.STRING(200), allowNull: true },
  seo_description: { type: DataTypes.TEXT, allowNull: true },
  seo_keywords: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'categories', timestamps: true, underscored: true });
