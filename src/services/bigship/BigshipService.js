const axios = require('axios');
const env = require('../../config/env');
const { Shipment } = require('../../models');
const { GST_HSN, SHIPMENT_STATUS } = require('../../constants');
const logger = require('../../utils/logger');

// See ./claude.md for the full integration guide — read it before changing this file.
// No sandbox exists for Bigship; every call here hits production.
const BASE_URL = 'https://api.bigship.direct/';

class BigshipService {
  constructor() {
    this.token = null;
    this.tokenExpiringAt = null;
  }

  async getToken() {
    if (this.token && this.tokenExpiringAt && this.tokenExpiringAt > Date.now()) return this.token;

    let data;
    try {
      ({ data } = await axios.post(`${BASE_URL}api/outbound/login`, {
        username: env.BIGSHIP.EMAIL,
        password: env.BIGSHIP.PASSWORD,
        access_key: env.BIGSHIP.ACCESS_KEY,
      }));
    } catch (err) {
      const body = err.response?.data;
      throw new Error(body?.message || 'Bigship login failed');
    }

    if (!data.status) throw new Error(data.message || 'Bigship login failed');

    this.token = data.data.token;
    this.tokenExpiringAt = new Date(data.data.tokenExpiringAt).getTime();
    return this.token;
  }

  // Bigship's own error shape ({status:false, message, status_code, errors?})
  // is surfaced as-is via the thrown message. Axios throws for any non-2xx
  // HTTP status by default (Bigship returns 422 for validation errors, not
  // 200-with-status:false) — without catching that here, the real reason
  // ("which field is wrong") is lost behind a generic "Request failed with
  // status code 422", which cost real debugging time before this was added.
  async request(method, endpoint, body = null) {
    const token = await this.getToken();
    let data;
    try {
      ({ data } = await axios({
        method,
        url: `${BASE_URL}${endpoint}`,
        data: body,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }));
    } catch (err) {
      const errBody = err.response?.data;
      if (errBody) {
        const detail = errBody.errors ? ` — ${JSON.stringify(errBody.errors)}` : '';
        throw new Error(`${errBody.message || 'Bigship request failed'}${detail}`);
      }
      throw err;
    }
    if (!data.status) throw new Error(data.message || 'Bigship request failed');
    return data;
  }

  async getProfile() {
    return this.request('GET', 'api/outbound/profile');
  }

  // --- Warehouse (pickup location) ---

  async saveWarehouse(warehouse) {
    return this.request('POST', 'api/outbound/save-warehouse-data', warehouse);
  }

  async getWarehouseList({ page = '1', perPage = '10', segment_type = 'domestic_b2c', status = '', filter_type = '', filter_value = '' } = {}) {
    return this.request('GET', 'api/outbound/get-warehouse-list', { page, perPage, segment_type, status, filter_type, filter_value });
  }

  async updateWarehouse(warehouse) {
    return this.request('POST', 'api/outbound/edit-warehouse-data', warehouse);
  }

  // --- Reference lists ---

  async getPackageTypesList() {
    return this.request('GET', 'api/outbound/hyperlocal/get-packages-list');
  }

  async getPaymentModeList(segmentType) {
    return this.request('GET', `api/outbound/get-payment-mode?segment_type=${segmentType}`);
  }

  async getRiskTypesList() {
    return this.request('GET', 'api/outbound/domestic/risk-types');
  }

  // --- Rates ---

  // Pre-order estimate — does not create anything. domestic_b2b/domestic_b2c only
  // (hyperlocal is explicitly not supported by this endpoint per Bigship's docs).
  async rateCalculator(payload) {
    return this.request('POST', 'api/outbound/user-rate-calculator', payload);
  }

  // --- Order lifecycle ---

  // Draft order — must run before getCourierRates/placeOrder (Bigship's own
  // documented dependency: "Order Rate Calculation API must be executed
  // before Place Order API").
  async createOrder(payload) {
    return this.request('POST', 'api/outbound/create-order', payload);
  }

  // Serviceable couriers + live pricing for an already-created draft order.
  async getCourierRates(masterCustomOrderId) {
    return this.request('POST', 'api/outbound/courier-wise-shipment-cost', { MasterCustomOrderId: masterCustomOrderId });
  }

