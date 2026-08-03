const Joi = require('joi');

exports.requestReturn = Joi.object({
  orderId: Joi.number().integer().required(),
  reason: Joi.string().min(5).max(500).required(),
});

exports.rejectReturn = Joi.object({
  admin_note: Joi.string().max(500).optional().allow('', null),
});
