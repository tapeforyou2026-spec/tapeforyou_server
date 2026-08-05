# HDFC SmartGateway — Go-Live / Security Audit Readiness

Status: **Roadmap only — nothing in this document has been implemented yet.** Per explicit instruction, this file documents (1) the requirements HDFC's bank team sent for the go-live security audit, (2) a point-by-point review of where this codebase already satisfies each requirement vs. where a real change is needed, (3) every database table and file involved in the payment integration for reference, and (4) the roadmap of what to change. **Implementation starts only after this roadmap is confirmed.**

Related docs (existing, technical "how it works" reference — not duplicated here): `PAYMENT_DOCUMENTATION.md`, `src/services/hdfc/claude.md`, `HDFC-SmartGateway-Documentation-Verification.md`.

---

## 1. HDFC's Requirements (from their integration email)

**General implementation notes:**
1. A unique customer ID must be passed for each customer.
2. `UDF2` must not be used for additional information — blocked for tokenization on HDFC's end.
3. Order number and amount on the response page should match what's shown on HDFC's own payment page.
4. The response page must show, in real time: Order number, Amount, Success message.

**Order ID format (hard constraint):**
1. Less than 21 characters.
2. No special characters.
3. Alphanumeric only.
4. **Non-sequential.**

**Package needed to initiate bank testing:**
- A. Step-by-step screenshots or a screen recording of the full successful payment flow, home page → final success page, with the browser address bar visible throughout.
- B. Order Status API response logs, for HDFC to verify.
- C. A filled-in merchant details table (account info, URLs, credentials, contact info — see §5 below).

