module.exports = (sequelize, DataTypes) => sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  razorpay_order_id: { type: DataTypes.STRING(100), allowNull: true },
  razorpay_payment_id: { type: DataTypes.STRING(100), allowNull: true },
  razorpay_signature: { type: DataTypes.STRING(200), allowNull: true },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'INR' },
  method: { type: DataTypes.STRING(50), allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'), defaultValue: 'pending' },
  gateway_response: { type: DataTypes.JSONB, allowNull: true },
  refund_id: { type: DataTypes.STRING(100), allowNull: true },
  refund_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  refunded_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  hooks: {
    // Only fires for instance-level `payment.update(...)` calls (how
    // RazorpayService.capturePayment sets this), consistent with the
    // Order model's hooks.
    afterUpdate: async (payment) => {
      if (!payment.changed('status') || payment.status !== 'failed') return;
      const NotificationService = require('../services/NotificationService');
      await NotificationService.notifyAdmins({
        type: 'payment',
        title: 'Payment Failed',
        body: `Payment of ₹${payment.amount} failed for order #${payment.order_id}`,
        data: { payment_id: payment.id, order_id: payment.order_id },
      });
    },
  },
});