  // Real booking. `courierId` must come from getCourierRates()'s response.
  // NOTE: domestic_b2b orders with invoiceType "uploaded" need multipart file
  // upload (InvoiceData/EwayBillData) per Bigship's docs — not implemented yet,
  // since domestic_b2c (this project's priority) never requires it. Add the
  // `form-data` package and multipart support here if/when B2B goes live.
  async placeOrder({ masterCustomOrderId, courierId, riskTypeId }) {
    return this.request('POST', 'api/outbound/place-order', {
      MasterCustomOrderId: masterCustomOrderId,
      courierId,
      ...(riskTypeId ? { riskTypeId } : {}),
    });
  }

  async cancelOrder(customGlobalOrderId) {
    return this.request('POST', 'api/outbound/cancel-order', { CustomGlobalOrderId: customGlobalOrderId });
  }

  async trackOrder(customGlobalOrderId) {
    return this.request('GET', 'api/outbound/track-order', { CustomGlobalOrderId: customGlobalOrderId });
  }

  async getOrderDetail(masterCustomOrderId) {
    return this.request('GET', 'api/outbound/order-shipment-details', { MasterCustomOrderId: masterCustomOrderId });
  }

  // documentType: 'invoice' | 'label' | 'ewaybill' | 'manifest'
  async downloadShipmentDocuments(customGlobalOrderId, documentType) {
    return this.request('GET', 'api/outbound/download-shipment-documents', {
      CustomGlobalOrderId: customGlobalOrderId,
      document_type: documentType,
    });
  }

  // --- High-level helpers used by OrderController ---

  // Builds the domestic_b2c Create Order payload from an internal Order record.
  // Only domestic_b2c is implemented — see claude.md "Segment priority".
  buildB2cOrderPayload(order) {
    const addr = order.shipping_address;
    const products = order.items.map((item) => {
      const totalAmount = parseFloat(item.unit_price) * item.quantity;
      return {
        // Undocumented Bigship validation rule, only discovered via a live
        // 422 ("Product name may contain only letters, spaces, dashes, and
        // underscores") — this project's real product names include digits
        // and parentheses ("2 inch (48 mm) 50 meter..."), so those are
        // stripped rather than rejected outright. Same class of undocumented
        // field-level rule as warehouseName's letters-only requirement (see
        // claude.md "Real Credentials & Warehouse").
        productName: sanitizeBigshipProductName(item.product_name),
        // Falls back to the default HSN bucket (constants/index.js GST_HSN)
        // rather than an empty string — covers orders placed before
        // hsn_code started being captured on OrderItem.
        hsn: item.hsn_code || GST_HSN.DEFAULT.hsn,
        qty: item.quantity,
        amount: parseFloat(item.unit_price),
        totalAmount,
        collectableAmount: order.payment_method === 'cod' ? totalAmount : 0,
        categoryId: '1',
      };
    });
    // Also discovered via a live 422 ("Master order invoice amount must be
    // equal to the sum of all product totalAmount values") — Bigship
    // validates this field against the *product* line-item totals only
    // (pre-GST, pre-shipping), not the order's actual amount-paid total.
    const productsTotal = parseFloat(products.reduce((s, p) => s + p.totalAmount, 0).toFixed(2));

    return {
      segment_type: 'domestic_b2c',
      MasterOrderPickUpLocation: env.BIGSHIP.WAREHOUSE_ID,
      MasterOrderReturnLocation: env.BIGSHIP.WAREHOUSE_ID,
      // `underscored: true` on the Order model only renames the DB column
      // (created_at) — the JS instance attribute is still Sequelize's default
      // `createdAt`. `order.created_at` was always undefined, so this threw
      // "Invalid time value" on every real call — never caught before now
      // because this flow had never been exercised end-to-end (see claude.md
      // Testing section, step 5: "not independently exercised via the admin
      // 'Create Shipment' flow yet").
      MasterOrderDate: new Date(order.createdAt).toISOString().slice(0, 19).replace('T', ' '),
      MasterOrderPaymentMode: order.payment_method === 'cod' ? 2 : 1,
      // Suffixed with a timestamp — confirmed via a live 422 ("The order
      // invoice number must be unique for your account") that Bigship
      // rejects a second Create Order draft reusing the same OrderInvoiceNo.
      // The admin "Create Shipment" flow calls this once per modal-open (see
      // getShippingOptions), and an admin can legitimately close the modal
      // without booking and reopen it later for the same order, so
      // order.order_number alone can't be used here — this is a Bigship-side
      // draft reference, not this app's actual invoice number, so
      // suffixing it is safe.
      OrderInvoiceNo: `${order.order_number}-${Date.now()}`,
      MasterOrderInvoiceAmount: productsTotal,
      MasterOrderShippingEmail: order.User?.email || undefined,
      MasterOrderShippingName: order.User?.name || addr.name,
      MasterOrderShippingMobileNo: addr.phone,
      MasterOrderShippingAddress: addr.line1,
      MasterOrderShippingAddress2: addr.line2 || '',
      MasterOrderShippingLandmark: addr.landmark || 'N/A',
      MasterOrderShippingZipCode: addr.pincode,
      MasterOrderShippingCountry: 'India',
      MasterOrderShippingState: addr.state,
      MasterOrderShippingCity: addr.city,
      totalNumOfBoxes: 1,
      boxes: [{
        weight_unit: 'kg',
        dimension_unit: 'cm',
        noOfBoxes: 1,
        dimensions: [{ length: 20, breadth: 15, height: 15, weight: 0.5 }],
        products,
      }],
    };
  }

