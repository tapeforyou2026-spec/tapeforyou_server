const Joi = require('joi');
const { OTP_PURPOSE } = require('../constants');

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
// Min 8 chars, at least one lowercase, one uppercase, one digit, one special char.
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=]).{8,}$/;
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character';

exports.register = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  phone: Joi.string().pattern(INDIAN_MOBILE).required().messages({
    'string.pattern.base': 'Enter a valid 10-digit Indian mobile number',
    'string.empty': 'Mobile number is required',
  }),
  password: Joi.string().pattern(STRONG_PASSWORD).required().messages({ 'string.pattern.base': PASSWORD_MESSAGE }),
});

// Accepts either an email or a 10-digit Indian mobile number as the identifier.
exports.login = Joi.object({
  identifier: Joi.alternatives()
    .try(Joi.string().email(), Joi.string().pattern(INDIAN_MOBILE))
    .required()
    .messages({ 'alternatives.match': 'Enter a valid email or 10-digit mobile number' }),
  password: Joi.string().required(),
});

exports.forgotPassword = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

exports.resendVerification = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

exports.resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().pattern(STRONG_PASSWORD).required().messages({ 'string.pattern.base': PASSWORD_MESSAGE }),
});

exports.changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().pattern(STRONG_PASSWORD).required().messages({ 'string.pattern.base': PASSWORD_MESSAGE }),
});

exports.sendOtp = Joi.object({
  phone: Joi.string().pattern(INDIAN_MOBILE).required().messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  purpose: Joi.string().valid(...Object.values(OTP_PURPOSE)).required(),
});

exports.verifyOtp = Joi.object({
  phone: Joi.string().pattern(INDIAN_MOBILE).required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({ 'string.pattern.base': 'OTP must be 6 digits' }),
  purpose: Joi.string().valid(...Object.values(OTP_PURPOSE)).required(),
});
