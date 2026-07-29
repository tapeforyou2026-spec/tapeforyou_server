const Joi = require('joi');

exports.createSession = Joi.object({
  orderId: Joi.number().integer().required(),
});

exports.initiateRefund = Joi.object({
  paymentId: Joi.number().integer().required(),
  amount: Joi.number().positive().precision(2).optional(), // omit = full refund
});
