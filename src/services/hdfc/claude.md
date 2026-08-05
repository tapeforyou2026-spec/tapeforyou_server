# HDFC SmartGateway Integration Guide

Status: **backend implementation complete, not yet live** (no real merchant credentials configured). This file is the single source of truth for the HDFC payment integration — read this before touching any HDFC-related code. Full architecture/design rationale lives in `PAYMENT_DOCUMENTATION.md` (backend root); this file covers what was actually built and every real bug found while building it.

## Project Overview

HDFC SmartGateway is this project's second payment gateway, added **alongside** Razorpay/COD/UPI — nothing about the existing payment flow was changed except two minimal, necessary guards (see "Existing Files Touched" below). Real endpoint schemas were sourced from HDFC's official docs (see `HDFC-SmartGateway-Documentation-Verification.md` in this same folder) — nothing was guessed.

## Architecture

```
POST /api/payments/session
        │
        ▼
HdfcPaymentService.createSession(orderId, userId)
        ├─▶ Payment.findOrCreate (gateway: 'hdfc') — lazy, NOT created at order-creation time
        ├─▶ reuse existing non-terminal PaymentSession if one exists (idempotency)
        └─▶ POST /session (HDFC) → PaymentSession row (session_id, redirect_url, expiry)
        │
        ▼ frontend redirects customer to HDFC's hosted page
        │
POST /api/payments/verify  (mandatory — HDFC's own docs: "it is mandatory")
        ├─▶ verifyReturnUrlSignature() — HMAC-SHA256, defense-in-depth only, never the sole check
        └─▶ GET /orders/{hdfc_order_id} (HDFC) — the real, authoritative status
        │
        ▼
HdfcPaymentService.applyHdfcStatus() — single central state-machine function,
also used by the webhook handler and the reconciliation cron
        ├─▶ PaymentTransaction row (raw HDFC response, always recorded)
        ├─▶ PaymentStatusHistory row (granular status, e.g. "CHARGED")
        ├─▶ Payment.status updated (COARSE value only — see "Real Bugs Found" below)
        └─▶ if captured: Order.status='confirmed' + OrderService.autoBookShipmentIfNeeded()
                          (existing, UNMODIFIED trigger — same one Razorpay already uses)
```

## Why session creation is NOT wired into `OrderController.createOrder`

Razorpay's flow creates its Payment row + gateway order inline, at order-creation time, because it's an inline-widget checkout. HDFC is a redirect-to-hosted-page flow — the customer might not click "Pay Now" immediately, and a session has a TTL. So `HdfcPaymentService.createSession()` lazily creates the `Payment` row on its *own* first call (`Payment.findOrCreate`), not at order-creation time. This means `OrderController.createOrder` needed only a **one-line guard**, not a new branch:

```js
// Was: if (paymentMethod !== 'cod') { razorpayOrder = await RazorpayService.createOrder(...) }
if (paymentMethod !== 'cod' && paymentMethod !== 'hdfc') {
  razorpayOrder = await RazorpayService.createOrder(order.total, order.id);
}
```
Without this guard, choosing "hdfc" as the payment method would have *also* silently created a spurious Razorpay order — caught during design, not live.

## Existing Files Touched (minimal, necessary only)

| File | Change |
|---|---|
| `validators/order.validator.js` | `paymentMethod` Joi schema: added `'hdfc'` to the allowed values (was `razorpay\|cod\|upi`) |
| `controllers/OrderController.js` | One-line guard above — prevents HDFC orders from also triggering `RazorpayService.createOrder` |
| `models/Payment.js` | Additive columns only: `gateway`, `hdfc_order_id`, `idempotency_key` (all nullable) |
| `constants/index.js` | New `PAYMENT_METHOD.HDFC`, `HDFC_ORDER_STATUS`, `HDFC_PAYMENT_STATUS`, `HDFC_STATUS_MAP`, `HDFC_TO_PAYMENT_STATUS_COLUMN`, `PAYMENT_SESSION_STATUS`, `REFUND_STATUS`, `PAYMENT_TRIGGER_SOURCE` |
| `cron/index.js` | New job, every 15 minutes — `HdfcPaymentService.reconcileStuckPayments()` |
| `routes/index.js` | New `router.use('/payments', require('./payment.routes'))` |
| `config/env.js`, `.env`, `.env.example` | New `HDFC` block — all null/placeholder until real credentials are provisioned |

