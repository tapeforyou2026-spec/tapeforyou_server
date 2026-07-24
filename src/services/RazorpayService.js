const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');
const { Payment, Order } = require('../models');
const OrderService = require('./OrderService');

class RazorpayService {
  constructor() {
    this.instance = new Razorpay({ key_id: env.RAZORPAY.KEY_ID, key_secret: env.RAZORPAY.SECRET });
  }

  async createOrder(amount, orderId) {
    const rzpOrder = await this.instance.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${orderId}`,
    });

    await Payment.create({
      order_id: orderId,
      razorpay_order_id: rzpOrder.id,
      amount,
      status: 'pending',
    });

    return rzpOrder;
  }

  verifySignature(razorpayOrderId, razorpayPaymentId, signature) {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto.createHmac('sha256', env.RAZORPAY.SECRET).update(body).digest('hex');
    return expected === signature;
  }

  async capturePayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const payment = await Payment.findOne({ where: { razorpay_order_id: razorpayOrderId } });
    if (!payment) throw new Error('Payment record not found');

    // Previously a failed signature check just threw here with no DB write
    // at all — the Payment row stayed 'pending' forever and there was no
    // record a failure ever happened. Persisting 'failed' gives admins an
    // actual audit trail and is what the Payment model's afterUpdate hook
    // needs to fire the "Payment Failed" notification.
    const isValid = this.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      await payment.update({ razorpay_payment_id: razorpayPaymentId, status: 'failed' });
      throw new Error('Payment verification failed');
    }

    const rzpPayment = await this.instance.payments.fetch(razorpayPaymentId);

    await payment.update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      method: rzpPayment.method,
      status: 'paid',
      gateway_response: rzpPayment,
    });

    await Order.update(
      { payment_status: 'paid', status: 'confirmed' },
      { where: { id: payment.order_id } }
    );

    // Auto-book the Bigship shipment now that the order is confirmed — see
    // OrderService.autoBookShipmentIfNeeded for why this never throws (a
    // Bigship failure must not fail payment verification, which is what the
    // customer's browser is waiting on right now).
    await OrderService.autoBookShipmentIfNeeded(payment.order_id);

    return payment;
  }

  async initiateRefund(paymentId, amount) {
    const refund = await this.instance.payments.refund(paymentId, { amount: Math.round(amount * 100) });
    return refund;
  }
}

module.exports = new RazorpayService();
