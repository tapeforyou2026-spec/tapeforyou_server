const ShippingService = require('../services/ShippingService');
const R = require('../utils/response');

// Public — used by the "Check Delivery Availability" widget on the product
// and cart pages, and by checkout once an address is selected. Same
// ShippingService.calculateShipping() the order-creation flow uses, so the
// quote shown here always matches what the order actually gets charged.
exports.check = async (req, res) => {
  const { pincode, city, subtotal, quantity, isCod } = req.body;
  if (!pincode || !/^\d{6}$/.test(String(pincode))) return R.error(res, 'Enter a valid 6-digit pincode');

  const result = await ShippingService.calculateShipping({
    destPincode: pincode,
    destCity: city,
    subtotal: parseFloat(subtotal) || 0,
    totalQuantity: parseInt(quantity) || 1,
    isCod: !!isCod,
  });

  return R.success(res, 'Shipping estimate', result);
};
