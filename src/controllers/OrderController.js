const fs = require('fs');
const path = require('path');
const OrderService = require('../services/OrderService');
const RazorpayService = require('../services/RazorpayService');
// ShiprocketService is no longer called — kept in the repo for historical
// shipments' reference only. See services/bigship/claude.md for why.
const BigshipService = require('../services/bigship/BigshipService');
const OrderRepository = require('../repositories/OrderRepository');
const PackingSlipService = require('../services/PackingSlipService');
const CreditNoteService = require('../services/CreditNoteService');
const { Cart, Payment } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
const R = require('../utils/response');

const sendInvoice = (res, invoice) => {
  if (!invoice?.file_path) return R.notFound(res, 'Invoice not available for this order yet');
  const filePath = path.join(process.cwd(), 'src', invoice.file_path.replace(/^[/\\]/, ''));
  if (!fs.existsSync(filePath)) return R.notFound(res, 'Invoice file not found');
  return res.download(filePath, `${invoice.invoice_number}.pdf`);
};

exports.createOrder = async (req, res) => {
  const { addressId, couponCode, paymentMethod, notes, trafficSource } = req.body;

  let cart = await Cart.findOne({ where: { user_id: req.user.id } });
  if (!cart) return R.error(res, 'Cart is empty');

  const order = await OrderService.createOrder({
    userId: req.user.id,
    addressId,
    cartId: cart.id,
    couponCode,
    paymentMethod,
    notes,
    trafficSource,
  });

  let razorpayOrder = null;
  if (paymentMethod !== 'cod') {
    razorpayOrder = await RazorpayService.createOrder(order.total, order.id);
  }

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_CREATED,
    description: `${req.user.name} placed order #${order.order_number} for ₹${order.total}`,
    recordId: order.id, actorType: 'user',
    newValues: { order_number: order.order_number, total: order.total, payment_method: paymentMethod },
  });

  return R.created(res, 'Order placed', { order, razorpayOrder });
};

exports.verifyPayment = async (req, res) => {
  const payment = await RazorpayService.capturePayment(req.body);
  return R.success(res, 'Payment verified', payment);
};

exports.myOrders = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await OrderRepository.getUserOrders(req.user.id, { limit, offset });
  return R.paginated(res, 'Orders fetched', rows, getPaginationMeta(count, page, limit));
};

exports.myOrderDetail = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order || order.user_id !== req.user.id) return R.notFound(res, 'Order not found');
  return R.success(res, 'Order details', order);
};

exports.downloadInvoice = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order || order.user_id !== req.user.id) return R.notFound(res, 'Order not found');
  return sendInvoice(res, order.invoice);
};

exports.cancelOrder = async (req, res) => {
  const order = await OrderService.cancelOrder(req.params.id, req.user.id, req.body.reason);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_CANCELLED,
    description: `${req.user.name} cancelled order #${order.order_number}${req.body.reason ? `: ${req.body.reason}` : ''}`,
    recordId: order.id, actorType: 'user', newValues: { status: 'cancelled', reason: req.body.reason },
  });

  return R.success(res, 'Order cancelled');
};

// Admin endpoints
exports.adminList = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.payment_status) where.payment_status = req.query.payment_status;

  const { rows, count } = await OrderRepository.adminList(where, { limit, offset });
  return R.paginated(res, 'Orders', rows, getPaginationMeta(count, page, limit));
};

exports.adminDetail = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  return R.success(res, 'Order details', order);
};

exports.adminDownloadInvoice = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  return sendInvoice(res, order.invoice);
};

exports.adminDownloadPackingSlip = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');

  const buffer = await PackingSlipService.generateBuffer(order);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="PackingSlip-${order.order_number}.pdf"`,
  });
  return res.send(buffer);
};

exports.adminDownloadCreditNote = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (!['refunded', 'partially_refunded'].includes(order.payment_status)) {
    return R.error(res, 'A credit note can only be issued for a refunded order');
  }
  if (!order.invoice) return R.notFound(res, 'No invoice found for this order to issue a credit note against');
  if (!order.payment) return R.notFound(res, 'No payment record found for this order');

  const buffer = await CreditNoteService.generateBuffer({ order, invoice: order.invoice, payment: order.payment });
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="CreditNote-${order.invoice.invoice_number}.pdf"`,
  });
  return res.send(buffer);
};

exports.adminShippingLabel = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (!order.shipment) return R.notFound(res, 'This order has not been shipped yet');
  if (!order.shipment.label_url) return R.error(res, 'Shipping label has not been generated yet');
  return R.success(res, 'Shipping label', { label_url: order.shipment.label_url });
};

exports.adminGenerateShippingLabel = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (!order.shipment) return R.error(res, 'Create a shipment for this order first');
  if (!order.shipment.bigship_custom_order_id) return R.error(res, 'This shipment was booked before the Bigship migration — no label available through this action');

  const result = await BigshipService.downloadShipmentDocuments(order.shipment.bigship_custom_order_id, 'label');
  const labelUrl = result.data?.AttachmentData;
  if (!labelUrl) return R.error(res, 'Bigship did not return a label URL');

  await order.shipment.update({ label_url: labelUrl });
  return R.success(res, 'Shipping label generated', { label_url: labelUrl });
};

