# Bigship Integration Guide

Status: **planning complete, backend implementation in progress**. This file is the single source of truth for the Bigship courier integration — read this before touching any Bigship-related code.

## Project Overview

Tapes For You is replacing its **Shiprocket** courier integration with **Bigship Direct** (a multi-courier aggregator). Bigship gives one API surface across many couriers and three shipment categories (`hyperlocal`, `domestic_b2b`, `domestic_b2c`). This project's business is `domestic_b2c` first (matches existing customer flow), with `domestic_b2b` as a likely near-term need (a `BULK10` B2B-only coupon already exists in the coupon seed data, suggesting B2B customers already exist).

**Decision: full replacement, not parallel.** `ShiprocketService.js` stays in the repo (never delete working code) but is no longer called from anywhere once this integration is live. All new shipments go through Bigship.

## Why no sandbox changes how you work with this integration

Bigship's documentation (`Documentation-for-Unified-Outbound-API.pdf`) has **no sandbox/staging environment** — only `https://api.bigship.direct/` is documented, described as "Live environment for real operations." Practical implications:

- Every API call during development hits production. Login, Get Profile, Save/Get Warehouse, Get Package/Payment/Risk lists, Rate Calculator, and Create Order (draft) are all safe to call repeatedly — none of them commit to a real shipment or cost money.
- **`Place/Manifest Order` is the one call that is not free to repeat** — it books a real courier and a real pickup against the real Bigship wallet balance. It can only be undone by `Cancel Order`, and only before the shipment reaches "Rider-Assigned" status.
- Per an explicit decision with the project owner: the first real `Place Order` call will be followed immediately by a `Cancel Order` call, specifically to verify the full loop (booking → tracking → cancellation) without leaving a live, unwanted shipment in the account.

## Architecture

```
GET /admin/orders/:id/shipping-rates
        │
        ▼
BigshipService.getShippingOptions(order)
        ├─▶ POST /api/outbound/create-order                 (draft — returns CustomGlobalOrderId)
        └─▶ POST /api/outbound/courier-wise-shipment-cost    (serviceable couriers for that SAME draft)
        │
        ▼  { masterCustomOrderId, couriers: [...] } returned to admin UI
        │
        ▼  (admin picks a courier in the modal, confirms)
        │
POST /admin/orders/:id/ship  { masterCustomOrderId, courierId, courierName }
        │
        ▼
BigshipService.bookShipment(order, {...})
        └─▶ POST /api/outbound/place-order      (manifest — real booking, reuses the SAME masterCustomOrderId)
        │
        ▼
Shipment.create({ ...bigship_* fields, status: 'booked' })
```

The draft order from step 1 is reused (not recreated) in step 2 — Bigship's own docs state the rate-calculation call must run against the same order before Place Order, so `bookShipment` never calls `createOrder` itself.

This mirrors the existing `ShiprocketService` shape deliberately (`getToken()` with cached-until-expiry token, a generic `request(method, endpoint, body)` wrapper, one method per external endpoint) — same pattern, same file location convention (`src/services/`), so it reads like the rest of this codebase rather than a bolted-on library.

## Folder Structure (new/changed files only)

```
backend/src/
├── services/
│   ├── ShiprocketService.js        (unchanged, unused going forward)
│   └── bigship/
│       ├── claude.md               (this file)
│       └── BigshipService.js       (new — all Bigship API calls)
├── controllers/
│   ├── OrderController.js          (shipOrder/adminGenerateShippingLabel updated to call BigshipService)
│   └── BigshipController.js        (new — admin-only: warehouse registration, rate lookup for an order)
├── models/
│   └── Shipment.js                 (new nullable bigship_* columns added)
├── migrations/
│   └── <timestamp>-add-bigship-fields-to-shipments.js
├── config/
│   └── env.js                      (new BIGSHIP block)
└── routes/
    └── admin.routes.js             (new: POST /admin/bigship/warehouse, GET /admin/orders/:id/shipping-rates)
```

## Required Environment Variables

```env
BIGSHIP_EMAIL=your_bigship_account_email
BIGSHIP_PASSWORD=your_bigship_account_password
BIGSHIP_ACCESS_KEY=your_bigship_access_key
BIGSHIP_WAREHOUSE_ID=            # populated after the one-time Save Warehouse call below
```

