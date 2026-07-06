const fs = require('fs');
const path = require('path');
const OrderService = require('../services/OrderService');
const RazorpayService = require('../services/RazorpayService');
const ShiprocketService = require('../services/ShiprocketService');
const OrderRepository = require('../repositories/OrderRepository');
const { Cart, Payment } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

const sendInvoice = (res, invoice) => {
  if (!invoice?.file_path) return R.notFound(res, 'Invoice not available for this order yet');
  const filePath = path.join(process.cwd(), 'src', invoice.file_path.replace(/^[/\\]/, ''));
  if (!fs.existsSync(filePath)) return R.notFound(res, 'Invoice file not found');
  return res.download(filePath, `${invoice.invoice_number}.pdf`);
};

exports.createOrder = async (req, res) => {
  const { addressId, couponCode, paymentMethod, notes } = req.body;

  let cart = await Cart.findOne({ where: { user_id: req.user.id } });
  if (!cart) return R.error(res, 'Cart is empty');

  const order = await OrderService.createOrder({
    userId: req.user.id,
    addressId,
    cartId: cart.id,
    couponCode,
    paymentMethod,
    notes,
  });

  let razorpayOrder = null;
  if (paymentMethod !== 'cod') {
    razorpayOrder = await RazorpayService.createOrder(order.total, order.id);
  }

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
  await OrderService.cancelOrder(req.params.id, req.user.id, req.body.reason);
  return R.success(res, 'Order cancelled');
};

// Admin endpoints
exports.adminList = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.payment_status) where.payment_status = req.query.payment_status;

  const { rows, count } = await OrderRepository.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
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

exports.adminUpdateStatus = async (req, res) => {
  const order = await OrderRepository.findById(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');
  await order.update({ status: req.body.status });
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

  return R.success(res, 'Payment marked as received', await OrderRepository.findWithDetails(order.id));
};

exports.shipOrder = async (req, res) => {
  const order = await OrderRepository.findWithDetails(req.params.id);
  if (!order) return R.notFound(res, 'Order not found');

  const shipment = await ShiprocketService.createShipment(order);
  await order.update({ status: 'shipped' });

  return R.success(res, 'Shipment created', shipment);
};
