module.exports = (sequelize, DataTypes) => sequelize.define('Shipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  shiprocket_order_id: { type: DataTypes.STRING(100), allowNull: true },
  shiprocket_shipment_id: { type: DataTypes.STRING(100), allowNull: true },
  bigship_custom_order_id: { type: DataTypes.STRING(100), allowNull: true },
  bigship_courier_id: { type: DataTypes.STRING(100), allowNull: true },
  bigship_courier_name: { type: DataTypes.STRING(100), allowNull: true },
  segment_type: { type: DataTypes.STRING(20), allowNull: true },
  invoice_uploaded: { type: DataTypes.BOOLEAN, defaultValue: false },
  eway_bill_no: { type: DataTypes.STRING(50), allowNull: true },
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
  // Populated by BigshipService.syncShipmentStatus() — see that method for
  // why courier_status_raw/tracking_response exist alongside the normal
  // `status` enum above (no confirmed Track Order response sample was
  // available to hand-derive an exact field mapping from).
  courier_status_raw: { type: DataTypes.STRING(200), allowNull: true },
  tracking_response: { type: DataTypes.JSONB, allowNull: true },
  last_tracked_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'shipments', timestamps: true, underscored: true });