`BIGSHIP_WAREHOUSE_ID` cannot be filled in ahead of time — it's the `warehouseId` Bigship returns from `Save Warehouse`, called once via the admin panel's Settings page (see "Pickup Flow" below). Until that's done, `Place Order` cannot succeed (it requires a real `MasterOrderPickUpLocation`).

## API Credentials (real, live values — set 2026-07-21)

Obtained by logging into the Bigship Direct merchant dashboard directly — not something this codebase can generate. Live in `backend/.env` already; recorded here too for continuity since Render's production env vars still need these added manually (see Deployment Checklist).

- **Login email**: `goodleafsale2@gmail.com`
- **Login password**: `Dhanashree@02`
- **Access key**: `AL2tgQO4UWFWJb62b10aAThHYkpZdHpzeE9GSk55TXY4UGUweC9yRmtXSTQwc09NaXpNaGJKVHZweTBSWkpoQlJMdllHR1ptYzIxVVZoRDlZajhJbkxGOEQrQVNzSm9VRVpKdWFCSk1EYk83R1dmeWhMSHgwRENDYUZBPQ==` (a separate value from the login password — from the account's API/Integration settings, not the panel login)
- **Warehouse ID**: `120081` (Trambak Road/Pimpalgaon Bahula, Nashik district, pincode `422213`) — this is the *only* warehouse this integration uses. The Bigship account also has a second, unrelated pre-existing warehouse (id `119959`, pincode `422012`, Nashik city, contact "Sonawane Rupesh Raghunandan") — do not use that one; it predates this integration and isn't tied to `SOURCE_PINCODE` in `ShippingService.js`.

⚠ This file (and the project's other `CLAUDE.md`/`claude.md` files) contain real, live third-party credentials in plaintext, matching this project's existing convention for the Admin/Database credentials elsewhere. Treat this repo accordingly — don't publish these files publicly.

## Authentication Flow

`POST api/outbound/login` → `{ username, password, access_key }` → returns `{ data: { token, tokenExpiringAt, ... } }`. `BigshipService.getToken()` caches the token in memory and re-logs-in only once `tokenExpiringAt` has passed — same pattern as `ShiprocketService.getToken()`, which caches for a fixed 9 days rather than reading an actual expiry; Bigship's response *does* give a real `tokenExpiringAt`, so `BigshipService` reads that value instead of hardcoding a duration.

Every subsequent call sends `Authorization: Bearer {token}`.

## Order Flow

1. Customer places an order normally (`POST /orders`) — completely unchanged, no Bigship involvement at order-creation time.
2. Admin opens the order detail page and clicks "Create Shipment."
3. **New step vs. the old Shiprocket flow**: this opens a modal that calls a new endpoint (`GET /admin/orders/:id/shipping-rates`), which runs Bigship's `Create Order` (draft) + `Order Rate Calculation` and returns the list of serviceable couriers with prices. The admin picks one.
4. Confirming calls `POST /admin/orders/:id/ship` (existing route, updated body: `{ courierId }`) → `BigshipService.placeOrder()` → real booking → `Shipment` row created with `status: 'booked'`, `bigship_custom_order_id`, `bigship_courier_id`/`bigship_courier_name`.
5. Order status flips to `shipped` — unchanged from today.

This is a real UX change from Shiprocket (which auto-picked a courier with no admin choice) — necessary because Bigship's whole value proposition is rate comparison across couriers, and hiding that would throw away the reason to integrate it.

## Shipment Flow / Tracking Flow

No webhooks exist in Bigship's documented API (confirmed absent from the PDF, not assumed missing). Tracking is **pull-only**: `GET api/outbound/track-order` / `GET api/outbound/order-shipment-details`, keyed by `CustomGlobalOrderId`. This project already has a cron-job pattern (`Cron jobs started` at boot, per `server.js` logs) — Bigship tracking status will be polled on the same kind of interval, updating `Shipment.status` from Bigship's `tracking_status`/`order_status` values, mapped onto the existing generic Shipment status enum (`pending, booked, pickup_requested, picked_up, in_transit, out_for_delivery, delivered, failed, returned`).

## Pickup Flow

Bigship has **no separate "request pickup" endpoint** (confirmed absent — pickup is implied by `Place Order` against a saved warehouse, not a distinct scheduling step). The one-time setup is:

1. Admin panel → Settings → "Bigship Pickup Warehouse" section (new, added to the existing Settings page — not a new page).
2. Admin fills in the pickup address once → calls `POST /admin/bigship/warehouse` → `BigshipService.saveWarehouse()` → Bigship returns a `warehouseId`.
3. That ID is manually copied into `BIGSHIP_WAREHOUSE_ID` in `.env` (not auto-written back to `.env` by the app — this is a one-time manual step, matching how every other credential in this project is provisioned).

## Label Flow / Manifest Flow

Both (plus invoice and eway-bill) come from **one shared endpoint**: `GET api/outbound/download-shipment-documents` with a `document_type` param (`invoice | label | ewaybill | manifest`). `BigshipService.downloadDocument(customOrderId, documentType)` wraps this single call; the existing `adminGenerateShippingLabel` controller method is updated to call it with `document_type: 'label'` and store the returned URL on `Shipment.label_url` (already-existing column, reused as-is).

## Cancel Shipment

`POST api/outbound/cancel-order`, `{ CustomGlobalOrderId }`. Only valid before "Rider-Assigned" status (Bigship-side rule, not something this codebase can override or pre-validate against — the API will simply reject a too-late cancel attempt, surfaced to the admin as a normal error toast).

## NDR Handling / RTO Handling

**Not implemented — no corresponding Bigship API exists in the documented spec.** Both remain fully manual, exactly as they are today with Shiprocket: an admin manually sets `Order.status` to `returned` when a shipment comes back. If Bigship adds NDR/RTO endpoints later, this section must be updated before building anything — do not assume a shape that isn't in a real doc.

## Webhook Handling

**Not implemented — no webhooks are documented.** See "Shipment Flow / Tracking Flow" above for the polling-based alternative.

## Error Handling

`BigshipService.request()` throws on any non-2xx response (same as `ShiprocketService.request()` does today, letting `express-async-errors` catch it) — Bigship's error envelope (`{ status: false, message, status_code, errors? }`) is not specially parsed beyond surfacing `message` to the admin, matching this project's existing pattern of trusting the upstream error message rather than re-classifying it.

## Retry Logic

None implemented initially — matches `ShiprocketService`'s existing behavior (no retry wrapper exists there either). If Bigship's 429 rate limit (100 req/min/IP) becomes a real problem in practice, revisit then rather than pre-building retry logic for a limit this project's shipment volume is very unlikely to hit.

## Logging

Standard `logger` (winston) calls at the same points `ShiprocketService` doesn't currently log at all — worth adding `logger.info`/`logger.error` around `placeOrder`/`cancelOrder` specifically, since those are the two calls with real financial/operational consequences, unlike the read-only endpoints.

## Security

- Bigship's `access_key` and `password` are as sensitive as any other third-party credential in `.env` — never logged, never returned in any API response to the frontend.
- `BigshipController`'s routes are `adminProtect`-only (matching every other shipping-related route in this project) — no `superAdmin` gate, since shipping is routine operational work here, not a super-admin-only concern (same reasoning as Products/Orders/Dashboard).

## Testing

No sandbox exists, so testing = careful, deliberate real calls:

1. ✅ Login → confirm token returned. **Done 2026-07-21** — real credentials confirmed working.
2. ✅ Save Warehouse → confirm `warehouseId` returned, set `BIGSHIP_WAREHOUSE_ID`. **Done** — registered the Trambak Road/Pimpalgaon Bahula (422213) warehouse, `warehouseId: 120081`. See "Real Credentials & Warehouse" below for the full story (two undocumented required fields discovered along the way).
3. ✅ Get Warehouse List → confirm it appears. **Done** — also revealed the account already had a *different*, pre-existing warehouse (id 119959, pincode 422012, Nashik city) that this integration does **not** use; don't confuse the two.
4. ✅ Rate Calculator (no order created) → confirm pricing looks sane for a real source/destination pincode pair. **Done** — real quotes confirmed: Delhi (110001) ₹136 via Delhivery, Mumbai (400001) ₹94 via Delhivery, both genuine (`usedFallback: false`), plus the free-shipping-zone case (warehouse's own pincode, under ₹899) correctly returns free.
5. Create Order (draft, `domestic_b2c`) → Order Rate Calculation → confirm at least one courier is serviceable. **Not yet done** — implied working by step 4 (uses the same underlying call), but not independently exercised via the admin "Create Shipment" flow yet since that UI isn't built (see Future Improvements).
6. **Place Order** (real) → immediately **Cancel Order** → confirms the full booking + cancellation loop without leaving a live shipment. **Not yet done** — needs the admin courier-picker UI, or a direct API call with your explicit go-ahead each time (this is the one step that's a real, billed booking).
7. Track Order / Order Detail — **not yet done**.
8. Download Shipment Documents — **not yet done**.

### Real Credentials & Warehouse (2026-07-21)

Real credentials are live in `backend/.env`: `BIGSHIP_EMAIL=goodleafsale2@gmail.com`, `BIGSHIP_PASSWORD`, `BIGSHIP_ACCESS_KEY` (the access key is a separate value from your Bigship dashboard's API/Integration settings — not the login password; this distinction caused one round of back-and-forth before the real key arrived). `BIGSHIP_WAREHOUSE_ID=120081`.

Registering the warehouse surfaced two things worth knowing before touching `saveWarehouse()` again:
- **`warehouseName` is a required field not present anywhere in Bigship's documented sample payload** — only discovered via a live `422 "The warehouse name field is required."` `BigshipController.registerWarehouse` now defaults it to `'Tapes For You Nashik'` if not explicitly passed.
- **`warehouseName` is validated server-side as letters-and-spaces-only** — a first attempt using a generated `TapesForYou-{pincode}` (hyphen + digits) was rejected with a second live `422`. Any future auto-generated warehouse name must avoid punctuation/digits.

Also fixed along the way: **`BigshipService.request()`/`getToken()` previously lost Bigship's real validation error body** — axios throws its own generic `"Request failed with status code 422"` for any non-2xx response by default, which hid the *actual* reason (which field, which rule) behind a useless message. Both methods now catch that and re-throw with Bigship's real `message`/`errors` instead — this is what made diagnosing the two `warehouseName` issues above possible in the first place, and will matter for every future live-API debugging session on this integration.

## Deployment Checklist

- [x] `BIGSHIP_EMAIL`, `BIGSHIP_PASSWORD`, `BIGSHIP_ACCESS_KEY` — live in local `.env`. **Still needed**: add the same to Render's production env vars.
- [x] `BIGSHIP_WAREHOUSE_ID=120081` — live in local `.env`. **Still needed**: add to Render too.
- [ ] New migration (`add-bigship-fields-to-shipments`) run against production Supabase (`db:migrate:status` first, per this project's standing discipline).
- [ ] Confirm `ShiprocketService` is genuinely unused (no remaining `require`s) before considering the migration complete — but the file itself stays.

## Production Checklist

Same as Deployment Checklist — this project doesn't distinguish a separate pre-prod stage (no sandbox exists for Bigship, and the app itself has no staging environment either).

## Rollback Plan

Because Shiprocket's code and `Shipment.shiprocket_*` columns are untouched, rollback is a plain revert of `OrderController.js`'s `shipOrder`/`adminGenerateShippingLabel` back to calling `ShiprocketService` — no data migration needed to roll back, since nothing was deleted or renamed.

## Customer-Facing Checkout-Time Rate Estimation (2026-07-20)

Done — this was originally listed below as a future improvement; it's now built. `services/ShippingService.js` (a separate file from `BigshipService.js` — it wraps `BigshipService.rateCalculator()` with the business rules: free-shipping zone/threshold check, fallback-on-failure, weight approximation) powers a public `POST /shipping/check` endpoint and a "Check Delivery Availability" widget on the product/cart pages, plus the checkout page's real shipping quote once an address is selected. Full details in `server/server/CLAUDE.md`'s **"Real Distance-Based Shipping via Bigship"** section — not duplicated here since that section also covers the free-shipping-zone business rule, which is specific to this project's shipping policy rather than the Bigship API itself.

## Wallet Balance in Admin Panel (2026-07-21)

`GET /admin/bigship/profile` (`BigshipController.getProfile` → `BigshipService.getProfile()`, which already existed but wasn't called from anywhere) surfaces Bigship's Get Profile response. There's no separate "get balance" endpoint — the wallet balance lives inside this same response at `data.userWallet.Balance`/`data.userWallet.kycCurrency` (confirmed via a real live call; also returns `firstName`/`lastName`/`EmailID`/`mobileNumber` and `api_master_client_account` with the access key — the admin API response passes all of it through as-is, since this route is `adminProtect`-only, not public).

Admin panel: `SettingsPage.jsx` gained a "Bigship Wallet" card (top of the page) — `useQuery(['bigship-profile'], getBigshipProfile)`, a manual Refresh button, and an Alert shown on fetch failure instead of crashing the page. `admin/src/api/index.js` gained `getBigshipProfile()`. Verified live: real balance (₹0.00 at the time of this test) and account email render correctly, zero console errors.

## Future Improvements

- Multi-warehouse support (currently one default `BIGSHIP_WAREHOUSE_ID` — fine for a single-location business, would need a real warehouse-picker if a second pickup location is ever added).
- `domestic_b2b` segment support (payload shape is fully documented, just not built in this first pass — add if/when B2B order volume justifies it).
- Automated tracking-status polling via a proper cron job (vs. a manual "Refresh Tracking" button, which may be the pragmatic v1 given no webhooks exist).
- Revisit NDR/RTO/webhooks the moment Bigship documents them.
- Expand `ShippingService.js`'s `FREE_SHIPPING_PINCODES`/`FREE_SHIPPING_CITIES` once the business owner provides the real list of nearby serviceable areas (currently just the warehouse's own pincode).

## Common Issues / Troubleshooting

- **"Order Rate Calculation must be executed before Place Order"** (an explicit note in Bigship's own docs) — if `Place Order` ever fails with an unclear error, confirm the draft order + rate-calc step actually ran first for that `CustomGlobalOrderId` in this same session; Bigship's server-side state may not persist a rate-calc indefinitely.
- **`perPage` validation errors** on Get Warehouse List — must be a multiple of 5, max 25. Client-side, don't let the admin UI request anything else.
- **Cancel Order fails unexpectedly** — check whether the shipment has already reached "Rider-Assigned" (Bigship's own hard cutoff, not a bug in this codebase).

## Frequently Asked Questions

**Q: Why does the admin now have to pick a courier, when Shiprocket didn't require that?**
A: Bigship's core value is rate comparison across multiple couriers — auto-picking one (like Shiprocket did) would defeat the purpose of switching providers.

**Q: What happens to orders already shipped via Shiprocket before this migration?**
A: Nothing — their `Shipment` rows keep their `shiprocket_*` values and display exactly as before. Only *new* shipments go through Bigship.

**Q: Can I test without spending real money / booking a real courier?**
A: Everything except `Place Order` is free to call repeatedly. `Place Order` is real — see "Testing" above for exactly how it was verified once, deliberately, then cancelled.

## API Reference

See `Documentation-for-Unified-Outbound-API.pdf` (shared by the project owner) for the full, authoritative request/response shapes of all 16 endpoints. Do not re-derive shapes from memory — re-check the PDF if a payload's exact required/optional fields matter.

## Every Environment Variable (this integration only)

| Variable | Set when | Purpose |
|---|---|---|
| `BIGSHIP_EMAIL` | Before any Bigship call | Login `username` |
| `BIGSHIP_PASSWORD` | Before any Bigship call | Login `password` |
| `BIGSHIP_ACCESS_KEY` | Before any Bigship call | Login `access_key` |
| `BIGSHIP_WAREHOUSE_ID` | After the one-time Save Warehouse call | `MasterOrderPickUpLocation` / `MasterOrderReturnLocation` on every order |

## Every Database Table / Model Touched

| Table/Model | Change |
|---|---|
| `shipments` / `Shipment` | New nullable columns: `bigship_custom_order_id`, `bigship_courier_id`, `bigship_courier_name`, `segment_type`, `invoice_uploaded`, `eway_bill_no` |

## Every Endpoint This Integration Calls (Bigship-side)

Login, Get Profile, Save Warehouse, Get Warehouse List, Update Warehouse, Get Package Types List, Get Payment Mode List, Get Risk Types List, Rate Calculator, Create Order (draft), Order Rate Calculation, Place/Manifest Order, Cancel Order, Track Order, Order Detail, Download Shipment Documents — all 16 documented endpoints, `domestic_b2c` payload shape prioritized first.

## Every New Endpoint This Project Exposes (admin-facing)

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/bigship/warehouse` | One-time pickup warehouse registration |
| GET | `/admin/orders/:id/shipping-rates` | Draft order + courier rate list, shown in the "Create Shipment" modal |
| POST | `/admin/orders/:id/ship` | Existing route, body now includes `courierId` — places the real order |
