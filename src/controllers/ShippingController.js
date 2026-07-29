const ShippingService = require('../services/ShippingService');
const { ProductVariant } = require('../models');
const R = require('../utils/response');

// Public — used by the "Check Delivery Availability" widget on the product
// and cart pages, and by checkout once an address is selected. Same
// ShippingService.calculateShipping() the order-creation flow uses, so the
// quote shown here always matches what the order actually gets charged.
//
// `items` (optional): [{ variantId, quantity }] — when the caller knows
// which real variants are involved (product page: the one selected variant;
// cart page: every cart line), their real dim_length/dim_width/dim_height/
// gross_weight are looked up here and fed into the same box-estimation
// calcPackageDimensions() uses for the real order-creation quote, so this
// pre-checkout estimate matches as closely as possible. Falls back to the
// generic quantity-only approximation when `items` isn't provided.
exports.check = async (req, res) => {
  const { pincode, city, subtotal, quantity, isCod, items } = req.body;
  if (!pincode || !/^\d{6}$/.test(String(pincode))) return R.error(res, 'Enter a valid 6-digit pincode');

  let resolvedItems = null;
  if (Array.isArray(items) && items.length) {
    const variantIds = items.map((i) => i.variantId).filter(Boolean);
    const variants = await ProductVariant.findAll({ where: { id: variantIds } });
    const variantById = new Map(variants.map((v) => [v.id, v]));
    resolvedItems = items
      .filter((i) => variantById.has(i.variantId))
      .map((i) => {
        const variant = variantById.get(i.variantId);
        return {
          quantity: parseInt(i.quantity, 10) || 1,
          dim_length: variant.dim_length,
          dim_width: variant.dim_width,
          dim_height: variant.dim_height,
          gross_weight: variant.gross_weight,
        };
      });
  }

  const result = await ShippingService.calculateShipping({
    destPincode: pincode,
    destCity: city,
    subtotal: parseFloat(subtotal) || 0,
    totalQuantity: parseInt(quantity) || 1,
    isCod: !!isCod,
    items: resolvedItems,
  });

  return R.success(res, 'Shipping estimate', result);
};
