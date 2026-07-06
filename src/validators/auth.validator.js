const Joi = require('joi');

exports.register = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  password: Joi.string().min(8).required().messages({ 'string.min': 'Password must be at least 8 characters' }),
});

exports.login = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

exports.forgotPassword = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

exports.resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

exports.changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});
