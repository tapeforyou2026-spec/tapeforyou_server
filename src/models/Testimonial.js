module.exports = (sequelize, DataTypes) => sequelize.define('Testimonial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  role: { type: DataTypes.STRING(150), allowNull: true },
  company: { type: DataTypes.STRING(150), allowNull: true },
  avatar: { type: DataTypes.STRING(500), allowNull: true },
  rating: { type: DataTypes.INTEGER, defaultValue: 5 },
  review: { type: DataTypes.TEXT, allowNull: false },
  product: { type: DataTypes.STRING(150), allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
}, { tableName: 'testimonials', timestamps: true, underscored: true });
