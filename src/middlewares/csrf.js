const R = require('../utils/response');

// Double-submit-cookie check for /auth/refresh — the one endpoint that
// authenticates purely via an httpOnly cookie (every other route requires a
// Bearer access token, which a cross-site page can't attach). The
// non-httpOnly csrf_token cookie is set alongside the refresh cookie
// (AuthController.setCsrfCookie) and must be echoed back as a header,
// which only same-origin JS can read.
module.exports = (req, res, next) => {
  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return R.forbidden(res, 'Invalid or missing CSRF token');
  }
  next();
};
