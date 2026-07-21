const BigshipService = require('./bigship/BigshipService');
const logger = require('../utils/logger');

// Warehouse pickup address (Satpur/Trimbakeshwar Rd, Pimpalgaon Bahula, Nashik district).
const SOURCE_PINCODE = '422213';

const FREE_SHIPPING_THRESHOLD = 899;
const FALLBACK_SHIPPING_CHARGE = 60;

// Pincodes/cities eligible for the free-shipping override (orders UNDER
// FREE_SHIPPING_THRESHOLD only — see calculateShipping below; confirmed
// explicitly, this is deliberately the reverse of the usual "bigger order
// ships free" e-commerce convention). Starts with just the warehouse's own
// pincode — the business owner is still providing the full list of nearby
// serviceable areas; expand these arrays once that list arrives rather than
// hardcoding a guess.
const FREE_SHIPPING_PINCODES = ['422213'];
const FREE_SHIPPING_CITIES = [];

function isFreeShippingZone({ pincode, city }) {
  if (pincode && FREE_SHIPPING_PINCODES.includes(String(pincode).trim())) return true;
  if (city && FREE_SHIPPING_CITIES.some((c) => c.toLowerCase() === String(city).trim().toLowerCase())) return true;
  return false;
}

// Tape-roll weight isn't tracked as clean structured data (ProductVariant.weight
// is a free-text string like "500 gram" — unreliable to parse), so this mirrors
// the same fixed-box approximation BigshipService.buildB2cOrderPayload already
// uses for real shipment booking, scaled by quantity.
function estimateWeightKg(totalQuantity) {
  return Math.max(0.5, Math.round(totalQuantity * 0.3 * 100) / 100);
}

/**
 * Single source of truth for "what does shipping cost for this order" —
 * used by both the public pre-checkout estimator and OrderService.createOrder,
 * so the number shown to a customer and the number actually charged always agree.
 *
 * @param {{ destPincode: string, destCity?: string, subtotal: number, totalQuantity: number, isCod?: boolean }} input
 * @returns {Promise<{ serviceable: boolean, freeShipping: boolean, shippingCharge: number|null, courierName: string|null, usedFallback: boolean, message?: string }>}
 * `serviceable: false` (with `shippingCharge: null` and a `message`) means Bigship
 * gave a real "no courier serves this pincode" answer — not a technical failure.
 */
async function calculateShipping({ destPincode, destCity, subtotal, totalQuantity, isCod = false }) {
  // Computed once and reused below — the fallback branch must respect the
  // same zone check, not just the order-value threshold, or an address
  // outside the free-shipping zone could wrongly get free shipping whenever
  // the live Bigship call happens to fail.
  //
  // Explicitly confirmed direction (reconfirmed multiple times, since it's
  // the reverse of typical e-commerce): orders UNDER ₹899, within the
  // free-shipping zone, ship free. Orders AT OR ABOVE ₹899 always get a real
  // shipping charge (Bigship live rate, or the flat fallback), regardless of
  // zone. Do not "fix" this back to the conventional direction without
  // reconfirming — this was deliberately flipped from the initial build.
  const qualifiesForFreeShipping = subtotal < FREE_SHIPPING_THRESHOLD && isFreeShippingZone({ pincode: destPincode, city: destCity });

  if (qualifiesForFreeShipping) {
    return { serviceable: true, freeShipping: true, shippingCharge: 0, courierName: null, usedFallback: false };
  }

  const weight = estimateWeightKg(totalQuantity);
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
    boxes: [{ no_of_box: '1', box_length: '20', box_width: '15', box_height: '15', box_dead_weight: String(weight) }],
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
    return { serviceable: true, freeShipping: false, shippingCharge: FALLBACK_SHIPPING_CHARGE, courierName: null, usedFallback: true };
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
    freeShipping: false,
    shippingCharge: Math.round(parseFloat(cheapest.totalCharge)),
    courierName: cheapest.courierName || null,
    usedFallback: false,
  };
}

module.exports = { calculateShipping, isFreeShippingZone, SOURCE_PINCODE, FREE_SHIPPING_THRESHOLD, FALLBACK_SHIPPING_CHARGE };
