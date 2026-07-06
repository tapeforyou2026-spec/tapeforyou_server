const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');
const { Payment, Order } = require('../models');

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
    const isValid = this.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) throw new Error('Payment verification failed');

    const rzpPayment = await this.instance.payments.fetch(razorpayPaymentId);

    const payment = await Payment.findOne({ where: { razorpay_order_id: razorpayOrderId } });
    if (!payment) throw new Error('Payment record not found');

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

    return payment;
  }

  async initiateRefund(paymentId, amount) {
    const refund = await this.instance.payments.refund(paymentId, { amount: Math.round(amount * 100) });
    return refund;
  }
}

module.exports = new RazorpayService();