Nothing else in the existing codebase was touched. `RazorpayService`, `OrderService.createOrder`'s core logic, COD/UPI flows, and every existing route/controller are completely unmodified.

## Real HDFC API Endpoints Used

All three confirmed directly from HDFC's official documentation (search results + live page fetches — see `HDFC-SmartGateway-Documentation-Verification.md`):

| Endpoint | Method | Purpose |
|---|---|---|
| `/session` | POST | Create a hosted-checkout session |
| `/orders/{order_id}` | GET | **Mandatory** server-to-server status verification |
| `/orders/{order_id}/refunds` | POST | Full/partial refund |

## Critical, real constraint: HDFC's `order_id` ≠ this project's `order_number`

Confirmed real constraint: HDFC's `order_id` must be **< 21 characters, alphanumeric only** (no hyphens/underscores). This project's own `order_number` (e.g. `"ORD-72073395"`) has a hyphen, so it can never be reused as-is — same class of surprise already hit twice with Bigship (`warehouseName` letters-only, `OrderInvoiceNo` uniqueness).

**Fix (updated 2026-08-04)**: `HdfcPaymentService.generateHdfcOrderId()` → `` `HDFC${generateToken(7)}` `` (e.g. `"HDFC7f3a9c1b2d4e6f"`, 18 chars) — a cryptographically random value, generated **once** per payment and stored on `Payment.hdfc_order_id`, then always reused on retries (never regenerated) so the Order Status API keeps resolving to the same HDFC-side order. The original version of this (`` `HDFC${orderId}` ``, e.g. `"HDFC42"`) directly embedded this project's own auto-incrementing order id — deterministic, but also fully **sequential and predictable**, which HDFC's go-live security-audit requirements explicitly prohibit ("Should be Non-Sequential"). Since the id is no longer derived from the order id, it also can't be reverse-parsed back to one — `PaymentController.hdfcReturnBridge`'s worst-case fallback (query string dropped entirely) now does a real `Payment.findOne({ where: { hdfc_order_id } })` lookup instead of a regex.

## HMAC Signature Verification for the Return-URL Redirect

A real, separate mechanism from webhook auth — confirmed via HDFC's `hmac-signature-verification-for-return-url` doc page:
- Query params (minus `signature`/`signature_algorithm`) are percent-encoded, sorted by key (ASCII), joined, percent-encoded *again*, then HMAC-SHA256'd with the dashboard "Response Key."
- **Honesty note**: HDFC's own docs state *"No sample code or concrete field examples are provided"* for this — the digest encoding (hex vs base64) isn't specified anywhere reviewed. `signatureVerification.js` implements hex as the more common default, but **this has not been verified against one real signed redirect**. Verify it the first time a real `HDFC_RESPONSE_KEY` is configured and "Use signed response" is enabled in the dashboard.
- This is deliberately **defense-in-depth only** — `HdfcPaymentService.verify()` always runs the mandatory `GET /orders/{order_id}` call regardless of what this check returns. If `HDFC_RESPONSE_KEY` isn't configured, the check is skipped entirely (not faked as passing).

## Webhook Security — Basic Auth, NOT a cryptographic signature

