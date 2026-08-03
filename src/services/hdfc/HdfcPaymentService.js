const crypto = require('crypto');
const {
  sequelize, Order, User, Payment, PaymentSession, PaymentTransaction,
  PaymentLog, PaymentWebhook, PaymentStatusHistory, PaymentAudit, Refund, RefundTransaction,
} = require('../../models');
const HdfcGatewayService = require('./HdfcGatewayService');
const { verifyReturnUrlSignature } = require('./signatureVerification');
const {
  HDFC_STATUS_MAP, HDFC_PAYMENT_STATUS, HDFC_TO_PAYMENT_STATUS_COLUMN, PAYMENT_SESSION_STATUS,
  REFUND_STATUS, PAYMENT_TRIGGER_SOURCE,
} = require('../../constants');
// eslint-disable-next-line import/no-cycle -- safe: OrderService never requires HdfcPaymentService (same pattern as RazorpayService already uses)
const OrderService = require('../OrderService');
const NotificationService = require('../NotificationService');
const logger = require('../../utils/logger');
const env = require('../../config/env');

const TERMINAL_PAYMENT_STATUSES = [
  HDFC_PAYMENT_STATUS.CAPTURED,
  HDFC_PAYMENT_STATUS.FAILED,
  HDFC_PAYMENT_STATUS.CANCELLED,
];
const TERMINAL_SESSION_STATUSES = [
  PAYMENT_SESSION_STATUS.EXPIRED,
  PAYMENT_SESSION_STATUS.SUPERSEDED,
  PAYMENT_SESSION_STATUS.CONSUMED,
];

class HdfcPaymentService {
  // HDFC's `order_id` must be <21 chars, alphanumeric only (confirmed real
  // constraint) — this project's own "ORD-72073395" order_number has a
  // hyphen, so it's never reused as-is. Deterministic (not timestamped,
  // unlike Bigship's OrderInvoiceNo) since the SAME hdfc order_id must be
  // reused across retries for the Order Status API to find the right order.
  buildHdfcOrderId(orderId) {
    return `HDFC${orderId}`;
  }

  generateIdempotencyKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Refund's unique_request_id has the same <=21-char constraint. Keeps a
  // few chars for the payment id so it's still traceable in logs.
  generateRefundRequestId(paymentId) {
    return `rf${paymentId}${crypto.randomBytes(4).toString('hex')}`.slice(0, 21);
  }

  async logApiCall({ paymentId, direction, endpoint, httpStatus, requestBody, responseBody }) {
    try {
      await PaymentLog.create({
        payment_id: paymentId, direction, endpoint,
        http_status: httpStatus || null, request_body: requestBody || null, response_body: responseBody || null,
      });
    } catch (err) {
      logger.error(`HdfcPaymentService: failed to write payment_log: ${err.message}`);
    }
  }

  async recordAudit({ paymentId, actorId = null, actorType = 'system', action, oldValues, newValues, ip = null }) {
    try {
      await PaymentAudit.create({ payment_id: paymentId, actor_id: actorId, actor_type: actorType, action, old_values: oldValues || null, new_values: newValues || null, ip_address: ip });
    } catch (err) {
      logger.error(`HdfcPaymentService: failed to write payment_audit: ${err.message}`);
    }
  }

  // The granular HDFC_PAYMENT_STATUS of a payment is NOT stored on
  // `payments.status` (that column is a real Postgres ENUM restricted to
  // the 5 existing pending/paid/failed/refunded/partially_refunded values —
  // see HDFC_TO_PAYMENT_STATUS_COLUMN in constants/index.js) — it's derived
  // from the most recent `payment_status_history` row instead, which is a
  // plain STRING column with no such constraint.
  async getGranularStatus(paymentId) {
    const latest = await PaymentStatusHistory.findOne({ where: { payment_id: paymentId }, order: [['created_at', 'DESC']] });
    return latest ? latest.to_status : HDFC_PAYMENT_STATUS.PENDING;
  }

