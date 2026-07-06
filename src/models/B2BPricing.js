module.exports = (sequelize, DataTypes) => sequelize.define('B2BPricing', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  variant_id: { type: DataTypes.INTEGER, allowNull: false },
  tier_qty: { type: DataTypes.INTEGER, allowNull: false, comment: 'Min qty for this tier' },
  tier_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: 'b2b_pricing', timestamps: true, underscored: true });
