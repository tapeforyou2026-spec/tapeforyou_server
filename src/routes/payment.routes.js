const router = require('express').Router();
const ctrl = require('../controllers/PaymentController');
const { protect, adminProtect } = require('../middlewares/auth');
const hdfcWebhookAuth = require('../middlewares/hdfcWebhookAuth');
const validate = require('../middlewares/validate');
const v = require('../validators/payment.validator');

// Webhook — unprotected by JWT — HDFC calls this directly with Basic Auth
// (hdfcWebhookAuth), not a customer/admin token.
router.post('/webhook', hdfcWebhookAuth, ctrl.webhook);

// Return-URL bridge — unprotected (the customer's browser hits this
// directly from HDFC's hosted page, with no app session/token available at
// that point). Accepts GET or POST — see PaymentController.hdfcReturnBridge
// for why POST support matters here.
router.all('/hdfc/return-bridge', ctrl.hdfcReturnBridge);

// Admin-only routes — deliberately registered BEFORE `router.use(protect)`
// below. `router.use(protect)` applies to every route registered after it
// on this router instance; putting these admin routes after it would mean
// a request hits `protect` (which requires a customer/`type:'user'` token)
// FIRST and gets rejected before `adminProtect` ever runs — a real bug
// caught via a live test with a real admin token (got "Unauthorized" from
// `protect`, not from a missing role, before this fix). Refunds are
// admin-initiated only, matching this project's existing pattern for every
// other money-affecting action (mark-paid, coupon management) — no
// separate superAdmin gate, same reasoning as Products/Orders/Dashboard.
router.post('/refund', adminProtect, validate(v.initiateRefund), ctrl.initiateRefund);
router.get('/refund/:id', adminProtect, ctrl.getRefund);
router.get('/admin/list', adminProtect, ctrl.adminListPayments);
router.get('/admin/refunds', adminProtect, ctrl.adminListRefunds);

// --- Customer routes (below this line only) ---
router.use(protect);
router.post('/session', validate(v.createSession), ctrl.createSession);
router.post('/retry', validate(v.createSession), ctrl.retry);
// Deliberately NOT run through the shared validate() middleware — it
// strips any body field not explicitly listed in the Joi schema
// (`stripUnknown: true`), but this endpoint must preserve every return-URL
// query param verbatim (signature, signature_algorithm, and whatever else
// HDFC appends) for verifyReturnUrlSignature() to check. orderId itself is
// validated directly in the controller instead.
router.post('/verify', ctrl.verify);
router.get('/status/:paymentId', ctrl.getStatus);
router.get('/history/:paymentId', ctrl.getHistory);
router.get('/order/:orderId', ctrl.getPaymentByOrder);

// Generic single-payment fetch — must stay last (most general pattern).
router.get('/:id', ctrl.getPayment);

module.exports = router;
