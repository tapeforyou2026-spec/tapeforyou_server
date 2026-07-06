module.exports = (sequelize, DataTypes) => sequelize.define('Shipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  shiprocket_order_id: { type: DataTypes.STRING(100), allowNull: true },
  shiprocket_shipment_id: { type: DataTypes.STRING(100), allowNull: true },
  awb_code: { type: DataTypes.STRING(100), allowNull: true },
  courier_name: { type: DataTypes.STRING(100), allowNull: true },
  tracking_url: { type: DataTypes.STRING(500), allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'booked', 'pickup_requested', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'),
    defaultValue: 'pending',
  },
  label_url: { type: DataTypes.STRING(500), allowNull: true },
  estimated_delivery: { type: DataTypes.DATE, allowNull: true },
  delivered_at: { type: DataTypes.DATE, allowNull: true },
  channel_order_id: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'shipments', timestamps: true, underscored: true });
