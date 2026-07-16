module.exports = (sequelize, DataTypes) => sequelize.define('StockIn', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  variant_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  supplier_name: { type: DataTypes.STRING(150), allowNull: true },
  expected_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('ordered', 'received', 'cancelled'), defaultValue: 'ordered' },
  received_quantity: { type: DataTypes.INTEGER, allowNull: true },
  received_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'stock_ins', timestamps: true, underscored: true });
