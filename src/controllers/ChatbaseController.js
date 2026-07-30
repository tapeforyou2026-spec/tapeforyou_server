const jwt = require('jsonwebtoken');
const env = require('../config/env');
const R = require('../utils/response');

// Signs a short-lived identity token so Chatbase can verify this request
// really came from this logged-in customer (per Chatbase's "identify" flow —
// without this, anyone could claim to be any user_id/email in the browser
// console). req.user is set by the `protect` middleware, so this is only
// ever called for a real authenticated customer.
exports.getIdentityToken = async (req, res) => {
  if (!env.CHATBASE_SECRET_KEY) return R.error(res, 'Chatbase is not configured', null, 503);

  const token = jwt.sign(
    { user_id: String(req.user.id), email: req.user.email },
    env.CHATBASE_SECRET_KEY,
    { expiresIn: '1h' }
  );

  return R.success(res, 'Chatbase identity token', { token });
};
