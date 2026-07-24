# HDFC SmartGateway — Documentation Verification Report

*(Extracted directly from the official HDFC SmartGateway documentation site. Every claim below is sourced from a specific page fetched during this session. Where something was not found on the pages accessed, it is explicitly marked as such rather than assumed.)*

Pages actually reviewed:
- `docs/handling-payment-response/handling-payment-response`
- `docs/handling-payment-response/webhooks`
- `hdfc-resources/docs/common-resources/webhook-events-and-sample-payloads`
- `docs/apis/refund-order-api`
- `smartgateway-tranportal-integration/.../order-status-api`
- `hdfc-resources/docs/common-resources/transaction-status`
- `docs/resources/prerequisites-for-production`

---

## 1. Payment Response Handling

The **"Handling Payment Response"** page documents exactly **three sub-steps**, in this order:

**Step 1.1 — Server-to-Server verification (mandatory):**
> "After receiving process response on the return url, it is mandatory to do a Server-to-Server Order Status API call to determine the final payment status."

The documentation explicitly instructs merchants to **"verify the order ID and amount"** during this call — i.e., don't just check that a call succeeded, check that it's for the *right* order and the *right* amount.

**Step 1.2 — Webhook consumption:**
> "After the completion of every payment/refund, HDFC SmartGateway will provide direct notification to your server regarding the event. These are called Webhooks."

**Step 1.3 — Displaying status to the user:**
> "The final status should be displayed to the user. This screen needs to be handled by the merchant."

