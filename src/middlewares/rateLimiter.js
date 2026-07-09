const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// GET reads on /products and /categories are hit hard by Next.js static
// generation (generateStaticParams/generateMetadata across every product
// and category page) plus normal storefront browsing — keep them off the
// strict general limiter via publicCatalog below. Writes to these routes
// (admin create/update/delete) still go through the strict general limit.
const isPublicCatalogRead = (req) =>
  req.method === 'GET' && /^\/api\/v1\/(products|categories)(\/|$|\?)/.test(req.originalUrl);

exports.general = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS,
  max: env.RATE_LIMIT.MAX,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isPublicCatalogRead,
});

exports.publicCatalog = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS,
  max: 2000,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'GET',
});

exports.auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
});

exports.strict = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many requests for this action' },
});
