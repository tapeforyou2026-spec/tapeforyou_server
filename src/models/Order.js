module.exports = (sequelize, DataTypes) => sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  address_id: { type: DataTypes.INTEGER, allowNull: true },
  coupon_id: { type: DataTypes.INTEGER, allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  coupon_discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  shipping_charge: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  gst_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'),
    defaultValue: 'pending',
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
    defaultValue: 'pending',
  },
  payment_method: { type: DataTypes.ENUM('razorpay', 'cod', 'upi', 'bank_transfer'), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  cancelled_at: { type: DataTypes.DATE, allowNull: true },
  cancel_reason: { type: DataTypes.STRING(500), allowNull: true },
  delivered_at: { type: DataTypes.DATE, allowNull: true },
  is_b2b: { type: DataTypes.BOOLEAN, defaultValue: false },
  // First-touch attribution captured client-side at checkout (see the
  // customer frontend's TrafficSourceTracker) — null for any order placed
  // before this column existed, or where the frontend didn't send one.
  traffic_source: { type: DataTypes.ENUM('direct', 'organic', 'social', 'referral', 'paid', 'email', 'other'), allowNull: true },
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true,
  hooks: {
    // Fires for every order regardless of which controller/service created
    // it — NotificationService is required lazily inside the hook (not at
    // module top-level) since models/index.js is still mid-initialization
    // when this file first loads, and NotificationService itself pulls in
    // `../models`.
    afterCreate: async (order) => {
      const NotificationService = require('../services/NotificationService');
      await NotificationService.notifyAdmins({
        type: 'order',
        title: 'New Order Received',
        body: `Order #${order.order_number} placed for ₹${order.total}`,
        data: { order_id: order.id },
      });
    },
    // Static `Order.update(...)` calls bypass instance hooks in Sequelize —
    // this only fires for `order.update(...)` on an instance, which is how
    // every status change in this codebase is actually done
    // (OrderService.cancelOrder, OrderController.adminUpdateStatus).
    afterUpdate: async (order) => {
      if (!order.changed('status')) return;
      const NotificationService = require('../services/NotificationService');
      if (order.status === 'cancelled') {
        await NotificationService.notifyAdmins({
          type: 'order',
          title: 'Order Cancelled',
          body: `Order #${order.order_number} was cancelled${order.cancel_reason ? `: ${order.cancel_reason}` : ''}`,
          data: { order_id: order.id },
        });
      } else if (order.status === 'returned') {
        await NotificationService.notifyAdmins({
          type: 'return',
          title: 'Return Request',
          body: `Order #${order.order_number} has been marked as returned`,
          data: { order_id: order.id },
        });
      }
    },
  },
});