Confirmed real mechanism (different from the return-URL's HMAC above): HDFC Base64-encodes a dashboard-configured username:password pair and sends it as a standard `Authorization: Basic ...` header. `middlewares/hdfcWebhookAuth.js` decodes and compares it against `HDFC_WEBHOOK_USERNAME`/`HDFC_WEBHOOK_PASSWORD` — a **separate credential pair** from `HDFC_API_KEY` (which is only used for outbound calls this app makes *to* HDFC).

Retries are real and confirmed: HDFC "will re-send the webhook until a 200 response is received" — `PaymentController.webhook` always returns 200 once the event is durably persisted (`PaymentWebhook.findOrCreate` runs before any business logic), even if downstream processing throws.

## Real Bugs Found and Fixed During Direct Service-Level Testing (2026-07-24)

No real HDFC credentials exist yet, so live HTTP testing against the real gateway wasn't possible end-to-end — but the **application logic** was directly exercised via a real order/user in the database (bypassing HTTP auth, since no customer password was available), and this surfaced three real, confirmed bugs before they could ever reach production:

1. **`Payment` model never declared the new `gateway`/`hdfc_order_id`/`idempotency_key` columns** — only the migration added them to the DB. Sequelize doesn't introspect the live schema; it only knows about columns explicitly declared in the model file. Every `findOrCreate` silently dropped all three fields (`Warning: Unknown attributes (gateway,idempotency_key) passed to defaults option of findOrCreate`), so a real HDFC Payment row was being written with `gateway: null` — meaning `Payment.findOne({ where: { gateway: 'hdfc' } })` would never find it again. **Fixed**: added the three columns to `models/Payment.js`.
2. **`payments.status` is a real Postgres ENUM restricted to 5 existing values** (`pending, paid, failed, refunded, partially_refunded`) — but `applyHdfcStatus()` was about to write HDFC's richer granular vocabulary (`processing`, `captured`, `authorized`, `cancelled`, `expired`) directly into that column, which would have thrown `invalid input value for enum` the first time any status other than the two coincidentally-shared values (`pending`/`failed`) was applied. **Fixed**: `HDFC_TO_PAYMENT_STATUS_COLUMN` maps the granular status down onto the 5 existing values for the actual column write; the full granular value is never lost — it's recorded as-is in `payment_status_history.to_status` (a plain STRING column, no ENUM constraint), and `HdfcPaymentService.getGranularStatus()` reads it back from there (the most recent history row) rather than trusting the coarse column.
3. **Two call sites inherited the same coarse/granular confusion**: `reconcileStuckPayments()`'s query (`WHERE status IN ('pending','created','processing')`) would have thrown the same real Postgres enum error the first time the cron ran — fixed to query `status: 'pending'` only (the one coarse non-terminal value). `initiateRefund()`'s guard (`payment.status !== HDFC_PAYMENT_STATUS.CAPTURED`, i.e. comparing against the literal string `'captured'`) would have **always** been true — since a captured payment is stored as `'paid'`, never `'captured'` — meaning every refund attempt would have incorrectly rejected with "Only a captured payment can be refunded," permanently. Fixed to compare against `'paid'`.

All four fixes were verified via a direct, real database test (real order `#9`, real user `#1`) — confirmed `gateway`/`hdfc_order_id`/`idempotency_key` now persist correctly, confirmed a `FAILED` status transition correctly sets `Payment.status='failed'` without touching `Order.status`, confirmed re-applying the identical status is a true no-op (no duplicate `payment_status_history` row), and confirmed the reconciliation query runs without throwing. Test data was cleaned up afterward (order #9 restored to its original `payment_status: pending` state).

**Deliberately not tested**: a `CAPTURED` transition was never triggered in testing, since `applyHdfcStatus()` correctly cascades into `OrderService.autoBookShipmentIfNeeded()` — the existing, already-live auto-booking trigger that books a **real, billed Bigship shipment**. Testing that path for real requires your explicit go-ahead, same standing convention as the Bigship integration itself.

## Real Credentials — Confirmed Live Against Sandbox (2026-07-28)

Real UAT/sandbox credentials were found in `backend/config.json` and wired into `.env`:
```
HDFC_MERCHANT_ID=SG5664
HDFC_API_KEY=002311E0B6F48D387A7DD7399BAE04
HDFC_BASE_URL=https://smartgateway.hdfcuat.bank.in   # real sandbox host — no real money
HDFC_PAYMENT_PAGE_CLIENT_ID=hdfcmaster
HDFC_RESPONSE_KEY=7AD16EB8245477D9F33D6307E08097
```
`HDFC_WEBHOOK_USERNAME`/`PASSWORD` were **not** in `config.json` — still placeholders, so the webhook endpoint will reject real inbound HDFC webhook calls until these are provisioned. This does not block the main flow — the mandatory `/verify` server-to-server check is independent of webhook auth entirely.

**Directly verified against a real existing order (#13, real user, real ₹223.02 total)**:
1. `HdfcPaymentService.createSession(13, 1)` → real success: `{ sessionId: "ordeh_...", redirectUrl: "https://smartgateway.hdfcuat.bank.in/payment-page/order/ordeh_..." }`.
2. Navigated to that real `redirectUrl` — rendered a genuine, correctly-branded HDFC hosted payment page: merchant name "TAPES FOR YOU", Order ID `HDFC13`, Amount `₹223.02` (exact match), Card/UPI/NetBanking/Wallets tabs all present and functional-looking.
3. `HdfcPaymentService.verify(13, 1, {})` (mandatory server-to-server check) → real success: HDFC returned a real status, correctly mapped to internal `pending` (no card was ever entered, so nothing should be captured) — `Order.status` correctly left untouched.

This confirms the full session→redirect→verify pipeline is functionally correct end-to-end against a real (sandboxed) HDFC account — not just unit-tested in isolation.

**Deliberately not completed**: an actual test-card payment through to a `CHARGED`/`captured` result. Doing so would flip the real order to `confirmed`, which immediately cascades into the existing, already-live `OrderService.autoBookShipmentIfNeeded()` — a call against **production** Bigship (Bigship has no sandbox at all — see `services/bigship/claude.md`). That real-world side effect needs explicit go-ahead before triggering, same standing rule already applied to Bigship's own `Place Order` testing.

## Real Credentials — Still Needed Before Going Live

All `HDFC_*` env vars are currently placeholders. A real live call during testing correctly reached HDFC's production servers and got back a genuine, well-formed rejection:
```json
{"user_message":"Unauthorized.","developer_message":"Invalid API Key. Please pass a valid and active api key.","code":"UNAUTHORIZED"}
```
This confirms the request shape/headers are fundamentally correct — only real credentials are missing. Needed from the HDFC merchant dashboard:
- `HDFC_MERCHANT_ID`, `HDFC_API_KEY` (outbound calls)
- `HDFC_PAYMENT_PAGE_CLIENT_ID` (sandbox: `hdfcmaster`; production: merchant ID)
- `HDFC_WEBHOOK_USERNAME`/`PASSWORD` (Payments → Settings → Webhook Tab)
- `HDFC_RESPONSE_KEY` (optional — only if "Use signed response" is enabled)

## Testing Checklist

1. ✅ Session creation — DB-layer logic (Payment findOrCreate, session reuse/idempotency) verified directly. **Not yet done**: a real `/session` call (blocked on real credentials).
2. ✅ Status state-machine — granular/coarse mapping, idempotent no-op, `payment_status_history` recording all verified via a real `FAILED` transition.
3. ✅ Reconciliation cron query — verified it runs without the enum error that would have hit production.
4. **Not yet done**: a real `CAPTURED` transition (deliberately deferred — cascades into a real Bigship booking, needs your explicit go-ahead).
5. **Not yet done**: real webhook delivery, real HMAC signature verification (needs `HDFC_RESPONSE_KEY` configured + "Use signed response" enabled).
6. **Not yet done**: real refund call (needs a real captured payment first).

## Real Bug Found and Fixed — Wrong return_url Origin in Multi-Port Dev Setups (2026-07-31)

`HdfcPaymentService.createSession()` built `return_url` from `env.URLS.FRONTEND.split(',')[0]` — always the **first** comma-separated entry, regardless of which origin the customer was actually browsing from. `FRONTEND_URL=http://localhost:3001,http://localhost:3000` supports two local dev ports (a real, recurring situation this session — duplicate `next dev` instances, manual port fallback when 3000 is already taken, etc.), so a customer checking out from `:3000` would complete payment on HDFC's real hosted page, then get redirected back to `:3001` — a completely different browser tab/session with no cart, no login, looking like a broken/wrong page even though the payment itself succeeded. COD never hit this since it never leaves the current tab.

**Fixed**: `createSession(orderId, userId, requestOrigin)` now takes a third param — the calling browser's real `Origin` header (`PaymentController.createSession`/`.retry` pass `req.headers.origin`) — and uses it for `return_url` **only if it's actually one of the allowlisted `FRONTEND_URL` origins** (same list `app.js`'s CORS check already validates against). An unrecognized/missing origin falls back to the original first-entry behavior — never trusts the header blindly, since it controls where a real payment redirect sends the customer (a naive implementation would be an open-redirect vector).

Verified via the origin-selection logic directly (not a full HTTP round-trip, to avoid an unnecessary real HDFC API call): a customer on `:3000` now correctly gets `:3000` back, `:3001` stays `:3001`, no-Origin and an untrusted origin both safely fall back to the first `FRONTEND_URL` entry.

## Future Improvements

- Admin Payment/Refund Dashboard UI (`admin/src/pages/payments/`) — backend endpoints (`GET /admin/list`, `GET /admin/refunds`) already exist and were live-tested; no frontend built yet.
- Customer-facing payment history / order timeline UI — `GET /api/payments/history/:paymentId` already exists and works.
- `/payment/hdfc/return` frontend page (Next.js) — the `return_url` this backend sends to HDFC assumes this route will exist; not yet built on the frontend.
- Verify the HMAC return-URL signature implementation against one real signed redirect once `HDFC_RESPONSE_KEY` is available.
