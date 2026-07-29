const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');

// See ./claude.md for the full integration guide — read it before changing
// this file. Every field/endpoint here is taken from the real HDFC
// SmartGateway documentation actually reviewed for this project (see
// PAYMENT_DOCUMENTATION.md and HDFC-SmartGateway-Documentation-Verification.md
// at the backend root) — nothing here is guessed.
class HdfcGatewayService {
  assertConfigured() {
    if (!env.HDFC.MERCHANT_ID || !env.HDFC.API_KEY) {
      throw new Error('HDFC SmartGateway is not configured — set HDFC_MERCHANT_ID and HDFC_API_KEY first');
    }
  }

  authHeader() {
    return `Basic ${Buffer.from(env.HDFC.API_KEY).toString('base64')}`;
  }

  // Same error-surfacing discipline already established twice in this
  // codebase (BigshipService.request, ShiprocketService.request) — axios
  // throws its own generic "Request failed with status code 4xx" for any
  // non-2xx response by default, which hides the real reason. Re-thrown
  // with HDFC's actual error body instead.
  async request(method, path, { body, headers = {}, params } = {}) {
    this.assertConfigured();
    const url = `${env.HDFC.BASE_URL}${path}`;
    try {
      const { data } = await axios({ method, url, data: body, params, headers: { ...headers } });
      return data;
    } catch (err) {
      const errBody = err.response?.data;
      if (errBody) {
        const detail = errBody.error_info || errBody.error_message ? ` — ${JSON.stringify(errBody.error_info || errBody.error_message)}` : '';
        throw new Error(`HDFC request failed${detail || `: ${JSON.stringify(errBody)}`}`);
      }
      throw err;
    }
  }

  // --- Session Create API ---
  // POST /session — confirmed real request/response schema. order_id must
  // be < 21 chars, alphanumeric only (no hyphens/underscores) — confirmed
  // real constraint, so HdfcPaymentService generates a sanitized id rather
  // than reusing this project's own "ORD-12345678" order_number as-is.
  async createSession({ orderId, amount, customerId, customerEmail, customerPhone, returnUrl, firstName, lastName, description }) {
    return this.request('POST', '/session', {
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        'x-merchantid': env.HDFC.MERCHANT_ID,
        'x-customerid': String(customerId),
        'x-resellerid': 'hdfc_reseller',
      },
      body: {
        order_id: orderId,
        amount: Number(amount).toFixed(2),
        customer_id: String(customerId),
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_page_client_id: env.HDFC.PAYMENT_PAGE_CLIENT_ID || env.HDFC.MERCHANT_ID,
        action: 'paymentPage',
        return_url: returnUrl,
        currency: 'INR',
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(description ? { description } : {}),
      },
    });
  }

  // --- Order Status API ---
  // GET /orders/{order_id} — the MANDATORY server-to-server verification
  // call. HDFC's own docs: "it is mandatory to do a Server-to-Server Order
  // Status API call to determine the final payment status" — never trust
  // the browser return-URL redirect alone (see HdfcPaymentService.verify).
  async getOrderStatus(hdfcOrderId, customerId) {
    return this.request('GET', `/orders/${hdfcOrderId}`, {
      headers: {
        Authorization: this.authHeader(),
        'x-merchantid': env.HDFC.MERCHANT_ID,
        // Date-stamped API version header, confirmed real requirement.
        version: new Date().toISOString().slice(0, 10),
        'x-routing-id': String(customerId),
        'x-resellerid': 'hdfc_reseller',
      },
    });
  }

  // --- Refund Order API ---
  // POST /orders/{order_id}/refunds — unique_request_id must be <= 21
  // chars and never reused across two different refund requests (confirmed
  // real constraint — HDFC itself rejects a reused value).
  async createRefund(hdfcOrderId, { uniqueRequestId, amount, customerId }) {
    if (uniqueRequestId.length > 21) {
      throw new Error('unique_request_id must be 21 characters or fewer (HDFC constraint)');
    }
    return this.request('POST', `/orders/${hdfcOrderId}/refunds`, {
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        'x-merchantid': env.HDFC.MERCHANT_ID,
        'x-customerid': String(customerId),
        'x-resellerid': 'hdfc_reseller',
      },
      body: {
        unique_request_id: uniqueRequestId,
        amount: Number(amount).toFixed(2),
      },
    });
  }
}

module.exports = new HdfcGatewayService();
