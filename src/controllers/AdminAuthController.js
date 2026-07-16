const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const env = require('../config/env');
const R = require('../utils/response');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');

const COOKIE_OPTS = { httpOnly: true, secure: env.IS_PRODUCTION, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 };

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.scope('withPassword').findOne({ where: { email: email.toLowerCase() } });

  if (!admin) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.AUTH, action: ACTIVITY_ACTIONS.FAILED_LOGIN,
      description: `Failed login attempt for ${email} (no such account)`, status: 'failed',
      actor: { email },
    });
    return R.unauthorized(res, 'Invalid credentials');
  }
  if (admin.status !== 'active') {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.AUTH, action: ACTIVITY_ACTIONS.FAILED_LOGIN,
      description: `Failed login attempt for ${email} (account inactive)`, status: 'failed',
      actor: { id: admin.id, name: admin.name, email: admin.email },
    });
    return R.unauthorized(res, 'Account is inactive');
  }

  const isValid = await admin.comparePassword(password);
  if (!isValid) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.AUTH, action: ACTIVITY_ACTIONS.FAILED_LOGIN,
      description: `Failed login attempt for ${email} (wrong password)`, status: 'failed',
      actor: { id: admin.id, name: admin.name, email: admin.email },
    });
    return R.unauthorized(res, 'Invalid credentials');
  }

  const payload = { id: admin.id, uuid: admin.uuid, email: admin.email, type: 'admin', is_super_admin: admin.is_super_admin };
  const token = jwt.sign(payload, env.JWT.SECRET, { expiresIn: '8h' });

  await Admin.update({ last_login: new Date() }, { where: { id: admin.id } });
  res.cookie('admin_token', token, COOKIE_OPTS);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.AUTH, action: ACTIVITY_ACTIONS.LOGIN,
    description: `${admin.name} logged in`,
    actor: { id: admin.id, name: admin.name, email: admin.email, is_super_admin: admin.is_super_admin },
  });

  return R.success(res, 'Login successful', {
    admin: { id: admin.id, name: admin.name, email: admin.email, avatar: admin.avatar, is_super_admin: admin.is_super_admin },
    token,
  });
};

exports.logout = async (req, res) => {
  res.clearCookie('admin_token');
  if (req.admin) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.AUTH, action: ACTIVITY_ACTIONS.LOGOUT,
      description: `${req.admin.name} logged out`,
    });
  }
  return R.success(res, 'Logged out');
};

exports.me = async (req, res) => R.success(res, 'Admin profile', { admin: req.admin });

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.scope('withPassword').findByPk(req.admin.id);
  const valid = await admin.comparePassword(currentPassword);
  if (!valid) return R.error(res, 'Current password is incorrect');
  await admin.update({ password: newPassword });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.AUTH, action: ACTIVITY_ACTIONS.PASSWORD_CHANGED,
    description: `${req.admin.name} changed their own password`,
  });

  return R.success(res, 'Password changed');
};
