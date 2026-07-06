const Joi = require('joi');

const ROLE_SLUGS = ['super_admin', 'admin', 'manager', 'support'];

exports.create = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  password: Joi.string().min(8).required().messages({ 'string.min': 'Password must be at least 8 characters' }),
  role: Joi.string().valid(...ROLE_SLUGS).required(),
});

exports.update = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).allow('').optional(),
  role: Joi.string().valid(...ROLE_SLUGS).optional(),
});

exports.updateStatus = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

exports.resetPassword = Joi.object({
  newPassword: Joi.string().min(8).required().messages({ 'string.min': 'Password must be at least 8 characters' }),
});