**Security audit checklist (needs a Yes/No + confirmation per item):**
1. Unique order ID generation.
2. Request tampering — amount fetched from DB / validated via session, not trusted from the client.
3. Response tampering — encrypted response validated against the current session/order ID.
4. URL redirection validation.
5. Duplicate entry validation.
6. Receipt generation.
7. Valid, secure SSL.
8. General pre-audit checklist (unique order ID, DB-backed status, confirmation-by-DB-status, don't clear test data, etc.).

---

## 2. Compliance Review — Current State vs. Requirement

| # | Requirement | Status | Detail |
|---|---|---|---|
| 1 | Unique customer ID per customer | ✅ Already compliant | `HdfcPaymentService.createSession()` passes `order.user_id` as both the `x-customerid` header and `customer_id` body field (`HdfcGatewayService.createSession`) — every real customer has a unique, stable `user_id`. |
| 2 | Don't use UDF2 | ✅ Already compliant | Confirmed via a full grep of `src/` — no `UDF`/`udf` parameter is sent anywhere in this integration. Nothing to change. |
| 3 | Order number/amount on response page match HDFC's page | ⚠ Partial — needs a decision | **Amount** matches exactly (verified live: HDFC's hosted page and our DB both showed ₹223.02 for the same order). **Order number** does not match string-for-string: HDFC's page shows our internally-generated `hdfc_order_id` (e.g. `HDFC13`), while our own `/payment/hdfc/return` success page shows this project's own `order_number` (e.g. `TFY-73016183`). These are two different, both-valid identifiers for the same transaction. Needs a decision (see Roadmap) on whether to also surface the HDFC order ID on our response page for a 1:1 visual match during the audit. |
| 4 | Response page shows order number, amount, success message in real time | ✅ Already compliant | `app/payment/hdfc/return/page.js` (frontend) — on mount, calls the mandatory server-to-server `/payments/verify`, then renders order number, total, and a "Payment Successful!" state, all from the just-verified live order data (not cached). |
| Order ID: <21 chars | ✅ Compliant | `HDFC${orderId}` (e.g. `HDFC13`) — 6–10 chars typical, hard ceiling far under 21 for any realistic order volume. |
| Order ID: no special characters | ✅ Compliant | Digits + the literal prefix `HDFC` only. |
| Order ID: alphanumeric | ✅ Compliant | Same as above. |
| **Order ID: non-sequential** | ❌ **Real gap** | `buildHdfcOrderId(orderId)` in `services/hdfc/HdfcPaymentService.js` is `` `HDFC${orderId}` `` — a direct embed of this project's own auto-incrementing `orders.id` primary key. Order 13 → `HDFC13`, order 14 → `HDFC14`, etc. — **fully sequential and predictable**, which is exactly what this requirement prohibits. **Needs fixing — see Roadmap.** |
| Checklist 1: Unique order ID generation | ⚠ Needs the same fix as above | Currently unique (no two orders ever produce the same `hdfc_order_id`) but not non-sequential — same root cause as the order-ID-format gap. |
| Checklist 2: Request tampering (amount from DB, not client) | ✅ Already compliant | `createSession(orderId, ...)` loads `order.total` from the database (`Order.findByPk`) — the amount sent to HDFC is never taken from any client-supplied request body field. A tampered client request can change *which* order is being paid for (if it owns that order), but never the amount for a given order. |
| Checklist 3: Response tampering (encrypted response vs. session/order ID) | ✅ Already compliant, one caveat | The **mandatory** server-to-server Order Status API call (`HdfcPaymentService.verify()`) always runs regardless of what the browser's return-URL redirect claims — HDFC's own docs call this "mandatory," and this codebase never trusts the redirect alone. There is also an optional HMAC-SHA256 signature check on the return URL (`signatureVerification.js`) as defense-in-depth. **Caveat**: that HMAC implementation has never been verified against one real HDFC-signed redirect (no confirmed sample was available when it was built) — worth a real test once `HDFC_RESPONSE_KEY` + "Use signed response" are active in the live dashboard. |
| Checklist 4: URL redirection validation | ✅ Already compliant | `return_url` is only ever set to one of this project's own allowlisted frontend origins (`FRONTEND_URL` env var) — never a client-controlled value, closing off open-redirect risk. Combined with #3 above (never trusting the redirect's content), a tampered/replayed return-URL hit can't produce a false "paid" result. |
| Checklist 5: Duplicate entry validation | ✅ Already compliant | `createSession()` reuses any existing non-terminal `PaymentSession` for the same order instead of minting a new one on every call (prevents duplicate-tab/double-click sessions); `Payment.idempotency_key` is unique; the webhook handler dedupes by HDFC's own `event_id` (`PaymentWebhook.findOrCreate`) so a retried webhook never double-applies a status change. |
| Checklist 6: Receipt generation | ✅ Already available | A tax invoice PDF is generated automatically for every order (`InvoiceService.generateForOrder`, at order-creation time) and downloadable by the customer post-payment (`GET /orders/my/:id/invoice`). Worth confirming with HDFC whether this satisfies their "receipt" criterion or whether they specifically want a payment-transaction receipt distinct from the tax invoice. |
| Checklist 7: Valid, secure SSL | ⚠ Needs confirmation, not a code issue | Depends entirely on the final production domain's hosting config (Render/Vercel both provision HTTPS automatically) — nothing to change in this codebase, just needs confirming once the go-live domain is finalized. |

**Bottom line: exactly one real code gap exists — the non-sequential order ID requirement.** Everything else is already compliant, or is an operational/business detail (screenshots, filling in the merchant table, confirming SSL on the final domain) rather than something to build.

---

## 3. Database Tables Used by This Integration