  // Step 1 of 2 — creates the draft order and returns its serviceable couriers.
  // The admin UI shows this list and lets the admin pick one; the SAME
  // masterCustomOrderId must be reused in step 2 (bookShipment), not a fresh
  // draft, per Bigship's own documented dependency between the two calls.
  async getShippingOptions(order) {
    if (!order.shipping_address) throw new Error('No shipping address');
    if (!env.BIGSHIP.WAREHOUSE_ID) throw new Error('BIGSHIP_WAREHOUSE_ID is not configured — register a pickup warehouse first');

    const draft = await this.createOrder(this.buildB2cOrderPayload(order));
    const masterCustomOrderId = draft.data.CustomGlobalOrderId;
    const rates = await this.getCourierRates(masterCustomOrderId);

    return { masterCustomOrderId, couriers: rates.data.calculatedRates };
  }

  // Step 2 of 2 — real booking against the draft order created in step 1.
  // `courierName` is passed through from the step-1 courier list (not
  // re-fetched here, since Place Order's response doesn't echo it back).
  async bookShipment(order, { masterCustomOrderId, courierId, courierName, riskTypeId }) {
    const placed = await this.placeOrder({ masterCustomOrderId, courierId, riskTypeId });

    const shipment = await Shipment.create({
      order_id: order.id,
      bigship_custom_order_id: masterCustomOrderId,
      bigship_courier_id: String(courierId),
      bigship_courier_name: courierName || null,
      segment_type: 'domestic_b2c',
      awb_code: String(placed.data.awb_assigned || ''),
      courier_name: courierName || null,
      status: 'booked',
    });

    logger.info(`Bigship shipment booked for order #${order.order_number}: ${masterCustomOrderId}`);
    return shipment;
  }

  // Automatic shipment creation — no admin courier-picker involved. Runs the
  // same draft+rate-calc step the admin modal uses (getShippingOptions), then
  // always books the **cheapest** serviceable courier by its `total` field
  // (confirmed real field name — see "Admin Create Shipment UI" in claude.md).
  // Called by OrderService.autoBookShipmentIfNeeded whenever an Order reaches
  // `confirmed` — deliberate choice per the project owner (2026-07-24): no
  // manual "Create Shipment" step anymore, at the cost of losing the
  // courier-comparison UX Bigship's rate-shopping was originally built for.
  async autoBookCheapestShipment(order) {
    const options = await this.getShippingOptions(order);
    const couriers = options.couriers || [];
    if (!couriers.length) {
      throw new Error('No serviceable couriers returned for this order — cannot auto-book');
    }

    const cheapest = couriers.reduce((min, c) =>
      parseFloat(c.total) < parseFloat(min.total) ? c : min
    );

    return this.bookShipment(order, {
      masterCustomOrderId: options.masterCustomOrderId,
      courierId: cheapest.courierId,
      courierName: cheapest.courierName,
      riskTypeId: cheapest.riskCharges?.[0]?.typeId,
    });
  }

