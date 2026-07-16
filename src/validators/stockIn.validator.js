const Joi = require('joi');

exports.create = Joi.object({
  variant_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required(),
  supplier_name: Joi.string().trim().max(150).allow('', null),
  expected_date: Joi.date().iso().allow(null),
  notes: Joi.string().trim().allow('', null),
});

exports.receive = Joi.object({
  received_quantity: Joi.number().integer().min(1),
});
