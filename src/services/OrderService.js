const { sequelize, Order, OrderItem, ProductVariant, Coupon, Cart, CartItem, Address, Notification } = require('../models');
const { generateOrderNumber } = require('../utils/crypto');
const { calculateGSTFromBase, splitGST } = require('../utils/gst');
const OrderRepository = require('../repositories/OrderRepository');
const ProductRepository = require('../repositories/ProductRepository');
const EmailService = require('./EmailService');
const InvoiceService = require('./InvoiceService');
const NotificationService = require('./NotificationService');

const FREE_SHIPPING_THRESHOLD = 499;
const SHIPPING_CHARGE = 60;

class OrderService {
  async createOrder({ userId, addressId, cartId, couponCode, paymentMethod, notes, trafficSource }) {
    const t = await sequelize.transaction();
    try {
      const cartItems = await CartItem.findAll({
        where: { cart_id: cartId },
        include: [{ model: ProductVariant, as: 'variant' }],
        transaction: t,
      });

      if (!cartItems.length) throw new Error('Cart is empty');

      let subtotal = 0;
      const items = [];

      for (const item of cartItems) {
        const variant = item.variant;
        if (!variant || variant.status !== 'active') throw new Error(`Product ${variant?.sku} is unavailable`);
        if (variant.stock_qty < item.quantity) throw new Error(`Insufficient stock for ${variant.sku}`);

        const lineTotal = parseFloat(variant.selling_price) * item.quantity;
        const gstAmount = parseFloat(((lineTotal * variant.gst_percent || 18) / 100).toFixed(2));

        subtotal += lineTotal;
        items.push({
          variant_id: variant.id,
          product_name: (await variant.getProduct()).name,
          sku: variant.sku,
          pack_size: variant.pack_size,
          color: variant.color,
          width: variant.width,
          length: variant.length,
          quantity: item.quantity,
          unit_price: variant.selling_price,
          mrp: variant.mrp,
          gst_percent: 18,
          gst_amount: gstAmount,
          total: lineTotal,
        });
      }

      let couponDiscount = 0;
      let couponId = null;
      if (couponCode) {
        const coupon = await Coupon.findOne({ where: { code: couponCode.toUpperCase(), status: 'active' } });
        if (coupon && subtotal >= parseFloat(coupon.min_order_amount)) {
          if (coupon.type === 'flat') couponDiscount = Math.min(parseFloat(coupon.value), subtotal);
          else couponDiscount = Math.min((subtotal * parseFloat(coupon.value)) / 100, coupon.max_discount || Infinity);
          couponId = coupon.id;
          await Coupon.increment('used_count', { where: { id: coupon.id }, transaction: t });
        }
      }

      const shippingCharge = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
      const gstAmount = items.reduce((s, i) => s + parseFloat(i.gst_amount), 0);
      const total = parseFloat((subtotal - couponDiscount + shippingCharge).toFixed(2));

      const order = await Order.create({
        order_number: generateOrderNumber(),
        user_id: userId,
        address_id: addressId,
        coupon_id: couponId,
        subtotal,
        coupon_discount: couponDiscount,
        shipping_charge: shippingCharge,
        gst_amount: gstAmount,
        total,
        payment_method: paymentMethod,
        notes,
        status: 'pending',
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        traffic_source: trafficSource || null,
      }, { transaction: t });

      const orderItems = items.map(i => ({ ...i, order_id: order.id }));
      await OrderItem.bulkCreate(orderItems, { transaction: t });

      // Static `.decrement()` issues a raw UPDATE and bypasses instance hooks
      // entirely (unlike instance `.update()`, which is how Order/Payment's
      // notification hooks fire), so low-stock detection can't live on the
      // ProductVariant model itself — checked here instead, using the
      // already-loaded `variant.stock_qty` (the pre-decrement value) rather
      // than an extra query.
      for (const item of cartItems) {
        await ProductVariant.decrement('stock_qty', { by: item.quantity, where: { id: item.variant_id }, transaction: t });

        const variant = item.variant;
        const alert = variant.low_stock_alert || 10;
        const newQty = variant.stock_qty - item.quantity;
        if (newQty <= alert && variant.stock_qty > alert) {
          NotificationService.notifyAdmins({
            type: 'low_stock',
            title: newQty <= 0 ? 'Out of Stock' : 'Low Stock Alert',
            body: `${variant.sku} ${newQty <= 0 ? 'is now out of stock' : `has only ${newQty} units left`}`,
            data: { variant_id: variant.id },
          });
        }
      }

      await CartItem.destroy({ where: { cart_id: cartId }, transaction: t });

      await t.commit();

      const fullOrder = await OrderRepository.findWithDetails(order.id);
      await InvoiceService.generateForOrder(fullOrder).catch(() => {});

      return fullOrder;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async cancelOrder(orderId, userId, reason) {
    const order = await OrderRepository.findWithDetails(orderId);
    if (!order) throw new Error('Order not found');
    if (order.user_id !== userId) throw new Error('Unauthorized');
    if (!['pending', 'confirmed'].includes(order.status)) throw new Error('Order cannot be cancelled');

    const t = await sequelize.transaction();
    try {
      await order.update({ status: 'cancelled', cancelled_at: new Date(), cancel_reason: reason }, { transaction: t });

      for (const item of order.items) {
        if (item.variant_id) {
          await ProductVariant.increment('stock_qty', { by: item.quantity, where: { id: item.variant_id }, transaction: t });
        }
      }
      await t.commit();
      return order;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new OrderService();
