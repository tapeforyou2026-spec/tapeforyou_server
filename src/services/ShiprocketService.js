const axios = require('axios');
const env = require('../config/env');
const { Shipment, Order } = require('../models');
const logger = require('../utils/logger');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

class ShiprocketService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    if (this.token && this.tokenExpiry > Date.now()) return this.token;

    const { data } = await axios.post(`${BASE_URL}/auth/login`, {
      email: env.SHIPROCKET.EMAIL,
      password: env.SHIPROCKET.PASSWORD,
    });
    this.token = data.token;
    this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
    return this.token;
  }

  async request(method, endpoint, body = null) {
    const token = await this.getToken();
    const { data } = await axios({ method, url: `${BASE_URL}${endpoint}`, data: body, headers: { Authorization: `Bearer ${token}` } });
    return data;
  }

  async createShipment(order) {
    if (!order.shipping_address) throw new Error('No shipping address');

    const payload = {
      order_id: order.order_number,
      order_date: new Date(order.created_at).toISOString(),
      pickup_location: 'Primary',
      billing_customer_name: order.User?.name || '',
      billing_address: order.shipping_address.line1,
      billing_city: order.shipping_address.city,
      billing_state: order.shipping_address.state,
      billing_pincode: order.shipping_address.pincode,
      billing_country: 'India',
      billing_email: order.User?.email || '',
      billing_phone: order.shipping_address.phone,
      shipping_is_billing: true,
      order_items: order.items.map(item => ({
        name: item.product_name.substring(0, 50),
        sku: item.sku,
        units: item.quantity,
        selling_price: parseFloat(item.unit_price),
        discount: 0,
        tax: parseFloat(item.gst_percent),
        hsn: 39191000,
      })),
      payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
      sub_total: parseFloat(order.subtotal),
      length: 20,
      breadth: 15,
      height: 15,
      weight: 0.5,
    };

    const result = await this.request('POST', '/orders/create/adhoc', payload);

    const shipment = await Shipment.create({
      order_id: order.id,
      shiprocket_order_id: String(result.order_id),
      shiprocket_shipment_id: String(result.shipment_id),
      status: 'booked',
    });

    return shipment;
  }

  async generateAWB(shipmentId, courierId = null) {
    const data = await this.request('POST', '/courier/assign/awb', {
      shipment_id: shipmentId,
      courier_id: courierId,
    });
    return data;
  }

  async trackByAWB(awb) {
    return this.request('GET', `/courier/track/awb/${awb}`);
  }

  async generateLabel(shipmentId) {
    return this.request('POST', '/courier/generate/label', { shipment_id: [shipmentId] });
  }

  async requestPickup(shipmentId) {
    return this.request('POST', '/courier/generate/pickup', { shipment_id: [shipmentId] });
  }
}

module.exports = new ShiprocketService();