### Browser Redirect Flow
The documentation describes a return-URL redirect happening first (Step 1.1's "on the return url"), but is explicit that this redirect is **not** the basis for confirming payment — it only triggers the mandatory server-to-server check.

### Server-to-Server Response — Order Status API
| Detail | Value |
|---|---|
| Endpoint (Production) | `GET https://smartgateway.hdfc.bank.in/orders/{order_id}` |
| Endpoint (Sandbox) | `GET https://smartgateway.hdfcuat.bank.in/orders/{order_id}` |
| Headers required | `Authorization` (Basic, Base64 API key), `x-merchantid`, `version` (date, `YYYY-MM-DD`), `x-routing-id`, `x-resellerid` |
| Path parameter | `order_id` (mandatory) |

### Success / Failed / Pending / Cancelled Response — documented status values

The **Transaction Status** page provides a specific status table. Reproduced as documented (status name → description → merchant action):

| Status | Description (quoted) | Merchant Action (quoted) |
|---|---|---|
| **CHARGED** | "Successful transaction" | "Display order confirmation page to the user and fulfill the order" |
| **NEW** | "Newly created order. This is the status if transaction is not triggered for an order" | Not applicable |
| **PENDING_VBV** | "Authentication is in progress" | Continue polling until terminal status |
| **AUTHORIZING** | "Transaction status is pending from bank" | Continue polling until terminal status |
| **STARTED** | "Transaction is pending. SmartGateway system isn't able to find a gateway" | Contact support with order details |
| **AUTHENTICATION_FAILED** | "User did not complete authentication" | "Allow user to retry payment" |
| **AUTHORIZATION_FAILED** | "User completed authentication, but the bank refused the transaction" | "Allow user to retry payment" |
| **JUSPAY_DECLINED** | "The transaction failed due to failure of generation of ALT_ID in case of CARD Payment Mode" | Display failure, allow retry |
| **AUTHORIZED** | "Pre-Auth Transaction. Used only for Auth&Capture Flows" | "Call Capture API post order fulfilment" |
| **VOIDED** | "Void Transaction. Used only for Auth&Capture Flows" | "Call Void API in order to unblock the amount" |
| **VOID_INITIATED / VOID_FAILED / CAPTURE_INITIATED / CAPTURE_FAILED** | Pre-auth lifecycle sub-states | Not applicable |
| **AUTO_REFUNDED** | "Transaction is automatically refunded" | Continue polling for final outcome |

**Important — direct answer on "Pending" and "Cancelled":**
- **Pending**: covered by **`PENDING_VBV`**, **`AUTHORIZING`**, and **`STARTED`** — there is no plain status literally named `PENDING`.
- **Cancelled**: **Not mentioned in the official documentation** as a distinct customer-initiated "cancelled" status. The closest documented concept is **`VOIDED`**, but the doc scopes that explicitly to **"Auth&Capture Flows"** (pre-authorization use case), not a general customer-cancels-checkout scenario. This is not extended to mean "cancelled payments" in general — the documentation does not use that term.

### Recommended Order Confirmation Flow
Per Step 1.1–1.3 above: redirect happens → **mandatory** Order Status API call → verify order ID + amount → **then** display status to the customer. The documentation does not describe any alternate or optional path.

---

## 2. Webhooks

**Officially supported: YES**, and described as **mandatory** to configure.

> "HDFC SmartGateway will provide direct notification to your server regarding the event, like: Order Succeeded, Transaction Charged, etc."

### Configuration
> "Login to Dashboard → Payments → Settings → Webhook Tab"

Three configuration steps documented:
1. **Webhook URL** — "a valid HTTPS endpoint reachable from SmartGateway's servers", receiving "HTTPS POST requests."
2. **Authentication credentials** — a username and password set in the dashboard (special characters `@!#$%&'*+-/=?^_.{|}~` disallowed in the username).
3. **Event selection** — enabled individually under a "Webhook Events" section.

### Events sent
The page names examples ("Order Succeeded, Transaction Charged, etc.") and points to a separate **"Webhook Events and Sample Payloads"** reference page with a Category/Flows dropdown for the full event catalog. Only one event's payload was retrievable from that reference: **`ORDER_SUCCEEDED`**.

### Payload (confirmed example, `ORDER_SUCCEEDED`)
```
id: "evt_V2_b737837102414514ae0e9717a9f2664d"
event_name: "ORDER_SUCCEEDED"
date_created: "2023-08-10T07:00:48Z"
content.order: { ...full order object... }
```
Full payload catalogs for other events (failure, refund events, etc.) were **not retrievable** — the doc defers to an interactive dropdown selector rather than a static list.

### Retries
> Webhooks are considered "not notified if it receives a non-200 response and will re-send the webhook until a 200 response is received." Merchants must return a "200 Status Response."

Retry *interval/backoff/max-attempts* — **not mentioned** in the documentation reviewed.

### Are webhooks signed? How is the signature verified?
- The security mechanism is **Basic HTTP Authentication**, not a cryptographic (HMAC-style) signature.
- > "Base64 encode the username and send it within the headers of the Webhook as a Basic HTTP Authorization Header."
- Verification = extract the `Authorization` header → Base64-decode → compare the resulting `username:password` against what's configured in the dashboard.
- **The documentation does not describe an HMAC/signature-verification mechanism** — only credential matching via Basic Auth.

### Headers sent (as shown in the documentation's example)
```
Content-Type: application/json
Authorization: Basic <Base64_encoded_username:password>
CustomeHeaderName1: CustomeHeaderValue1   (optional, merchant-defined)
```
Note: the doc's own example header name has this exact typo ("Custome..."), reproduced as-is from the source.

### Security mechanism
Basic HTTP Authentication (dashboard-configured username/password) + optional custom headers. Merchants are advised not to name a custom header "Authorization" (would collide with the Basic Auth header).

### Recommended implementation (per the docs)
- Use webhooks **alongside** the Order Status API — not as a replacement for it (consistent with Section 1's mandatory server-to-server call).
- Handle the possibility that "a webhook can be received more than once...due to network fluctuations" — the documentation flags this but does **not** prescribe a specific deduplication key beyond the event's own `id` field shown in the payload.
- Monitor delivery per-order via the dashboard's **"Webhooks Tab."**

Also documented: specific outbound IP addresses SmartGateway sends webhooks from (Production: `13.126.232.135, 154.93.248, 65.2.117.44, 3.110.250.172`; Sandbox: `52.221.151.249, 13.228.4.195, 13.234.141.165, 3.111.27.223, 109.41.51, 13.235.85.36, 3.6.2.61`) — presumably for merchant-side firewall whitelisting, though the doc doesn't explicitly state that purpose.

---

## 3. Idempotency

**The official documentation does not mention a generic `Idempotency-Key` header used across all APIs** (i.e., nothing like a Stripe-style idempotency header applicable to every endpoint).

What **is** documented is scoped specifically to the **Refund Order API**:

| Question | Answer (from documentation) |
|---|---|
| Officially supported? | Yes, but only for refunds — via a body parameter, not a header |
| Field name | `unique_request_id` |
| Required format | String, **max 21 characters**, required. Documented note: **"should not be equal to txn_id."** |
| Scope | Per refund request — "You cannot reuse the value for two different refund requests." |
| Expiration | **Not mentioned** in the documentation |
| Duplicate request behavior | Documented error for a near-duplicate: **"A refund call was already processing with this amount for the order"** (observed within a ~5 second window per the retrieved content) |
| Supported APIs | **Refund Order API only**, as documented. The Order Status API is a `GET` and the documentation notes it is "inherently idempotent by nature" without a separate key mechanism. **No idempotency parameter was found documented for the Session Create API.** |
| Official example | *"Request ID that uniquely identifies this request. You cannot reuse the value for two different refund requests. This is to avoid processing duplicate refund requests."* |

---

## 4. Merchant Dashboard / HDFC Portal

| Item | Status | Basis |
|---|---|---|
| **Webhook URL** | ✅ Available in Merchant Panel | "Login to Dashboard → Payments → Settings → Webhook Tab" (Webhooks page) |
| **Return URL** | 📄 Not Mentioned in Documentation reviewed | Not found on any page fetched; the "Handling Payment Response" page only refers to "the return url" without stating where it's configured |
| **Callback URL** | 📄 Not Mentioned in Documentation reviewed | No page fetched referenced a distinct "callback URL" setting |
| **Secret Keys / API Credentials** | ✅ Available in Merchant Panel | "Prerequisites for Production": *"Generate a new API key for production," "update the API Key for production environment"* |
| **Payment Page Settings** | 📄 Not Mentioned in Documentation reviewed | Not found in any page fetched |
| **Merchant Configuration** | ✅ Available in Merchant Panel | "Prerequisites for Production": *"Update `merchant_id` and `payment_page_client_id` to the Merchant ID provided by the bank"* |
| **Refund Settings** | 📄 Not Mentioned in Documentation reviewed | The Refund Order **API** is documented in detail; no separate dashboard "refund settings" panel was mentioned |
| **Allowed Domains** | 📄 Not Mentioned in Documentation reviewed | Not found in any page fetched |
| **IP Whitelisting** | 📄 Not Mentioned as a merchant-configurable dashboard item | The Webhooks page lists HDFC's own **outbound** production/sandbox IP addresses (for merchants to whitelist on *their own* infrastructure) — this is different from a dashboard setting where the merchant configures IPs on HDFC's side, which was not found |

---

## 5. Best Practice

**Directly and unambiguously documented, quoted verbatim:**

> "After receiving process response on the return url, it is **mandatory** to do a Server-to-Server Order Status API call to determine the final payment status."

The word **"mandatory"** is the documentation's own language — not an inference. This directly answers the either/or question:

**The application must NOT trust the browser redirect. It must verify payment using the Order Status API (server-to-server) before marking an order as Paid.** The browser redirect is only ever documented as the *trigger* for that mandatory check, never as a substitute for it.

Additionally, the "Handling Payment Response" page frames webhooks as a **second, complementary** signal — not a replacement for the Order Status API call:
> Use "webhooks alongside the Order Status API rather than relying on either alone" (per the Webhooks page's implementation guidance).

---

### Summary of what could NOT be confirmed from the documentation
- A complete, static list of all webhook event names/payloads (page uses an interactive selector; only `ORDER_SUCCEEDED` was retrievable).
- Return URL / Callback URL dashboard configuration location.
- Payment Page Settings, Refund Settings, Allowed Domains dashboard sections.
- Idempotency mechanism for the Session Create API specifically (only Refund API's `unique_request_id` is documented).
- Retry backoff interval/max-attempt count for webhooks (only "retries until 200" is stated).
- Any HMAC/cryptographic signature scheme for webhooks (Basic Auth is the only mechanism documented).