  // Single central status-update function — used by verify(), the webhook
  // handler, AND the reconciliation cron, so all three apply the exact same
  // idempotent state-machine logic (see PAYMENT_DOCUMENTATION.md Part 2's
  // "Payment Status Update Flow"). Never applies an already-applied
  // transition twice, and only triggers Order-confirm on a genuine
  // pending/processing -> captured transition.
  async applyHdfcStatus(payment, hdfcStatus, rawResponse, triggerSource) {
    const mapped = HDFC_STATUS_MAP[hdfcStatus];
    if (!mapped) {
      logger.error(`HdfcPaymentService: unrecognized HDFC status "${hdfcStatus}" for payment #${payment.id} — leaving status untouched`);
      return payment;
    }

    await PaymentTransaction.create({
      payment_id: payment.id,
      txn_id: rawResponse?.txn_id || null,
      txn_uuid: rawResponse?.txn_uuid || null,
      hdfc_status: hdfcStatus,
      amount: rawResponse?.amount ? parseFloat(rawResponse.amount) : payment.amount,
      raw_response: rawResponse || null,
    });

    const fromStatus = await this.getGranularStatus(payment.id);
    if (TERMINAL_PAYMENT_STATUSES.includes(fromStatus)) {
      // Already resolved (e.g. redirect-verify and webhook both firing for
      // the same result) — the transaction row above still records this
      // confirmation, but the status itself is a no-op.
      return payment;
    }
    if (fromStatus === mapped) return payment; // idempotent no-op — no real transition

    const columnStatus = HDFC_TO_PAYMENT_STATUS_COLUMN[mapped];
    await payment.update({ status: columnStatus, gateway_response: rawResponse || payment.gateway_response });
    await PaymentStatusHistory.create({ payment_id: payment.id, from_status: fromStatus, to_status: mapped, trigger_source: triggerSource });
    await this.recordAudit({ paymentId: payment.id, action: `Status: ${fromStatus} -> ${mapped}`, oldValues: { status: fromStatus }, newValues: { status: mapped } });

    if (mapped === HDFC_PAYMENT_STATUS.CAPTURED) {
      // Same two effects RazorpayService.capturePayment already produces for
      // the existing gateway — Order confirm + the existing (unmodified)
      // auto-book-shipment trigger.
      await Order.update({ payment_status: 'paid', status: 'confirmed' }, { where: { id: payment.order_id } });
      await OrderService.autoBookShipmentIfNeeded(payment.order_id);
      await NotificationService.notifyAdmins({
        type: 'payment',
        title: 'HDFC Payment Captured',
        body: `Payment #${payment.id} for order #${payment.order_id} captured via HDFC SmartGateway.`,
        data: { payment_id: payment.id, order_id: payment.order_id },
      });
    } else if (mapped === HDFC_PAYMENT_STATUS.FAILED || mapped === HDFC_PAYMENT_STATUS.CANCELLED) {
      await NotificationService.notifyAdmins({
        type: 'payment',
        title: 'HDFC Payment Failed',
        body: `Payment #${payment.id} for order #${payment.order_id} failed (${hdfcStatus}).`,
        data: { payment_id: payment.id, order_id: payment.order_id },
      });
    }

    return payment;
  }

