const crypto = require('crypto');
const env = require('../../config/env');
const logger = require('../../utils/logger');

// HMAC-SHA256 verification for HDFC's return-URL redirect, per the real
// steps documented in "HMAC Signature Verification for Return URL":
//   1. Take every query param except `signature`/`signature_algorithm`.
//   2. Percent-encode each key and value.
//   3. Sort by encoded key, ASCII order.
//   4. Join as key=value pairs with `&`.
//   5. Percent-encode that whole joined string again.
//   6. HMAC-SHA256 it with the dashboard "Response Key".
//   7. Percent-encode the resulting hash; compare against the `signature`
//      param (itself percent-decoded once first).
//
// HONESTY NOTE: HDFC's own docs state "No sample code or concrete field
// examples are provided" for this mechanism — the digest encoding (hex vs
// base64) isn't specified anywhere reviewed for this project. This
// implementation uses hex (the more common default for HMAC-SHA256 in
// payment-gateway integrations), but this has NOT been verified against a
// real signed redirect. This is deliberately a defense-in-depth layer, not
// the primary verification — HdfcPaymentService.verify() always runs the
// MANDATORY server-to-server Order Status API call regardless of what this
// function returns. Verify this function against one real signed redirect
// (enable "Use signed response" in the dashboard first) before trusting it
// to reject anything on its own.

// RFC 3986 percent-encoding — encodeURIComponent alone doesn't escape
// !'()* the way strict percent-encoding does.
function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// queryParams: plain object of every query param from the return URL
// (already parsed — e.g. via `Object.fromEntries(new URLSearchParams(...))`).
function verifyReturnUrlSignature(queryParams) {
  const { signature, signature_algorithm, ...rest } = queryParams;

  if (!env.HDFC.RESPONSE_KEY) {
    // "Use signed response" isn't configured — this is expected until the
    // dashboard setting + Response Key are provisioned. Not a failure.
    return { verified: null, skipped: true, reason: 'HDFC_RESPONSE_KEY not configured' };
  }
  if (!signature) {
    return { verified: false, skipped: false, reason: 'No signature param on return URL' };
  }

  const sortedKeys = Object.keys(rest).sort();
  const pairs = sortedKeys.map((key) => `${percentEncode(key)}=${percentEncode(String(rest[key]))}`);
  const joined = pairs.join('&');
  const encodedOnceMore = percentEncode(joined);

  const hash = crypto.createHmac('sha256', env.HDFC.RESPONSE_KEY).update(encodedOnceMore).digest('hex');
  const encodedHash = percentEncode(hash);

  let decodedSignature;
  try {
    decodedSignature = decodeURIComponent(signature);
  } catch {
    decodedSignature = signature;
  }

  const verified = encodedHash === decodedSignature || hash === decodedSignature;
  if (!verified) {
    logger.error('HDFC return-URL signature mismatch — treating as unverified (Order Status API call still runs regardless)');
  }
  return { verified, skipped: false };
}

module.exports = { verifyReturnUrlSignature, percentEncode };
