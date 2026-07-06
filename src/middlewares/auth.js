const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User, Admin } = require('../models');
const R = require('../utils/response');

exports.protect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token && req.cookies?.access_token) token = req.cookies.access_token;
  if (!token) return R.unauthorized(res);

  try {
    const decoded = jwt.verify(token, env.JWT.SECRET);
    if (decoded.type !== 'user') return R.unauthorized(res);

    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== 'active') return R.unauthorized(res, 'Account inactive');

    req.user = user;
    next();
  } catch {
    return R.unauthorized(res, 'Invalid or expired token');
  }
};

exports.adminProtect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token && req.cookies?.admin_token) token = req.cookies.admin_token;
  if (!token) return R.unauthorized(res);

  try {
    const decoded = jwt.verify(token, env.JWT.SECRET);
    if (decoded.type !== 'admin') return R.unauthorized(res);

    const admin = await Admin.findByPk(decoded.id);
    if (!admin || admin.status !== 'active') return R.unauthorized(res, 'Admin account inactive');

    req.admin = admin;
    next();
  } catch {
    return R.unauthorized(res, 'Invalid or expired admin token');
  }
};

exports.superAdmin = (req, res, next) => {
  if (!req.admin?.is_super_admin) return R.forbidden(res, 'Super admin access required');
  next();
};

exports.optionalAuth = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT.SECRET);
      if (decoded.type === 'user') {
        req.user = await User.findByPk(decoded.id);
      }
    } catch {}
  }
  next();
};
