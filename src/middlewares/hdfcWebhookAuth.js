const env = require('../config/env');
const R = require('../utils/response');
const logger = require('../utils/logger');

// Basic HTTP Authentication — confirmed real HDFC webhook security
// mechanism (not a cryptographic signature; see
// HDFC-SmartGateway-Documentation-Verification.md). Compares the inbound
// Authorization header against the username/password configured in HDFC's
// own dashboard (Payments -> Settings -> Webhook Tab), stored here as
// HDFC_WEBHOOK_USERNAME/PASSWORD — a separate pair from HDFC_API_KEY, which
// is only used for outbound calls this app makes to HDFC.
module.exports = (req, res, next) => {
  if (!env.HDFC.WEBHOOK_USERNAME || !env.HDFC.WEBHOOK_PASSWORD) {
    logger.error('HDFC webhook received but HDFC_WEBHOOK_USERNAME/PASSWORD are not configured — rejecting');
    return R.unauthorized(res, 'Webhook not configured');
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return R.unauthorized(res, 'Missing Basic Authorization header');

  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return R.unauthorized(res, 'Malformed Authorization header');
  }

  const separatorIndex = decoded.indexOf(':');
  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (username !== env.HDFC.WEBHOOK_USERNAME || password !== env.HDFC.WEBHOOK_PASSWORD) {
    return R.unauthorized(res, 'Invalid webhook credentials');
  }

  next();
};
