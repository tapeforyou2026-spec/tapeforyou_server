const Joi = require('joi');

exports.createOrder = Joi.object({
  addressId: Joi.number().integer().required(),
  couponCode: Joi.string().uppercase().optional().allow('', null),
  paymentMethod: Joi.string().valid('razorpay', 'cod', 'upi').required(),
  notes: Joi.string().max(500).optional().allow('', null),
});

exports.addToCart = Joi.object({
  variant_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).default(1),
});

exports.updateCartItem = Joi.object({
  quantity: Joi.number().integer().min(0).required(),
});

exports.address = Joi.object({
  type: Joi.string().valid('home', 'work', 'other').default('home'),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  line1: Joi.string().min(5).max(300).required(),
  line2: Joi.string().max(300).optional().allow('', null),
  city: Joi.string().max(100).required(),
  state: Joi.string().max(100).required(),
  pincode: Joi.string().pattern(/^\d{6}$/).required(),
  country: Joi.string().default('India'),
  is_default: Joi.boolean().default(false),
  gstin: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().allow('', null),
  company_name: Joi.string().max(200).optional().allow('', null),
});
