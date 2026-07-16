const AuthService = require('../services/AuthService');
const EmailService = require('../services/EmailService');
const OtpService = require('../services/OtpService');
const UserRepository = require('../repositories/UserRepository');
const { User, LoginHistory } = require('../models');
const { generateToken, hashToken } = require('../utils/crypto');
const { OTP_PURPOSE } = require('../constants');
const R = require('../utils/response');
const env = require('../config/env');
const crypto = require('crypto');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Double-submit-cookie CSRF check (middlewares/csrf.js) compares this cookie
// against an X-CSRF-Token header on state-changing requests that rely solely
// on the httpOnly refresh cookie for auth (just /auth/refresh — every other
// authenticated route requires a Bearer header, which a cross-site page
// can't attach, so CSRF isn't meaningfully possible there).
const setCsrfCookie = (res) => {
  res.cookie('csrf_token', crypto.randomBytes(24).toString('hex'), {
    httpOnly: false,
    secure: env.IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existingEmail = await UserRepository.findByEmail(email);
  if (existingEmail) return R.error(res, 'Email already registered', null, 409);

  const existingPhone = await UserRepository.findByPhone(phone);
  if (existingPhone) return R.error(res, 'Mobile number already registered', null, 409);

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
  await OtpService.send(user, OTP_PURPOSE.VERIFY_MOBILE).catch(() => {});

  // Verification is required before login (see AuthController.login), so
  // registration no longer issues tokens / logs the user in immediately.
  return R.created(res, 'Registration successful. Please check your email to verify your account before logging in.', {
    user: user.toPublic(),
  });
};

// Records every login attempt (success or failure) to login_history — used
// by AuthController below and never throws itself, so a logging failure
// can never break the actual login response.
const recordLoginAttempt = async ({ userId, identifier, req, success, failureReason }) => {
  await LoginHistory.create({
    user_id: userId || null,
    identifier,
    ip_address: req.ip,
    device_info: req.headers['user-agent'],
    success,
    failure_reason: failureReason || null,
  }).catch(() => {});
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  const user = await UserRepository.findByIdentifier(identifier);
  if (!user) {
    await recordLoginAttempt({ identifier, req, success: false, failureReason: 'No account found' });
    return R.unauthorized(res, 'Invalid credentials');
  }
  if (user.status !== 'active') {
    await recordLoginAttempt({ userId: user.id, identifier, req, success: false, failureReason: 'Account inactive or banned' });
    return R.unauthorized(res, 'Account is inactive or banned');
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await recordLoginAttempt({ userId: user.id, identifier, req, success: false, failureReason: 'Wrong password' });
    return R.unauthorized(res, 'Invalid credentials');
  }

  if (!user.email_verified) {
    await recordLoginAttempt({ userId: user.id, identifier, req, success: false, failureReason: 'Email not verified' });
    return R.error(res, 'Please verify your email before logging in', { code: 'EMAIL_NOT_VERIFIED' }, 403);
  }

  const { accessToken, refreshToken } = await AuthService.issueTokens(user, req.headers['user-agent'], req.ip);
  res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
  setCsrfCookie(res);
  await recordLoginAttempt({ userId: user.id, identifier, req, success: true });

  return R.success(res, 'Login successful', { user: user.toPublic(), accessToken });
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return R.unauthorized(res, 'Refresh token missing');

  const { accessToken, refreshToken } = await AuthService.rotateRefreshToken(token, req.headers['user-agent'], req.ip);
  res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
  setCsrfCookie(res);

  return R.success(res, 'Token refreshed', { accessToken });
};

exports.logout = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) {
    await AuthService.revokeRefreshToken(token).catch(() => {});
    try {
      const { id } = AuthService.verifyRefreshToken(token);
      const openSession = await LoginHistory.findOne({
        where: { user_id: id, success: true, logged_out_at: null },
        order: [['logged_in_at', 'DESC']],
      });
      if (openSession) await openSession.update({ logged_out_at: new Date() });
    } catch {
      /* token invalid/expired — nothing to reconcile */
    }
  }
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
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
    await user.update({ reset_password_token: hashToken(token), reset_password_expires: new Date(Date.now() + 30 * 60 * 1000) });
    await EmailService.sendPasswordReset(user, token).catch(() => {});
  }

  return R.success(res, 'If that email exists, a reset link has been sent');
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  const user = await UserRepository.findByEmailPublic(email);

  // Same response regardless of whether the account exists or is already
  // verified — avoids leaking which emails are registered (same approach
  // as forgotPassword above).
  if (user && !user.email_verified) {
    const verifyToken = generateToken();
    await user.update({
      email_verify_token: hashToken(verifyToken),
      email_verify_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await EmailService.sendEmailVerification(user, verifyToken).catch(() => {});
  }

  return R.success(res, 'If that account exists and is unverified, a verification email has been sent');
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

exports.sendOtp = async (req, res) => {
  const { phone, purpose } = req.body;
  const user = await UserRepository.findByPhone(phone);

  if (purpose === OTP_PURPOSE.RESET_PASSWORD) {
    // Same privacy pattern as forgotPassword — don't reveal whether the
    // number is registered.
    if (user) await OtpService.send(user, purpose);
    return R.success(res, 'If that mobile number is registered, an OTP has been sent');
  }

  // verify_mobile always follows registration, so the account existing
  // isn't sensitive the way it is for a password-reset lookup.
  if (!user) return R.notFound(res, 'No account found with that mobile number');
  if (user.mobile_verified) return R.error(res, 'Mobile number is already verified');
  await OtpService.send(user, purpose);
  return R.success(res, 'OTP sent to your mobile number');
};

exports.verifyOtp = async (req, res) => {
  const { phone, otp, purpose } = req.body;
  const user = await UserRepository.findByPhone(phone);
  if (!user) return R.error(res, 'Invalid OTP or mobile number');

  const valid = await OtpService.verify(user.id, otp, purpose);
  if (!valid) return R.error(res, 'Invalid or expired OTP');

  if (purpose === OTP_PURPOSE.VERIFY_MOBILE) {
    await user.update({ mobile_verified: true });
    return R.success(res, 'Mobile number verified successfully');
  }

  // purpose === RESET_PASSWORD — OTP is just an alternate way to prove
  // identity; hand back a normal reset token so the client finishes on the
  // exact same POST /auth/reset-password used by the email flow, rather
  // than a parallel reset pathway.
  const resetToken = generateToken();
  await user.update({
    reset_password_token: hashToken(resetToken),
    reset_password_expires: new Date(Date.now() + 30 * 60 * 1000),
  });
  return R.success(res, 'OTP verified', { resetToken });
};

exports.activeSessions = async (req, res) => {
  const sessions = await AuthService.listActiveSessions(req.user.id);
  return R.success(res, 'Active sessions', sessions);
};

exports.deleteSession = async (req, res) => {
  const revoked = await AuthService.revokeSessionById(req.user.id, req.params.id);
  if (!revoked) return R.notFound(res, 'Session not found');
  return R.success(res, 'Session logged out');
};

exports.logoutAll = async (req, res) => {
  await AuthService.revokeAllUserTokens(req.user.id);
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  return R.success(res, 'Logged out from all devices');
};

exports.me = async (req, res) => {
  return R.success(res, 'Profile fetched', { user: req.user });
};
