const { Return, ProductVariant } = require('../models');
const OrderRepository = require('../repositories/OrderRepository');
const NotificationService = require('./NotificationService');
const EmailService = require('./EmailService');
const HdfcPaymentService = require('./hdfc/HdfcPaymentService');
const RazorpayService = require('./RazorpayService');
const { RETURN_STATUS, RETURN_WINDOW_DAYS } = require('../constants');
const logger = require('../utils/logger');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

class ReturnService {
  // Whole-order-only scope (see the analysis this was built from) — a
  // customer either returns the entire order or contacts support directly;
  // no per-item/partial-quantity selection exists here by design.
  async requestReturn(orderId, userId, reason) {
    const order = await OrderRepository.findWithDetails(orderId);
    if (!order) throw new Error('Order not found');
    if (order.user_id !== userId) throw new Error('Unauthorized');
    if (order.status !== 'delivered') throw new Error('Only a delivered order can be returned');
    if (!order.delivered_at) throw new Error('This order has no recorded delivery date yet — please contact support');

    const daysSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / MS_PER_DAY;
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      throw new Error(`The return window (${RETURN_WINDOW_DAYS} days from delivery) has expired for this order`);
    }

    const existing = await Return.findOne({ where: { order_id: orderId } });
    if (existing) throw new Error('A return request already exists for this order');

    const ret = await Return.create({ order_id: orderId, user_id: userId, reason, status: RETURN_STATUS.REQUESTED });

    await NotificationService.notifyAdmins({
      type: 'return',
      title: 'Return Request',
      body: `Order #${order.order_number} — return requested: ${reason}`,
      data: { order_id: order.id, return_id: ret.id },
    });

    return ret;
  }

  async findWithDetails(returnId) {
    return Return.findByPk(returnId, {
      include: [
        { model: require('../models').Order, attributes: ['id', 'order_number', 'total', 'payment_status', 'payment_method'] },
        { model: require('../models').User, attributes: ['id', 'name', 'email'] },
      ],
    });
  }

  // Restocks every item on the order — same increment pattern
  // OrderService.cancelOrder already uses.
  async _restock(order) {
    for (const item of order.items) {
      if (item.variant_id) {
        await ProductVariant.increment('stock_qty', { by: item.quantity, where: { id: item.variant_id } });
      }
    }
  }

  // Attempts an automatic refund where this codebase already has a real
  // gateway integration to call (HDFC, or legacy Razorpay); COD (cash
  // already collected) has no automated path and is left for
  // markRefunded() once the admin has handled it manually. Never throws —
  // a refund failure must not block the return being marked "approved";
  // the admin can retry via markRefunded.
  async _attemptAutoRefund(order, adminId, ip) {
    if (order.payment_status !== 'paid') return { refunded: true, refund_id: null }; // nothing was ever collected
    const payment = order.payment;
    if (!payment) return { refunded: false, refund_id: null };

    try {
      if (payment.gateway === 'hdfc') {
        const refund = await HdfcPaymentService.initiateRefund(payment.id, null, adminId, ip);
        return { refunded: refund.status === 'success', refund_id: refund.id };
      }
      if (payment.razorpay_payment_id) {
        await RazorpayService.initiateRefund(payment.razorpay_payment_id, parseFloat(payment.amount));
        await payment.update({ status: 'refunded', refund_amount: payment.amount, refunded_at: new Date() });
        const { Order } = require('../models');
        await Order.update({ payment_status: 'refunded' }, { where: { id: order.id } });
        return { refunded: true, refund_id: null };
      }
    } catch (err) {
      logger.error(`Return #${order.id} auto-refund failed: ${err.message}`);
    }
    return { refunded: false, refund_id: null }; // COD, or refund attempt failed — needs manual markRefunded
  }

  async approveReturn(returnId, adminId, ip) {
    const ret = await Return.findByPk(returnId);
    if (!ret) throw new Error('Return request not found');
    if (ret.status !== RETURN_STATUS.REQUESTED) throw new Error('This return request has already been reviewed');

    const order = await OrderRepository.findWithDetails(ret.order_id);
    await order.update({ status: 'returned' }); // reuses Order's existing afterUpdate hook (admin notification)
    await this._restock(order);

    const { refunded, refund_id } = await this._attemptAutoRefund(order, adminId, ip);

    await ret.update({
      status: refunded ? RETURN_STATUS.REFUNDED : RETURN_STATUS.APPROVED,
      reviewed_by: adminId,
      reviewed_at: new Date(),
      refund_id,
      refunded_at: refunded ? new Date() : null,
    });

    await EmailService.sendReturnApproved(order.User, order).catch(() => {});
    if (refunded) await EmailService.sendReturnRefunded(order.User, order).catch(() => {});

    return ret;
  }

  async rejectReturn(returnId, adminId, adminNote) {
    const ret = await Return.findByPk(returnId);
    if (!ret) throw new Error('Return request not found');
    if (ret.status !== RETURN_STATUS.REQUESTED) throw new Error('This return request has already been reviewed');

    await ret.update({ status: RETURN_STATUS.REJECTED, reviewed_by: adminId, reviewed_at: new Date(), admin_note: adminNote || null });

    const order = await OrderRepository.findWithDetails(ret.order_id);
    await EmailService.sendReturnRejected(order.User, order, adminNote).catch(() => {});

    return ret;
  }

  // Manual completion step for returns that couldn't be auto-refunded (COD
  // cash returns, or a failed HDFC/Razorpay attempt the admin resolved
  // outside this system) — mirrors OrderController.markPaid's existing
  // "admin confirms a real-world cash event happened" pattern.
  async markRefunded(returnId, adminId) {
    const ret = await Return.findByPk(returnId);
    if (!ret) throw new Error('Return request not found');
    if (ret.status !== RETURN_STATUS.APPROVED) throw new Error('Only an approved (not yet refunded) return can be marked refunded');

    await ret.update({ status: RETURN_STATUS.REFUNDED, refunded_at: new Date() });

    const order = await OrderRepository.findWithDetails(ret.order_id);
    const { Order } = require('../models');
    if (order.payment_status === 'paid') await Order.update({ payment_status: 'refunded' }, { where: { id: order.id } });

    await EmailService.sendReturnRefunded(order.User, order).catch(() => {});

    return ret;
  }
}

module.exports = new ReturnService();
