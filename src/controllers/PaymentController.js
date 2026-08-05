const { Op, fn, col } = require('sequelize');
const HdfcPaymentService = require('../services/hdfc/HdfcPaymentService');
const { Payment, PaymentStatusHistory, Order, Refund, User } = require('../models');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES } = require('../constants');
const R = require('../utils/response');
const env = require('../config/env');

// Thin HTTP layer only — all business logic lives in HdfcPaymentService,
// matching this project's existing Architecture Principles. Thrown errors
// carry `err.statusCode` (set by the service) and are left to bubble to the
// global errorHandler.js via express-async-errors, same convention every
// other controller in this project already follows.

exports.createSession = async (req, res) => {
  const { orderId } = req.body;
  const result = await HdfcPaymentService.createSession(orderId, req.user.id, req.headers.origin);
  return R.success(res, result.reused ? 'Existing payment session reused' : 'Payment session created', result);
};

exports.retry = async (req, res) => {
  // Identical to createSession — a "retry" is simply a new session request
  // for an order whose previous attempt failed/expired; createSession's own
  // non-terminal-session check already handles both cases correctly.
  const { orderId } = req.body;
  const result = await HdfcPaymentService.createSession(orderId, req.user.id, req.headers.origin);
  return R.success(res, 'New payment session created', result);
};

exports.verify = async (req, res) => {
  const { orderId, ...returnUrlParams } = req.body;
  if (!orderId || !Number.isInteger(Number(orderId))) return R.error(res, 'orderId is required', null, 422);
  const result = await HdfcPaymentService.verify(Number(orderId), req.user.id, returnUrlParams);
  return R.success(res, 'Payment verification complete', result);
};

// Webhook receiver — auth is handled by middlewares/hdfcWebhookAuth.js, not
// req.user/req.admin (HDFC calls this directly, no JWT involved). Always
// returns 200 once the event is durably recorded — confirmed real HDFC
// behavior: a non-200 response causes it to resend the same webhook
// indefinitely.
exports.webhook = async (req, res) => {
  try {
    await HdfcPaymentService.processWebhookEvent(req.body);
  } catch (err) {
    // Logged, not surfaced as a non-200 — see comment above for why.
    require('../utils/logger').error(`HDFC webhook processing error: ${err.message}`);
  }
  return res.status(200).json({ received: true });
};

// Bridge for HDFC's return_url when "Enable POST method support for return
// URL" is turned on in the SmartGateway dashboard — HDFC then auto-submits a
// hidden HTML form (method="POST") to return_url instead of doing a normal
// GET redirect with query params. The frontend's /payment/hdfc/return page
// is a plain client component reading useSearchParams(), which only ever
// sees GET query params — a POST body is invisible to it, which is exactly
// why customers were landing on "Missing order reference" even for a real,
// successful payment. This public, unauthenticated endpoint (no req.user —
// HDFC/the customer's browser hits it directly, not through our own app)
// accepts either GET or POST, pulls the order reference out of whichever
// arrived, and 303-redirects the browser to the same frontend page as a
// clean GET with query params — the frontend page itself needed no changes.
//
// `fb` (frontendBase) is embedded in return_url by
// HdfcPaymentService.createSession at session-creation time, using the same
// validated-origin logic already used for the direct-GET case — this
// endpoint only trusts it if it's still one of the allowlisted FRONTEND_URL
// origins, exactly like that logic does, since it ends up controlling where
// a real payment redirect sends the customer.
exports.hdfcReturnBridge = async (req, res) => {
  const merged = { ...req.query, ...req.body };

  // Prefer our own `orderId` if it survived. HDFC's own `order_id` field
  // (e.g. "HDFC7f3a9c1b2d4e6f") is the fallback for the worst case (HDFC
  // drops our query string entirely) — it can no longer be reverse-parsed
  // back to our internal order id the way it briefly could (that string used
  // to literally be `HDFC${orderId}`; it's now a random, non-sequential
  // value per HDFC's go-live security-audit requirement — see
  // HdfcPaymentService.generateHdfcOrderId), so this looks it up for real
  // against the Payment row it was stored on instead.
  let orderId = merged.orderId || null;
  if (!orderId && merged.order_id) {
    const payment = await Payment.findOne({ where: { hdfc_order_id: merged.order_id } });
    if (payment) orderId = payment.order_id;
  }

  const allowedFrontendOrigins = env.URLS.FRONTEND.split(',').map((s) => s.trim());
  const frontendBase = (merged.fb && allowedFrontendOrigins.includes(merged.fb))
    ? merged.fb
    : allowedFrontendOrigins[0];

  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([key, value]) => {
    if (key === 'fb' || key === 'orderId' || value == null) return;
    qs.set(key, value);
  });
  if (orderId) qs.set('orderId', orderId);

  return res.redirect(303, `${frontendBase}/payment/hdfc/return?${qs.toString()}`);
};

exports.getPayment = async (req, res) => {
  const payment = await Payment.findByPk(req.params.id, { include: [{ model: Order }] });
  if (!payment) return R.notFound(res, 'Payment not found');
  if (payment.Order.user_id !== req.user.id) return R.forbidden(res);
  return R.success(res, 'Payment fetched', payment);
};

