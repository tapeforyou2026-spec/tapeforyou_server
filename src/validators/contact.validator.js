const Joi = require('joi');

exports.create = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(30).allow('', null),
  subject: Joi.string().trim().max(50).required(),
  message: Joi.string().trim().min(10).max(2000).required(),
});
