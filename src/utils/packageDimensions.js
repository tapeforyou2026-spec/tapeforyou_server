// Shared by ShippingService.js (checkout-time rate estimate) and
// BigshipService.js (the real Create Order / Place Order payload) — single
// place that turns a set of order/cart line items into one approximate
// shipment box, so both quote the same box to Bigship.
//
// Real per-item length/width/height/gross_weight (from ProductVariant —
// see server/server/CLAUDE.md's "Net Weight / Gross Weight Fields" and this
// same section for dim_length/dim_width/dim_height) are used when present.
// Historically this was always a single hardcoded 20x15x15cm/0.5kg guess
// regardless of product or quantity — this only replaces that guess with
// real data where it exists; items still missing real dimensions/weight
// (most variants don't have dim_length/width/height populated yet — see
// CLAUDE.md) fall back to that same historical per-unit default.

const FALLBACK_LENGTH_CM = 20;
const FALLBACK_WIDTH_CM = 15;
const FALLBACK_HEIGHT_CM = 15;
const FALLBACK_WEIGHT_GRAMS_PER_UNIT = 300; // matches ShippingService's old estimateWeightKg (0.3kg/unit)
const MIN_WEIGHT_KG = 0.5; // matches the old floor — Bigship's own minimum chargeable-weight behavior

// This project doesn't do real multi-box bin-packing (out of scope — see
// claude.md) — items are approximated as stacked on top of each other in a
// single box (length/width = the largest single item's footprint, height =
// sum of every unit's height). Capped so a large-quantity order doesn't
// report an physically-impossible box to Bigship (which would distort its
// volumetric-weight pricing far more than the historical flat guess did).
const MAX_HEIGHT_CM = 100;

/**
 * @param {Array<{ quantity: number, dim_length?: number|string|null, dim_width?: number|string|null,
 *   dim_height?: number|string|null, gross_weight?: number|string|null }>} items
 * @returns {{ lengthCm: number, widthCm: number, heightCm: number, weightKg: number }}
 */
function calcPackageDimensions(items) {
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;
  let totalWeightGrams = 0;

  for (const item of items || []) {
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const length = toPositiveNumber(item.dim_length) || FALLBACK_LENGTH_CM;
    const width = toPositiveNumber(item.dim_width) || FALLBACK_WIDTH_CM;
    const height = toPositiveNumber(item.dim_height) || FALLBACK_HEIGHT_CM;
    const weightGramsPerUnit = toPositiveNumber(item.gross_weight) || FALLBACK_WEIGHT_GRAMS_PER_UNIT;

    maxLength = Math.max(maxLength, length);
    maxWidth = Math.max(maxWidth, width);
    totalHeight += height * quantity;
    totalWeightGrams += weightGramsPerUnit * quantity;
  }

  return {
    lengthCm: maxLength || FALLBACK_LENGTH_CM,
    widthCm: maxWidth || FALLBACK_WIDTH_CM,
    heightCm: Math.min(totalHeight || FALLBACK_HEIGHT_CM, MAX_HEIGHT_CM),
    weightKg: Math.max(MIN_WEIGHT_KG, Math.round((totalWeightGrams / 1000) * 100) / 100),
  };
}

function toPositiveNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = { calcPackageDimensions };
