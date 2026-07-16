const fs = require('fs');
const path = require('path');
const OrderService = require('../services/OrderService');
const RazorpayService = require('../services/RazorpayService');
const ShiprocketService = require('../services/ShiprocketService');
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

// Shiprocket's generateLabel() call already existed as a bare API wrapper
// but nothing ever invoked it or saved the returned URL — Shipment.label_url
// has been sitting unused on the model since it was added.
exports.adminGenerateShippingLabel = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  if (!order.shipment) return R.error(res, 'Create a shipment for this order first');

  const result = await ShiprocketService.generateLabel(order.shipment.shiprocket_shipment_id);
  const labelUrl = result?.label_created ? result.label_url : null;
  if (!labelUrl) return R.error(res, 'Shiprocket did not return a label URL');

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

exports.shipOrder = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');

  const shipment = await ShiprocketService.createShipment(order);
  await order.update({ status: 'shipped' });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.ORDER_SHIPPED,
    description: `${req.admin.name} created a shipment for order #${order.order_number}`,
    recordId: order.id, newValues: { status: 'shipped' },
  });

  return R.success(res, 'Shipment created', shipment);
};