const STATUS_SPECIFIC_ACTION = {
  cancelled: ACTIVITY_ACTIONS.ORDER_CANCELLED,
  shipped: ACTIVITY_ACTIONS.ORDER_SHIPPED,
  delivered: ACTIVITY_ACTIONS.ORDER_DELIVERED,
  refunded: ACTIVITY_ACTIONS.ORDER_REFUNDED,
};

exports.adminUpdateStatus = async (req, res) => {
  const order = await OrderRepository.findById(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');

  const previousStatus = order.status;
  await order.update({ status: req.body.status });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_STATUS_CHANGED,
    description: `${req.admin.name} changed order #${order.order_number} status from ${previousStatus} to ${order.status}`,
    recordId: order.id, oldValues: { status: previousStatus }, newValues: { status: order.status },
  });
  const specificAction = STATUS_SPECIFIC_ACTION[order.status];
  if (specificAction) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.ORDERS, action: specificAction,
      description: `${req.admin.name} marked order #${order.order_number} as ${order.status}`,
      recordId: order.id, oldValues: { status: previousStatus }, newValues: { status: order.status },
    });
  }

  // Auto-book the Bigship shipment the moment an order first reaches
  // `confirmed` — this is the COD path (prepaid orders reach `confirmed`
  // automatically via RazorpayService.capturePayment, which calls the same
  // method). Guarded by `previousStatus !== 'confirmed'` so re-saving an
  // already-confirmed order (e.g. picking 'confirmed' again from the
  // dropdown) doesn't attempt a second booking — autoBookShipmentIfNeeded
  // itself also no-ops if a shipment already exists, so this is redundant-
  // but-cheap insurance, not the only guard.
  if (order.status === 'confirmed' && previousStatus !== 'confirmed') {
    await OrderService.autoBookShipmentIfNeeded(order.id);
  }

  return R.success(res, 'Order status updated', order);
};

exports.markPaid = async (req, res) => {
  const order = await OrderRepository.findById(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (order.payment_method !== 'cod') return R.error(res, 'Only Cash on Delivery orders can be marked as paid manually — online payments are confirmed automatically');
  if (order.payment_status === 'paid') return R.error(res, 'This order is already marked as paid');

  await order.update({ payment_status: 'paid' });

  const [payment, created] = await Payment.findOrCreate({
    where: { order_id: order.id },
    defaults: { order_id: order.id, amount: order.total, method: 'cod', status: 'paid' },
  });
  if (!created) await payment.update({ status: 'paid' });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_PAYMENT_RECEIVED,
    description: `${req.admin.name} marked order #${order.order_number} as paid (COD)`,
    recordId: order.id, newValues: { payment_status: 'paid' },
  });

  return R.success(res, 'Payment marked as received', await OrderRepository.findWithDetails(order.id));
};

// Step 1 of the admin "Create Shipment" flow — creates a Bigship draft order
// and returns its serviceable couriers so the admin can pick one. See
// services/bigship/claude.md "Order Flow" for why this is a two-step process.
exports.adminShippingRates = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (order.shipment) return R.error(res, 'This order already has a shipment');

  const options = await BigshipService.getShippingOptions(order);
  return R.success(res, 'Shipping rates fetched', options);
};

// Step 2 — books the shipment against the draft created in step 1.
exports.shipOrder = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');

  const { masterCustomOrderId, courierId, courierName, riskTypeId } = req.body;
  if (!masterCustomOrderId || !courierId) return R.error(res, 'masterCustomOrderId and courierId are required — fetch shipping rates first');

  const shipment = await BigshipService.bookShipment(order, { masterCustomOrderId, courierId, courierName, riskTypeId });
  await order.update({ status: 'shipped' });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_SHIPPED,
    description: `${req.admin.name} created a shipment for order #${order.order_number} via ${courierName || 'Bigship'}`,
    recordId: order.id, newValues: { status: 'shipped' },
  });

  return R.success(res, 'Shipment created', shipment);
};

// Manual "Refresh Tracking" — pulls the live status from Bigship and writes
// it back onto the Shipment row. See BigshipService.syncShipmentStatus for
// why this is defensive about the exact response shape.
exports.trackShipment = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (!order.shipment) return R.error(res, 'This order has no shipment to track yet');

  const shipment = await BigshipService.syncShipmentStatus(order.shipment);
  return R.success(res, 'Tracking updated', shipment);
};

// Only valid before Bigship's "Rider-Assigned" status — Bigship itself
// enforces this and returns an error we surface as-is, not something this
// codebase pre-validates against (see claude.md "Cancel Shipment").
exports.cancelShipment = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (!order.shipment) return R.error(res, 'This order has no shipment to cancel');
  if (!order.shipment.bigship_custom_order_id) return R.error(res, 'This shipment predates the Bigship migration — cancel it directly in Shiprocket instead');

  await BigshipService.cancelOrder(order.shipment.bigship_custom_order_id);
  await order.shipment.update({ status: 'failed' });
  await order.update({ status: 'confirmed' });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_STATUS_CHANGED,
    description: `${req.admin.name} cancelled the Bigship shipment for order #${order.order_number}`,
    recordId: order.id, newValues: { status: 'confirmed' },
  });

  return R.success(res, 'Shipment cancelled');
};
