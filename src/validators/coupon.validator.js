const Joi = require('joi');

exports.create = Joi.object({
  code: Joi.string().trim().max(30).pattern(/^[A-Za-z0-9]+$/).required()
    .messages({ 'string.pattern.base': 'Coupon code must contain only letters and numbers' }),
  type: Joi.string().valid('flat', 'percent').required(),
  value: Joi.number().positive().required(),
  min_order_amount: Joi.number().min(0).default(0),
  max_discount: Joi.number().positive().allow(null),
  usage_limit: Joi.number().integer().positive().allow(null),
  per_user_limit: Joi.number().integer().positive().default(1),
  applicable_for: Joi.string().valid('all', 'b2c', 'b2b').default('all'),
  starts_at: Joi.date().iso().allow(null),
  expires_at: Joi.date().iso().allow(null),
  status: Joi.string().valid('active', 'inactive').default('active'),
  description: Joi.string().trim().max(300).allow('', null),
});

exports.update = exports.create.fork(['code', 'type', 'value'], (s) => s.optional());