  // --- Session creation --- idempotent: reuses an existing non-terminal
  // session for this payment rather than minting a new HDFC session on
  // every call (duplicate-tab / duplicate-click protection, see
  // PAYMENT_DOCUMENTATION.md Part 3).
  // `requestOrigin` is the calling browser's real Origin header (e.g.
  // "http://localhost:3000") — used to build the return_url HDFC redirects
  // back to. Previously this always used FRONTEND_URL's *first*
  // comma-separated entry regardless of which origin the customer was
  // actually on (FRONTEND_URL supports multiple dev ports, e.g.
  // "http://localhost:3001,http://localhost:3000") — so a customer
  // checking out from :3000 would get redirected back to :3001 after
  // paying, landing on a different browser session/cart entirely. Only
  // trusted if it's actually one of the allowlisted origins (same list CORS
  // already validates against) — never used unvalidated, since this
  // controls where HDFC sends the customer after a real payment.
  async createSession(orderId, userId, requestOrigin) {
    const order = await Order.findByPk(orderId, { include: [{ model: User }] });
    if (!order) { const e = new Error('Order not found'); e.statusCode = 404; throw e; }
    if (order.user_id !== userId) { const e = new Error('Unauthorized'); e.statusCode = 403; throw e; }
    if (order.payment_status === 'paid') { const e = new Error('This order is already paid'); e.statusCode = 409; throw e; }

    const [payment] = await Payment.findOrCreate({
      where: { order_id: order.id },
      defaults: {
        order_id: order.id, amount: order.total, currency: 'INR',
        status: HDFC_PAYMENT_STATUS.PENDING, gateway: 'hdfc',
        idempotency_key: this.generateIdempotencyKey(),
      },
    });

    const existingSession = await PaymentSession.findOne({
      where: { payment_id: payment.id, status: [PAYMENT_SESSION_STATUS.CREATED, PAYMENT_SESSION_STATUS.ACTIVE] },
      order: [['created_at', 'DESC']],
    });
    if (existingSession && (!existingSession.expires_at || existingSession.expires_at > new Date())) {
      return { sessionId: existingSession.session_id, redirectUrl: existingSession.redirect_url, reused: true };
    }
    if (existingSession) {
      await existingSession.update({ status: PAYMENT_SESSION_STATUS.EXPIRED });
    }

    const hdfcOrderId = this.buildHdfcOrderId(order.id);
    if (!payment.hdfc_order_id) await payment.update({ hdfc_order_id: hdfcOrderId });

    const allowedFrontendOrigins = env.URLS.FRONTEND.split(',').map((s) => s.trim());
    const frontendBase = (requestOrigin && allowedFrontendOrigins.includes(requestOrigin))
      ? requestOrigin
      : allowedFrontendOrigins[0];
    // Routed through our own backend's /hdfc/return-bridge rather than
    // straight to the frontend page — the SmartGateway dashboard's "Enable
    // POST method support for return URL" toggle (on for this merchant
    // account, and not editable from the dashboard — see
    // PaymentController.hdfcReturnBridge for the full story) makes HDFC
    // auto-submit a POST form to return_url instead of a GET redirect, which
    // the frontend's plain client-side page can't read at all. The bridge
    // receives whatever HDFC actually sends (GET or POST) and 303-redirects
    // to this same frontend path as a clean GET with query params.
    const returnUrl = `${env.URLS.BASE}/api/v1/payments/hdfc/return-bridge?orderId=${order.id}&fb=${encodeURIComponent(frontendBase)}`;
    const [firstName, ...lastParts] = (order.User?.name || '').split(' ');

    let response;
    try {
      response = await HdfcGatewayService.createSession({
        orderId: hdfcOrderId,
        amount: order.total,
        customerId: order.user_id,
        customerEmail: order.User?.email,
        customerPhone: order.User?.phone,
        returnUrl,
        firstName: firstName || undefined,
        lastName: lastParts.join(' ') || undefined,
        description: `Order ${order.order_number}`,
      });
      await this.logApiCall({ paymentId: payment.id, direction: 'outbound', endpoint: 'POST /session', httpStatus: 200, responseBody: response });
    } catch (err) {
      await this.logApiCall({ paymentId: payment.id, direction: 'outbound', endpoint: 'POST /session', httpStatus: 502, responseBody: { error: err.message } });
      throw err;
    }

    const session = await PaymentSession.create({
      payment_id: payment.id,
      session_id: response.id,
      redirect_url: response.payment_links?.web,
      status: PAYMENT_SESSION_STATUS.ACTIVE,
      expires_at: response.payment_links?.expiry ? new Date(response.payment_links.expiry) : null,
    });

    return { sessionId: session.session_id, redirectUrl: session.redirect_url, reused: false };
  }