  // Pulls the live tracking status for one shipment and writes it back onto
  // the Shipment row. Used by both the admin "Refresh Tracking" button
  // (OrderController.trackShipment) and the tracking-sync cron job
  // (src/cron/index.js) — single place this logic lives, so both stay
  // consistent.
  //
  // No confirmed sample Track Order response was available to hand-derive
  // an exact field mapping from (see services/bigship/claude.md's Testing
  // section — "Track Order / Order Detail — not yet done"), so this is
  // deliberately defensive: the full raw response is always saved
  // (`tracking_response`) and a human-readable status string is
  // best-effort-extracted from whichever field name the real response
  // actually uses (`courier_status_raw`), so the admin panel always shows
  // *something* useful even if the enum mapping below misses. The internal
  // `status` enum is only advanced when the raw text clearly matches a known
  // keyword — an unrecognized shape leaves `status` untouched rather than
  // guessing wrong.
  async syncShipmentStatus(shipment) {
    if (!shipment.bigship_custom_order_id) {
      throw new Error('This shipment has no Bigship order id to track (predates the Bigship migration)');
    }

    const result = await this.trackOrder(shipment.bigship_custom_order_id);
    const data = result.data || {};

    const rawStatus = pickFirstDefined(data, [
      'current_status', 'tracking_status', 'order_status', 'status', 'Status', 'shipment_status',
    ]);
    const trackingUrl = pickFirstDefined(data, ['tracking_url', 'trackingUrl', 'awb_tracking_url', 'track_url']);

    const mappedStatus = mapBigshipStatusToShipmentStatus(rawStatus || JSON.stringify(data));

    const updates = {
      tracking_response: data,
      last_tracked_at: new Date(),
    };
    if (rawStatus) updates.courier_status_raw = String(rawStatus).slice(0, 200);
    if (trackingUrl) updates.tracking_url = trackingUrl;
    if (mappedStatus) updates.status = mappedStatus;
    if (mappedStatus === SHIPMENT_STATUS.DELIVERED && !shipment.delivered_at) updates.delivered_at = new Date();

    await shipment.update(updates);
    return shipment;
  }
}

// Bigship rejects any product name containing digits/punctuation (confirmed
// via a live 422 — see buildB2cOrderPayload). Strips everything except
// letters/spaces/dashes/underscores, collapses the resulting whitespace, and
// falls back to a generic label rather than sending an empty string.
function sanitizeBigshipProductName(name) {
  const cleaned = String(name || '')
    .replace(/[^A-Za-z\s\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'Product').substring(0, 50);
}

// Returns the first key present in `obj` from `keys`, or null. Bigship's real
// Track Order response shape isn't confirmed (see syncShipmentStatus above),
// so this checks several plausible field-name variants rather than assuming one.
function pickFirstDefined(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return null;
}

// Best-effort keyword match against whatever raw status text Bigship
// returns — deliberately loose (case-insensitive substring match against the
// stringified value) since the exact enum Bigship uses server-side isn't
// documented anywhere this codebase has access to. Returns null (meaning
// "don't change the stored status") rather than guessing when nothing matches.
function mapBigshipStatusToShipmentStatus(rawValue) {
  const text = String(rawValue || '').toLowerCase();
  if (!text) return null;
  if (/delivered/.test(text)) return SHIPMENT_STATUS.DELIVERED;
  if (/out[\s_-]*for[\s_-]*delivery/.test(text)) return SHIPMENT_STATUS.OUT_FOR_DELIVERY;
  if (/rto|return/.test(text)) return SHIPMENT_STATUS.RETURNED;
  if (/cancel|undelivered|failed|lost/.test(text)) return SHIPMENT_STATUS.FAILED;
  if (/transit/.test(text)) return SHIPMENT_STATUS.IN_TRANSIT;
  if (/picked[\s_-]*up/.test(text)) return SHIPMENT_STATUS.PICKED_UP;
  if (/pickup/.test(text)) return SHIPMENT_STATUS.PICKUP_REQUESTED;
  return null;
}

module.exports = new BigshipService();