| Table | Purpose | Key columns |
|---|---|---|
| `orders` | The merchant's own order record. Not payment-gateway-specific, but every payment traces back to one row here. | `id`, `order_number`, `total`, `status`, `payment_status`, `payment_method` |
| `payments` | One row per order's payment attempt (gateway-agnostic — also used by COD/legacy Razorpay). | `order_id`, `gateway` (`'hdfc'`/null), `hdfc_order_id`, `idempotency_key`, `amount`, `status` (coarse: pending/paid/failed/refunded/partially_refunded), `gateway_response` |
| `payment_sessions` | One row per HDFC hosted-checkout session created for a payment — reused across retries within its TTL rather than re-created. | `payment_id`, `session_id`, `redirect_url`, `status`, `expires_at` |
| `payment_transactions` | Raw HDFC transaction records — every real status update from HDFC (redirect-verify, webhook, or cron) writes one row here, always, with the full raw response. | `payment_id`, `txn_id`, `txn_uuid`, `hdfc_status`, `amount`, `raw_response` |
| `payment_status_history` | Granular status audit trail — HDFC's fine-grained status vocabulary (`CHARGED`, `AUTHORIZED`, etc.) lives here as plain strings, since `payments.status` itself is a restricted 5-value Postgres ENUM that can't hold them. | `payment_id`, `from_status`, `to_status`, `trigger_source` (`redirect`/`webhook`/`cron`/`admin`) |
| `payment_logs` | Every outbound API call this app makes to HDFC (session create, order status, refund) and HDFC's raw response — this is the source for the "Order Status API response logs" HDFC asked for in §1.B. | `payment_id`, `direction`, `endpoint`, `http_status`, `request_body`, `response_body` |
| `payment_webhooks` | Every inbound HDFC webhook event, deduped by HDFC's own `event_id` so a retried webhook is never double-applied. | `event_id`, `event_name`, `raw_payload`, `processed`, `processed_at` |
| `payment_audit` | Human-readable audit trail of status transitions and refund actions, separate from the raw transaction log. | `payment_id`, `action`, `old_values`, `new_values` |
| `refunds` | One row per refund attempt (full or partial). | `payment_id`, `unique_request_id`, `amount`, `status`, `hdfc_refund_id`, `initiated_by` |
| `refund_transactions` | Raw HDFC refund API responses. | `refund_id`, `raw_response`, `status` |

All ten tables above mean: **every transaction — including failed ones — is genuinely persisted in the database**, satisfying the bank's pre-audit checklist item "maintain database to store transaction details/status (including failed)."

---

## 4. Files Involved in This Integration

**Backend**
| File | Role |
|---|---|
| `src/services/hdfc/HdfcGatewayService.js` | Raw HTTP client for HDFC's three APIs — Session Create, Order Status, Refund. Nothing else touches HDFC's network API directly. |
| `src/services/hdfc/HdfcPaymentService.js` | All business logic: session creation/reuse, the mandatory verify flow, the central `applyHdfcStatus()` state machine (shared by redirect-verify, webhook, and the reconciliation cron), refund initiation. |
| `src/services/hdfc/signatureVerification.js` | Optional HMAC-SHA256 return-URL signature check (defense-in-depth only). |
| `src/controllers/PaymentController.js` | Thin HTTP layer — session/retry/verify/webhook/refund endpoints, plus `hdfcReturnBridge` (see below). |
| `src/routes/payment.routes.js` | Routes, mounted at `/payments`. |
| `src/middlewares/hdfcWebhookAuth.js` | Basic-Auth check for inbound HDFC webhook calls. |
| `src/models/Payment.js`, `PaymentSession.js`, `PaymentTransaction.js`, `PaymentStatusHistory.js`, `PaymentLog.js`, `PaymentWebhook.js`, `PaymentAudit.js`, `Refund.js`, `RefundTransaction.js` | One model per table in §3. |
| `src/cron/index.js` | Reconciliation job (every 15 min) — catches any payment stuck non-terminal (e.g. customer closed the tab before returning) and re-checks its real status via the Order Status API. |
| `src/config/env.js`, `.env` | `HDFC_MERCHANT_ID`, `HDFC_API_KEY`, `HDFC_BASE_URL`, `HDFC_PAYMENT_PAGE_CLIENT_ID`, `HDFC_WEBHOOK_USERNAME`/`PASSWORD`, `HDFC_RESPONSE_KEY`. |

**Frontend**
| File | Role |
|---|---|
| `src/lib/payments.js` | API wrapper — `createSession`, `retry`, `verify`, `getStatus`/`getHistory`/`getByOrder`. |
| `app/checkout/page.js` | "Proceed to Pay" → creates the order, then creates the HDFC session and redirects the browser to HDFC's hosted page. |
| `app/payment/hdfc/return/page.js` | The response/landing page — the one HDFC's §1.3/1.4 requirements are about. Shows Order Placed Successfully / Payment Processing / Payment Failed states, each sourced from the just-completed mandatory verify call. |
| `src/controllers/PaymentController.js`'s `hdfcReturnBridge` (backend, listed above too) | A same-origin bridge endpoint the return_url actually points to, added because this merchant account's SmartGateway dashboard has "Enable POST method support for return URL" turned on (and not self-service-editable) — HDFC then POSTs the result instead of a normal GET redirect, which a plain Next.js page can't read. The bridge accepts either and forwards to the real return page as a clean GET. |

