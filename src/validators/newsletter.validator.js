const Joi = require('joi');

exports.subscribe = Joi.object({
  email: Joi.string().trim().email().required(),
});
