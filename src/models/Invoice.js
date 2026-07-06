module.exports = (sequelize, DataTypes) => sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  invoice_date: { type: DataTypes.DATEONLY, allowNull: false },
  file_path: { type: DataTypes.STRING(500), allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  cgst: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_gst: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  is_inter_state: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'invoices', timestamps: true, underscored: true });