---

## 5. Merchant Testing Details Table (needs your input to send back to HDFC)

Everything below is either already known from the codebase/`.env`, or needs to be filled in by you — I can't determine account/hosting details that live outside this repo.

| Field | Value | Source |
|---|---|---|
| Merchant Name | TAPES FOR YOU | Given |
| Account ID | SG5664 | Given (matches `HDFC_MERCHANT_ID` in `.env`) |
| Website URL | *(needs your input — the final production domain)* | — |
| Website publicly accessible (Yes/No) | *(needs your input)* | — |
| Login ID (if any) | *(needs your input — a demo/test customer account, if HDFC wants to log in and check out themselves)* | — |
| Login Password (if any) | *(needs your input)* | — |
| Response URL | `{FRONTEND_URL}/payment/hdfc/return` in production, e.g. `https://www.tapesforyou.com/payment/hdfc/return` | Derived from `HdfcPaymentService.createSession()`'s `return_url` construction |
| Developer Contact No | *(needs your input)* | — |
| Developer Email ID | *(needs your input)* | — |
| Type | SG | Given |
| Programming Language | Node.js (Express) backend, Next.js (React) frontend | Codebase |
| Plugin Name/Version (if any) | None — custom direct integration against HDFC's REST API, no SDK/plugin used | Codebase |
| Transaction Flow Verified | Yes | Already confirmed in this session — real sandbox session creation, hosted page render, and mandatory verify call all tested live end-to-end against real UAT credentials |
| Multiple Amount Values (if applicable) | *(needs your input — do you want to test more than one amount, e.g. ₹1, ₹500, ₹10,000?)* | — |
| Transaction responses stored in DB (incl. failed) | Yes | See §3 — `payment_transactions`/`payment_status_history` record every status, success or failure |

---

## 6. Roadmap (awaiting your confirmation before implementing)

### Must-fix (real compliance gap)

**1. Make the HDFC order ID non-sequential.**
- **Current**: `buildHdfcOrderId(orderId)` → `` `HDFC${orderId}` `` — directly exposes the internal auto-increment order ID, and is fully sequential/predictable.
- **Proposed fix**: generate a random alphanumeric suffix instead (e.g. `crypto.randomBytes` → base36, kept under the 21-char limit with the `HDFC` prefix), generated **once** and stored on `Payment.hdfc_order_id` — then always reused for that payment (not regenerated) so retries and the Order Status API keep resolving to the same HDFC-side order. This preserves every existing behavior (idempotent retries, reconciliation cron, refunds) since they all key off the *stored* `hdfc_order_id`, not off recomputing it from the order ID.
- **Impact radius**: `HdfcPaymentService.buildHdfcOrderId`/`createSession` only — no schema change needed (`hdfc_order_id` is already a nullable string column), no other file touches this function.

### Worth a decision, not strictly required

**2. Whether to also show the HDFC order ID on our own response page**, so the number displayed to the customer/auditor matches what appeared on HDFC's hosted page exactly, not just the amount. Low-risk, small addition to `app/payment/hdfc/return/page.js` if wanted.

### Not code — operational steps only

**3.** Decide on and provide the merchant testing details in §5 above.
**4.** Record the screenshots/screen-recording HDFC asked for (§1.A) — needs a real completed test transaction on the UAT sandbox; per this project's existing convention, a real `CAPTURED` transaction cascades into `OrderService.autoBookShipmentIfNeeded()`, which is a **production** Bigship booking (no Bigship sandbox exists) — needs your explicit go-ahead before doing a real end-to-end capture, same standing rule already applied elsewhere in this project.
**5.** Export the real `payment_logs` rows for a completed test transaction to send as the "Order Status API response logs" HDFC asked for (§1.B) — straightforward once a real test transaction exists from step 4.
**6.** Confirm SSL is active on whatever domain gets used for the audit (automatic on Render/Vercel, just needs confirming).

---

**Nothing above has been implemented.** Confirm which of the roadmap items to proceed with — at minimum item 1 (non-sequential order ID) is a real requirement HDFC will check — and I'll implement exactly that, then re-verify live the same way every other change in this integration has been verified.