  // --- Mandatory server-to-server verification ---
  // Per HDFC's own docs: "it is mandatory to do a Server-to-Server Order
  // Status API call to determine the final payment status" — the
  // returnUrlParams' signature (if HDFC_RESPONSE_KEY is configured) is
  // checked first as a defense-in-depth layer, but this call always runs
  // regardless of that result — never trust the redirect alone.
  async verify(orderId, userId, returnUrlParams = {}) {
    const order = await Order.findByPk(orderId);
    if (!order) { const e = new Error('Order not found'); e.statusCode = 404; throw e; }
    if (order.user_id !== userId) { const e = new Error('Unauthorized'); e.statusCode = 403; throw e; }

    const payment = await Payment.findOne({ where: { order_id: orderId, gateway: 'hdfc' } });
    if (!payment) { const e = new Error('No HDFC payment found for this order'); e.statusCode = 404; throw e; }

    const sigResult = verifyReturnUrlSignature(returnUrlParams);
    if (sigResult.verified === false) {
      logger.error(`HDFC return-URL signature check failed for order #${orderId} — proceeding to mandatory server-to-server verify anyway`);
    }

    // `payment.status` here is the coarse column value (pending/paid/failed/
    // refunded/partially_refunded), not the granular HDFC_PAYMENT_STATUS —
    // see HDFC_TO_PAYMENT_STATUS_COLUMN. A short-circuit here is purely an
    // optimization (skip a redundant HDFC call); applyHdfcStatus's own
    // granular idempotency check is what actually guarantees correctness.
    if (['paid', 'failed', 'refunded', 'partially_refunded'].includes(payment.status)) {
      return { status: payment.status, alreadyFinal: true };
    }

    let response;
    try {
      response = await HdfcGatewayService.getOrderStatus(payment.hdfc_order_id, order.user_id);
      await this.logApiCall({ paymentId: payment.id, direction: 'outbound', endpoint: `GET /orders/${payment.hdfc_order_id}`, httpStatus: 200, responseBody: response });
    } catch (err) {
      await this.logApiCall({ paymentId: payment.id, direction: 'outbound', endpoint: `GET /orders/${payment.hdfc_order_id}`, httpStatus: 502, responseBody: { error: err.message } });
      throw err;
    }

    // Confirmed real guidance: "verify the order ID and amount" — not just
    // that the call succeeded.
    if (response.order_id !== payment.hdfc_order_id) {
      logger.error(`HDFC verify order_id mismatch for payment #${payment.id}: expected ${payment.hdfc_order_id}, got ${response.order_id}`);
      const e = new Error('Order verification mismatch — flagged, not applied');
      e.statusCode = 409;
      throw e;
    }

    await this.applyHdfcStatus(payment, response.status, response, PAYMENT_TRIGGER_SOURCE.REDIRECT);
    return { status: payment.status, alreadyFinal: false, signatureVerified: sigResult.verified };
  }

  // --- Webhook processing --- dedup by HDFC's own event id (confirmed real
  // field, e.g. "evt_V2_..."). Same applyHdfcStatus() as verify() above.
  async processWebhookEvent(payload) {
    const eventId = payload?.id;
    if (!eventId) throw new Error('Webhook payload missing event id');

    const [webhook, created] = await PaymentWebhook.findOrCreate({
      where: { event_id: eventId },
      defaults: { event_id: eventId, event_name: payload.event_name || 'UNKNOWN', raw_payload: payload },
    });
    if (!created) return { deduped: true }; // already processed — 200, no-op

    const orderPayload = payload.content?.order;
    if (!orderPayload?.order_id) {
      logger.error(`HDFC webhook ${eventId} has no content.order.order_id — cannot resolve to a payment`);
      return { deduped: false, resolved: false };
    }

    const payment = await Payment.findOne({ where: { hdfc_order_id: orderPayload.order_id, gateway: 'hdfc' } });
    if (!payment) {
      logger.error(`HDFC webhook ${eventId} references unknown hdfc_order_id ${orderPayload.order_id}`);
      return { deduped: false, resolved: false };
    }

    await webhook.update({ payment_id: payment.id });
    await this.applyHdfcStatus(payment, orderPayload.status, orderPayload, PAYMENT_TRIGGER_SOURCE.WEBHOOK);
    await webhook.update({ processed: true, processed_at: new Date() });
    return { deduped: false, resolved: true };
  }

  // --- Reconciliation --- called by the cron job for any HDFC payment
  // stuck in a non-terminal state (crashed server, webhook never arrived,
  // customer never returned to the app). Same central applyHdfcStatus().
  async reconcileStuckPayments() {
    // `payments.status` only ever holds the coarse column value — 'pending'
    // is the only non-terminal one (see HDFC_TO_PAYMENT_STATUS_COLUMN).
    // Querying this ENUM column with granular HDFC_PAYMENT_STATUS values
    // like 'created'/'processing' would throw a real Postgres error
    // ("invalid input value for enum") since those aren't members of
    // enum_payments_status — caught via a direct service-level test before
    // this ever reached the live cron.
    const stuck = await Payment.findAll({
      where: { gateway: 'hdfc', status: 'pending' },
    });

    let checked = 0;
    for (const payment of stuck) {
      if (!payment.hdfc_order_id) continue;
      try {
        const order = await Order.findByPk(payment.order_id);
        const response = await HdfcGatewayService.getOrderStatus(payment.hdfc_order_id, order?.user_id);
        await this.applyHdfcStatus(payment, response.status, response, PAYMENT_TRIGGER_SOURCE.CRON);
        checked += 1;
      } catch (err) {
        logger.error(`Reconciliation failed for payment #${payment.id}: ${err.message}`);
      }
    }

    // Sessions past their expiry with no result also get marked expired —
    // purely a housekeeping status, not a payment-status change.
    await PaymentSession.update(
      { status: PAYMENT_SESSION_STATUS.EXPIRED },
      { where: { status: [PAYMENT_SESSION_STATUS.CREATED, PAYMENT_SESSION_STATUS.ACTIVE], expires_at: { [require('sequelize').Op.lt]: new Date() } } }
    );

    return { checked, total: stuck.length };
  }

