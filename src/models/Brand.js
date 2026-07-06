module.exports = (sequelize, DataTypes) => sequelize.define('Brand', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  logo: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
}, { tableName: 'brands', timestamps: true, underscored: true });