exports.getPaymentByOrder = async (req, res) => {
  const order = await Order.findByPk(req.params.orderId);
  if (!order || order.user_id !== req.user.id) return R.notFound(res, 'Order not found');
  const payment = await Payment.findOne({ where: { order_id: order.id } });
  if (!payment) return R.notFound(res, 'No payment found for this order');
  return R.success(res, 'Payment fetched', payment);
};

// Lightweight — reads the DB only, never re-calls HDFC (that's what /verify
// is for). Powers a frontend "waiting for confirmation" poll.
exports.getStatus = async (req, res) => {
  const payment = await Payment.findByPk(req.params.paymentId, { include: [{ model: Order }] });
  if (!payment) return R.notFound(res, 'Payment not found');
  if (payment.Order.user_id !== req.user.id && !req.admin) return R.forbidden(res);
  return R.success(res, 'Status fetched', { status: payment.status });
};

exports.getHistory = async (req, res) => {
  const payment = await Payment.findByPk(req.params.paymentId, { include: [{ model: Order }] });
  if (!payment) return R.notFound(res, 'Payment not found');
  if (!req.admin && payment.Order.user_id !== req.user.id) return R.forbidden(res);
  const history = await PaymentStatusHistory.findAll({ where: { payment_id: payment.id }, order: [['created_at', 'ASC']] });
  return R.success(res, 'History fetched', history);
};

// --- Admin-only ---

exports.initiateRefund = async (req, res) => {
  const { paymentId, amount } = req.body;
  const refund = await HdfcPaymentService.initiateRefund(paymentId, amount, req.admin.id, req.ip);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: 'Refund Initiated',
    description: `${req.admin.name} initiated a ₹${refund.amount} refund for payment #${paymentId}`,
    recordId: refund.payment_id, newValues: { amount: refund.amount, status: refund.status },
  });

  return R.created(res, 'Refund initiated', refund);
};

exports.getRefund = async (req, res) => {
  const refund = await Refund.findByPk(req.params.id);
  if (!refund) return R.notFound(res, 'Refund not found');
  return R.success(res, 'Refund fetched', refund);
};

// Lists every received payment transaction (HDFC, COD, and any legacy
// Razorpay rows) — not just HDFC as this originally only supported.
// `gateway` is only ever set to 'hdfc' (null for COD/Razorpay), while
// `method` is only populated for COD ('cod') today — see constants/index.js's
// PAYMENT_METHOD. A "method" filter has to check both columns to mean
// anything to an admin who just sees "HDFC" / "COD" / "Razorpay" as options.
exports.adminListPayments = async (req, res) => {
  const { getPagination, getPaginationMeta } = require('../utils/pagination');
  const { page, limit, offset } = getPagination(req.query);
  const { status, method, date_from, date_to } = req.query;

  const where = {};
  if (status) where.status = status;
  if (method) where[Op.or] = [{ gateway: method }, { method }];
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at[Op.gte] = new Date(date_from);
    if (date_to) where.created_at[Op.lte] = new Date(`${date_to}T23:59:59.999Z`);
  }

  const include = [{
    model: Order,
    attributes: ['id', 'order_number', 'total', 'status', 'payment_status'],
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
  }];

  const [{ rows, count }, summaryRows] = await Promise.all([
    // gateway_response is a large raw HDFC/Juspay JSON blob (full transaction
    // detail, EMI info, etc.) — needed on a payment detail view, not a list.
    Payment.findAndCountAll({ where, include, attributes: { exclude: ['gateway_response'] }, order: [['created_at', 'DESC']], limit, offset }),
    // Overall totals across every payment matching the current filters —
    // not just the current page — so the summary cards stay accurate
    // regardless of which page an admin is looking at.
    Payment.findAll({
      where,
      attributes: ['status', [fn('COUNT', col('Payment.id')), 'count'], [fn('SUM', col('amount')), 'total']],
      group: ['status'],
      raw: true,
    }),
  ]);

  const summary = {
    totalCount: summaryRows.reduce((s, r) => s + parseInt(r.count, 10), 0),
    totalReceived: summaryRows.filter((r) => r.status === 'paid').reduce((s, r) => s + parseFloat(r.total || 0), 0),
    byStatus: summaryRows.reduce((acc, r) => ({ ...acc, [r.status]: { count: parseInt(r.count, 10), total: parseFloat(r.total || 0) } }), {}),
  };

  return R.paginated(res, 'Payments fetched', rows, getPaginationMeta(count, page, limit), { summary });
};

exports.adminListRefunds = async (req, res) => {
  const { getPagination, getPaginationMeta } = require('../utils/pagination');
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await Refund.findAndCountAll({
    include: [{ model: Payment, include: [{ model: Order, attributes: ['id', 'order_number'] }] }],
    order: [['created_at', 'DESC']],
    limit, offset,
  });
  return R.paginated(res, 'Refunds fetched', rows, getPaginationMeta(count, page, limit));
};