  // --- Refund --- admin-only (matches this project's existing pattern for
  // money-affecting actions). Balance-guarded against the sum of prior
  // refunds, never trusting the caller's amount blindly.
  async initiateRefund(paymentId, amount, adminId, ip) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) { const e = new Error('Payment not found'); e.statusCode = 404; throw e; }
    // `payment.status` is the coarse column value — a captured HDFC payment
    // is stored there as 'paid', never literally 'captured' (see
    // HDFC_TO_PAYMENT_STATUS_COLUMN). Comparing against the granular
    // HDFC_PAYMENT_STATUS.CAPTURED constant here would never match, meaning
    // every refund attempt would incorrectly reject — caught via the same
    // direct service-level test that found the two bugs above.
    if (payment.status !== 'paid') {
      const e = new Error('Only a captured payment can be refunded');
      e.statusCode = 400;
      throw e;
    }

    const priorRefunds = await Refund.findAll({ where: { payment_id: paymentId, status: [REFUND_STATUS.PENDING, REFUND_STATUS.SUCCESS] } });
    const alreadyRefunded = priorRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const refundAmount = amount != null ? parseFloat(amount) : parseFloat(payment.amount) - alreadyRefunded;
    if (refundAmount <= 0 || refundAmount > parseFloat(payment.amount) - alreadyRefunded) {
      const e = new Error('Refund amount exceeds the remaining refundable balance');
      e.statusCode = 400;
      throw e;
    }

    const uniqueRequestId = this.generateRefundRequestId(paymentId);
    const refund = await Refund.create({
      payment_id: paymentId, unique_request_id: uniqueRequestId, amount: refundAmount,
      status: REFUND_STATUS.PENDING, initiated_by: adminId,
    });

    let response;
    try {
      response = await HdfcGatewayService.createRefund(payment.hdfc_order_id, {
        uniqueRequestId, amount: refundAmount, customerId: (await Order.findByPk(payment.order_id))?.user_id,
      });
      await this.logApiCall({ paymentId, direction: 'outbound', endpoint: `POST /orders/${payment.hdfc_order_id}/refunds`, httpStatus: 200, responseBody: response });
    } catch (err) {
      await refund.update({ status: REFUND_STATUS.FAILED, error_message: err.message });
      await this.logApiCall({ paymentId, direction: 'outbound', endpoint: `POST /orders/${payment.hdfc_order_id}/refunds`, httpStatus: 502, responseBody: { error: err.message } });
      throw err;
    }

    const refundEntry = (response.refunds || []).find((r) => r.unique_request_id === uniqueRequestId) || response;
    const newStatus = String(refundEntry.status || '').toLowerCase() === 'success' ? REFUND_STATUS.SUCCESS : REFUND_STATUS.PENDING;

    await refund.update({
      status: newStatus,
      hdfc_refund_id: refundEntry.id || null,
      error_code: refundEntry.error_code || null,
      error_message: refundEntry.error_message || null,
    });
    await RefundTransaction.create({ refund_id: refund.id, raw_response: response, status: newStatus });

    const totalRefunded = alreadyRefunded + (newStatus === REFUND_STATUS.SUCCESS ? refundAmount : 0);
    const fullyRefunded = totalRefunded >= parseFloat(payment.amount);
    if (newStatus === REFUND_STATUS.SUCCESS) {
      await Order.update(
        { payment_status: fullyRefunded ? 'refunded' : 'partially_refunded' },
        { where: { id: payment.order_id } }
      );
    }

    await this.recordAudit({ paymentId, actorId: adminId, actorType: 'admin', action: 'Refund Initiated', newValues: { amount: refundAmount, status: newStatus }, ip });
    return refund;
  }
}

module.exports = new HdfcPaymentService();
