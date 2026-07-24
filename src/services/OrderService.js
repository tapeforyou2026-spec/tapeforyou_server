const { sequelize, Order, OrderItem, ProductVariant, Coupon, Cart, CartItem, Address, Notification } = require('../models');
const { generateOrderNumber } = require('../utils/crypto');
const { calculateGSTFromBase, splitGST } = require('../utils/gst');
const OrderRepository = require('../repositories/OrderRepository');
const ProductRepository = require('../repositories/ProductRepository');
const EmailService = require('./EmailService');
const InvoiceService = require('./InvoiceService');
const NotificationService = require('./NotificationService');
const ShippingService = require('./ShippingService');
const BigshipService = require('./bigship/BigshipService');
const logger = require('../utils/logger');

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
        // Parenthesized explicitly — `lineTotal * variant.gst_percent || 18` previously
        // parsed as `(lineTotal * variant.gst_percent) || 18` (operator precedence),
        // which would silently charge 18% GST even on a genuinely 0%-GST product.
        const gstAmount = parseFloat(((lineTotal * (variant.gst_percent || 18)) / 100).toFixed(2));

        const product = await variant.getProduct();
        subtotal += lineTotal;
        items.push({
          variant_id: variant.id,
          product_name: product.name,
          sku: variant.sku,
          // Was never carried from Product to OrderItem before, so every
          // Bigship shipment payload sent an empty HSN field (BigshipService.
          // buildB2cOrderPayload reads item.hsn_code) — fixed here at source.
          hsn_code: product.hsn_code || null,
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

      // Real, distance-based shipping via Bigship (falls back to a flat fee if
      // the live rate call fails) — same ShippingService.calculateShipping()
      // the pre-checkout "Check Delivery Availability" widget calls, so the
      // quote shown to the customer always matches what gets charged here.
      const address = await Address.findByPk(addressId, { transaction: t });
      if (!address) throw new Error('Delivery address not found');
      const totalQuantity = cartItems.reduce((s, i) => s + i.quantity, 0);
      const shippingResult = await ShippingService.calculateShipping({
        destPincode: address.pincode,
        destCity: address.city,
        subtotal,
        totalQuantity,
        isCod: paymentMethod === 'cod',
      });
      // A real "no courier serves this pincode" answer from Bigship — block
      // the order rather than silently charging a flat fallback fee for a
      // shipment that genuinely cannot go out (distinct from a Bigship API
      // outage, which ShippingService already treats as serviceable:true
      // with a fallback charge). statusCode is set explicitly — errorHandler.js
      // masks any error without one to a generic 500 "Internal server error",
      // which would hide the real, actionable reason from the customer.
      if (!shippingResult.serviceable) {
        const err = new Error(shippingResult.message || 'Delivery is not available to this address');
        err.statusCode = 400;
        throw err;
      }
      const { shippingCharge } = shippingResult;

      // Taxable Amount = Product Amount + Shipping Charges; GST = Taxable × 18%
      // (confirmed business rule — shipping is part of the taxable supply,
      // matching how Bigship itself bills freight+GST as a composite charge).
      // Per-item gst_amount (above) already covers the product portion at
      // each item's own gst_percent; shippingGst is a flat 18% add-on since
      // shipping has no per-SKU rate of its own.
      const itemsGstAmount = items.reduce((s, i) => s + parseFloat(i.gst_amount), 0);
      const shippingGstAmount = parseFloat(((shippingCharge * 18) / 100).toFixed(2));
      const gstAmount = parseFloat((itemsGstAmount + shippingGstAmount).toFixed(2));
      // GST is now actually added to what the customer is charged — previously
      // gst_amount was computed and stored (for the invoice breakdown) but never
      // included here, meaning the invoice showed CGST/SGST rows that didn't
      // actually add up to the printed TOTAL.
      const total = parseFloat((subtotal - couponDiscount + shippingCharge + gstAmount).toFixed(2));

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

  // Auto-books a Bigship shipment the moment an order reaches `confirmed` —
  // no admin "Create Shipment" click involved (2026-07-24 decision: trade the
  // courier-comparison UX for a fully automatic flow). Called from both
  // places an Order can transition into `confirmed`:
  //   - RazorpayService.capturePayment() (prepaid orders, automatic)
  //   - OrderController.adminUpdateStatus() (COD orders, admin moves the
  //     status dropdown — this project has no automatic COD-confirm step)
  // Deliberately never throws — a Bigship failure (rate-limit, no
  // serviceable courier, account/wallet issue) must never break the payment
  // confirmation or status-update response that triggered this. On failure,
  // the order is simply left without a shipment, exactly as if auto-booking
  // didn't exist — the admin's manual "Create Shipment" modal still works
  // standalone as a fallback.
  async autoBookShipmentIfNeeded(orderId) {
    try {
      const order = await OrderRepository.findWithDetails(orderId);
      if (!order || order.status !== 'confirmed' || order.shipment) return;

      const shipment = await BigshipService.autoBookCheapestShipment(order);
      await order.update({ status: 'shipped' });

      await NotificationService.notifyAdmins({
        type: 'shipment',
        title: 'Shipment Auto-Booked',
        body: `Order #${order.order_number} auto-booked with ${shipment.courier_name || 'Bigship'} (₹${order.shipping_charge})`,
        data: { order_id: order.id, shipment_id: shipment.id },
      });
      logger.info(`Auto-booked Bigship shipment for order #${order.order_number}`);
    } catch (err) {
      logger.error(`Auto-book shipment failed for order #${orderId}: ${err.message}`);
      await NotificationService.notifyAdmins({
        type: 'shipment',
        title: 'Auto-Booking Failed',
        body: `Could not auto-book a shipment for order #${orderId}: ${err.message}. Use "Create Shipment" to book manually.`,
        data: { order_id: orderId },
      });
    }
  }
}

module.exports = new OrderService();
