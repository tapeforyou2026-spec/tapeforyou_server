const AuthService = require('../services/AuthService');
const EmailService = require('../services/EmailService');
const UserRepository = require('../repositories/UserRepository');
const { User } = require('../models');
const { generateToken, hashToken } = require('../utils/crypto');
const R = require('../utils/response');
const env = require('../config/env');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await UserRepository.findByEmail(email);
  if (existing) return R.error(res, 'Email already registered', null, 409);

  const verifyToken = generateToken();
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    phone,
    password,
    email_verify_token: hashToken(verifyToken),
    email_verify_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await EmailService.sendEmailVerification(user, verifyToken).catch(() => {});
  await EmailService.sendWelcome(user).catch(() => {});

  const { accessToken, refreshToken } = await AuthService.issueTokens(user, req.headers['user-agent'], req.ip);
  res.cookie('refresh_token', refreshToken, COOKIE_OPTS);

  return R.created(res, 'Registered successfully', { user: user.toPublic(), accessToken });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await UserRepository.findByEmail(email);
  if (!user) return R.unauthorized(res, 'Invalid credentials');
  if (user.status !== 'active') return R.unauthorized(res, 'Account is inactive or banned');

  const isValid = await user.comparePassword(password);
  if (!isValid) return R.unauthorized(res, 'Invalid credentials');

  const { accessToken, refreshToken } = await AuthService.issueTokens(user, req.headers['user-agent'], req.ip);
  res.cookie('refresh_token', refreshToken, COOKIE_OPTS);

  return R.success(res, 'Login successful', { user: user.toPublic(), accessToken });
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return R.unauthorized(res, 'Refresh token missing');

  const { accessToken, refreshToken } = await AuthService.rotateRefreshToken(token, req.headers['user-agent'], req.ip);
  res.cookie('refresh_token', refreshToken, COOKIE_OPTS);

  return R.success(res, 'Token refreshed', { accessToken });
};

exports.logout = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) await AuthService.revokeRefreshToken(token).catch(() => {});
  res.clearCookie('refresh_token');
  return R.success(res, 'Logged out');
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  const hashedToken = hashToken(token);
  const user = await User.scope('withPassword').findOne({ where: { email_verify_token: hashedToken } });
  if (!user || user.email_verify_expires < new Date()) return R.error(res, 'Invalid or expired verification link');

  await user.update({ email_verified: true, email_verify_token: null, email_verify_expires: null });
  return R.success(res, 'Email verified successfully');
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await UserRepository.findByEmailPublic(email);

  if (user) {
    const token = generateToken();
    await user.update({ reset_password_token: hashToken(token), reset_password_expires: new Date(Date.now() + 60 * 60 * 1000) });
    await EmailService.sendPasswordReset(user, token).catch(() => {});
  }

  return R.success(res, 'If that email exists, a reset link has been sent');
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const hashedToken = hashToken(token);
  const user = await User.scope('withPassword').findOne({ where: { reset_password_token: hashedToken } });

  if (!user || user.reset_password_expires < new Date()) return R.error(res, 'Invalid or expired reset token');

  await user.update({ password, reset_password_token: null, reset_password_expires: null });
  await AuthService.revokeAllUserTokens(user.id);

  return R.success(res, 'Password reset successful');
};

exports.me = async (req, res) => {
  return R.success(res, 'Profile fetched', { user: req.user });
};
