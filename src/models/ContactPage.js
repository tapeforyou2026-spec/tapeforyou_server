module.exports = (sequelize, DataTypes) => sequelize.define('ContactPage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hero_label: { type: DataTypes.STRING(100), defaultValue: 'Reach Out' },
  hero_heading: { type: DataTypes.STRING(150), defaultValue: 'Get in Touch' },
  hero_description: { type: DataTypes.STRING(300), allowNull: true },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  address: { type: DataTypes.STRING(300), allowNull: true },
  bulk_heading: { type: DataTypes.STRING(100), defaultValue: 'Bulk Orders?' },
  bulk_description: { type: DataTypes.STRING(300), allowNull: true },
  bulk_email: { type: DataTypes.STRING(150), allowNull: true },
}, { tableName: 'contact_page', timestamps: true, underscored: true });
