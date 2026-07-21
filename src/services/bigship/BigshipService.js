const axios = require('axios');
const env = require('../../config/env');
const { Shipment } = require('../../models');
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
    return {
      segment_type: 'domestic_b2c',
      MasterOrderPickUpLocation: env.BIGSHIP.WAREHOUSE_ID,
      MasterOrderReturnLocation: env.BIGSHIP.WAREHOUSE_ID,
      MasterOrderDate: new Date(order.created_at).toISOString().slice(0, 19).replace('T', ' '),
      MasterOrderPaymentMode: order.payment_method === 'cod' ? 2 : 1,
      OrderInvoiceNo: order.order_number,
      MasterOrderInvoiceAmount: parseFloat(order.total),
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
        products: order.items.map((item) => ({
          productName: item.product_name.substring(0, 50),
          hsn: item.hsn_code || '',
          qty: item.quantity,
          amount: parseFloat(item.unit_price),
          totalAmount: parseFloat(item.unit_price) * item.quantity,
          collectableAmount: order.payment_method === 'cod' ? parseFloat(item.unit_price) * item.quantity : 0,
          categoryId: '1',
        })),
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
}

module.exports = new BigshipService();
