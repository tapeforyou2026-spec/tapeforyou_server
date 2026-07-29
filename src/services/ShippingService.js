const BigshipService = require('./bigship/BigshipService');
const logger = require('../utils/logger');
const { calcPackageDimensions } = require('../utils/packageDimensions');

// Warehouse pickup address (Satpur/Trimbakeshwar Rd, Pimpalgaon Bahula, Nashik district).
const SOURCE_PINCODE = '422213';

const FREE_SHIPPING_THRESHOLD = 899;
const FALLBACK_SHIPPING_CHARGE = 60;

/**
 * Single source of truth for "what does shipping cost for this order" —
 * used by both the public pre-checkout estimator and OrderService.createOrder,
 * so the number shown to a customer and the number actually charged always agree.
 *
 * @param {{ destPincode: string, destCity?: string, subtotal: number, totalQuantity: number,
 *   isCod?: boolean, items?: Array<{ quantity: number, dim_length?: number|null, dim_width?: number|null,
 *   dim_height?: number|null, gross_weight?: number|null }> }} input
 * `items`, when provided (real order/cart lines with their variant's real dimensions/weight —
 * see server/server/CLAUDE.md's "Real Package Dimensions" section), gives a real per-product
 * box/weight estimate via calcPackageDimensions instead of the flat per-unit approximation.
 * @returns {Promise<{ serviceable: boolean, freeShipping: boolean, shippingCharge: number|null, courierName: string|null, usedFallback: boolean, message?: string }>}
 * `serviceable: false` (with `shippingCharge: null` and a `message`) means Bigship
 * gave a real "no courier serves this pincode" answer — not a technical failure.
 */
async function calculateShipping({ destPincode, destCity, subtotal, totalQuantity, isCod = false, items = null }) {
  // Standard e-commerce direction (switched 2026-07-28, replacing an earlier
  // deliberately-reversed rule): orders AT OR ABOVE ₹899 ship free, anywhere
  // Bigship actually serves. Orders UNDER ₹899 pay the real Bigship rate (or
  // the flat fallback on a Bigship outage). Deliverability is still checked
  // via Bigship regardless of order value — free shipping never overrides a
  // genuine "we don't deliver here" answer.
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  // Real per-variant dimensions/weight when `items` is passed (see
  // ProductRepository/OrderService callers); falls back to a single synthetic
  // line (`{ quantity: totalQuantity }`, no dims) which calcPackageDimensions
  // resolves to the same flat approximation this used before real
  // dimensions existed (300g/unit, 20x15x15cm default box).
  const box = calcPackageDimensions(items && items.length ? items : [{ quantity: totalQuantity }]);
  const ratePayload = {
    segment_type: 'domestic_b2c',
    sourcePincode: SOURCE_PINCODE,
    destPincode: String(destPincode),
    invoiceValue: subtotal,
    paymentModeId: isCod ? 2 : 1,
    // Required by Bigship whenever paymentModeId is COD — confirmed via a
    // real 422 ("COD amount is required for COD payments.") when this was
    // omitted, which silently sent every COD request straight to the
    // fallback ₹60 charge instead of a real (and correctly higher, since COD
    // carries its own handling fee) rate. Using the full subtotal as the
    // collectible amount — verified this value is accepted by a real call.
    ...(isCod ? { codAmount: subtotal } : {}),
    riskTypeId: 2,
    boxes: [{
      no_of_box: '1',
      box_length: String(box.lengthCm),
      box_width: String(box.widthCm),
      box_height: String(box.heightCm),
      box_dead_weight: String(box.weightKg),
    }],
  };

  // These two failure modes are genuinely different and must not share a
  // fallback path:
  //   1. The Bigship API call itself fails (network/auth/timeout) — a
  //      technical outage, not a real answer about deliverability. Per the
  //      confirmed fallback decision, never block checkout over this.
  //   2. The call succeeds but returns zero couriers — a real, authoritative
  //      "we cannot deliver here" answer from Bigship. Charging a flat
  //      fallback fee for an order that genuinely can't ship would be worse
  //      than telling the customer up front, so this returns
  //      `serviceable: false` instead of a fallback price.
  let rates;
  try {
    rates = await BigshipService.rateCalculator(ratePayload);
  } catch (err) {
    logger.error(`ShippingService.calculateShipping API failure for pincode ${destPincode}: ${err.message}`);
    return {
      serviceable: true,
      freeShipping: qualifiesForFreeShipping,
      shippingCharge: qualifiesForFreeShipping ? 0 : FALLBACK_SHIPPING_CHARGE,
      courierName: null,
      usedFallback: true,
    };
  }

  const options = Array.isArray(rates.data) ? rates.data : [];
  if (!options.length) {
    return {
      serviceable: false,
      freeShipping: false,
      shippingCharge: null,
      courierName: null,
      usedFallback: false,
      message: 'Sorry, we currently do not deliver to this pincode.',
    };
  }

  const cheapest = options.reduce((min, c) => (parseFloat(c.totalCharge) < parseFloat(min.totalCharge) ? c : min));
  return {
    serviceable: true,
    freeShipping: qualifiesForFreeShipping,
    shippingCharge: qualifiesForFreeShipping ? 0 : Math.round(parseFloat(cheapest.totalCharge)),
    courierName: cheapest.courierName || null,
    usedFallback: false,
  };
}

module.exports = { calculateShipping, SOURCE_PINCODE, FREE_SHIPPING_THRESHOLD, FALLBACK_SHIPPING_CHARGE };
