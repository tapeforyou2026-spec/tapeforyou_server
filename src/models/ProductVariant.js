module.exports = (sequelize, DataTypes) => sequelize.define('ProductVariant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  sku: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  width: { type: DataTypes.STRING(20), allowNull: true, comment: 'e.g. 48 mm' },
  length: { type: DataTypes.STRING(20), allowNull: true, comment: 'e.g. 50 Mtr' },
  micron: { type: DataTypes.STRING(20), allowNull: true },
  color: { type: DataTypes.STRING(50), allowNull: true },
  material: { type: DataTypes.STRING(100), allowNull: true },
  pack_size: { type: DataTypes.STRING(100), allowNull: true },
  mrp: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  selling_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  b2b_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  discount_percent: {
    type: DataTypes.VIRTUAL,
    get() {
      const mrp = parseFloat(this.mrp);
      const sp = parseFloat(this.selling_price);
      if (!mrp || !sp) return 0;
      return Math.round(((mrp - sp) / mrp) * 100);
    },
  },
  stock_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
  moq_b2c: { type: DataTypes.INTEGER, defaultValue: 1 },
  moq_b2b: { type: DataTypes.INTEGER, allowNull: true },
  low_stock_alert: { type: DataTypes.INTEGER, defaultValue: 10 },
  weight: { type: DataTypes.STRING(30), allowNull: true, comment: 'e.g. 500 gram' },
  dim_length: { type: DataTypes.DECIMAL(8, 2), allowNull: true, comment: 'cm' },
  dim_width: { type: DataTypes.DECIMAL(8, 2), allowNull: true, comment: 'cm' },
  dim_height: { type: DataTypes.DECIMAL(8, 2), allowNull: true, comment: 'cm' },
  status: { type: DataTypes.ENUM('active', 'inactive', 'out_of_stock'), defaultValue: 'active' },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'product_variants', timestamps: true, underscored: true });
