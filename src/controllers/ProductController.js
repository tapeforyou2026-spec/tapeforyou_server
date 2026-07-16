const ProductRepository = require('../repositories/ProductRepository');
const { Product, ProductVariant, ProductImage, B2BPricing, Category, Brand } = require('../models');
const { generateUniqueSlug } = require('../utils/slug');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
const R = require('../utils/response');

exports.list = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await ProductRepository.search(req.query, { limit, offset });
  return R.paginated(res, 'Products fetched', rows, getPaginationMeta(count, page, limit));
};

exports.show = async (req, res) => {
  const product = await ProductRepository.findBySlug(req.params.slug);
  if (!product) return R.notFound(res, 'Product not found');

  // Fire-and-forget: every real visit to a product's detail page goes
  // through this exact lookup (customer frontend's `/product/[slug]`), so
  // this is the one place that needs to change to get real "Most Viewed
  // Product" data — no separate pageview-tracking endpoint or frontend
  // change needed. Never awaited so a slow/failed increment can't delay or
  // break the page the customer is actually waiting on.
  Product.increment('view_count', { where: { id: product.id } }).catch(() => {});

  return R.success(res, 'Product fetched', product);
};

// Admin: fetch by numeric ID (not slug) — includes variants of any status
// (draft/inactive products included), unlike the public slug-based lookup.
exports.getById = async (req, res) => {
  const product = await ProductRepository.findWithVariants(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');
  return R.success(res, 'Product fetched', product);
};

exports.create = async (req, res) => {
  const { name, category_id, brand_id, short_description, long_description, application, key_features, hsn_code, gst_percent, status, is_featured, seo_title, seo_description, seo_tags, notes, product_id } = req.body;

  const slug = await generateUniqueSlug(name, Product);
  const product = await Product.create({ product_id, name, slug, category_id, brand_id, short_description, long_description, application, key_features, hsn_code, gst_percent: gst_percent || 18, status: status || 'draft', is_featured: is_featured || false, seo_title, seo_description, seo_tags, notes });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_CREATED,
    description: `${req.admin.name} created product "${product.name}"`,
    recordId: product.id,
    newValues: { name: product.name, category_id: product.category_id, status: product.status },
  });

  return R.created(res, 'Product created', product);
};

exports.update = async (req, res) => {
  const product = await ProductRepository.findById(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');

  const { name, ...rest } = req.body;
  const updates = { ...rest };
  if (name && name !== product.name) {
    updates.name = name;
    updates.slug = await generateUniqueSlug(name, Product, 'slug', product.id);
  }

  // Only the fields actually being changed, captured before the write, so
  // the log's old/new values reflect what really changed rather than the
  // whole row.
  const oldValues = {};
  Object.keys(updates).forEach((k) => { oldValues[k] = product[k]; });
  const previousStatus = product.status;

  await product.update(updates);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_UPDATED,
    description: `${req.admin.name} updated product "${product.name}"`,
    recordId: product.id, oldValues, newValues: updates,
  });

  if (updates.status && updates.status !== previousStatus) {
    if (updates.status === 'active') {
      ActivityLogService.log({
        req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_PUBLISHED,
        description: `${req.admin.name} published product "${product.name}"`,
        recordId: product.id, oldValues: { status: previousStatus }, newValues: { status: updates.status },
      });
    } else if (previousStatus === 'active') {
      ActivityLogService.log({
        req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_HIDDEN,
        description: `${req.admin.name} hid product "${product.name}"`,
        recordId: product.id, oldValues: { status: previousStatus }, newValues: { status: updates.status },
      });
    }
  }

  return R.success(res, 'Product updated', product);
};

exports.delete = async (req, res) => {
  // findWithVariants (not the plain findById used above) since the delete
  // snapshot needs to remain useful on its own forever — SKU/price/stock
  // per variant, not just the bare product row.
  const product = await ProductRepository.findWithVariants(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');

  const snapshot = product.toJSON();
  await product.destroy();

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_DELETED,
    description: `${req.admin.name} deleted product "${snapshot.name}"`,
    recordId: snapshot.id, snapshot,
  });

  return R.success(res, 'Product deleted');
};

exports.addVariant = async (req, res) => {
  const product = await ProductRepository.findById(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');
  const variant = await ProductVariant.create({ ...req.body, product_id: product.id });
  return R.created(res, 'Variant added', variant);
};

exports.updateVariant = async (req, res) => {
  const variant = await ProductVariant.findByPk(req.params.variantId);
  if (!variant) return R.notFound(res, 'Variant not found');

  const before = { stock_qty: variant.stock_qty, mrp: variant.mrp, selling_price: variant.selling_price };
  await variant.update(req.body);

  const product = await variant.getProduct();
  const stockChanged = req.body.stock_qty !== undefined && String(before.stock_qty) !== String(variant.stock_qty);
  const priceChanged = (req.body.mrp !== undefined && String(before.mrp) !== String(variant.mrp))
    || (req.body.selling_price !== undefined && String(before.selling_price) !== String(variant.selling_price));

  if (stockChanged) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_STOCK_UPDATED,
      description: `${req.admin.name} updated stock for ${variant.sku} (${product?.name || 'product'}): ${before.stock_qty} → ${variant.stock_qty}`,
      recordId: variant.product_id,
      oldValues: { stock_qty: before.stock_qty }, newValues: { stock_qty: variant.stock_qty },
    });
  }
  if (priceChanged) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.PRODUCTS, action: ACTIVITY_ACTIONS.PRODUCT_PRICE_UPDATED,
      description: `${req.admin.name} updated pricing for ${variant.sku} (${product?.name || 'product'})`,
      recordId: variant.product_id,
      oldValues: { mrp: before.mrp, selling_price: before.selling_price },
      newValues: { mrp: variant.mrp, selling_price: variant.selling_price },
    });
  }

  return R.success(res, 'Variant updated', variant);
};

exports.deleteVariant = async (req, res) => {
  const variant = await ProductVariant.findByPk(req.params.variantId);
  if (!variant) return R.notFound(res, 'Variant not found');
  await variant.destroy();
  return R.success(res, 'Variant deleted');
};

exports.uploadImages = async (req, res) => {
  const product = await ProductRepository.findById(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');

  if (!req.files || !req.files.length) return R.error(res, 'No images uploaded');

  const images = await Promise.all(req.files.map((f, i) =>
    ProductImage.create({
      product_id: product.id,
      url: `/uploads/products/${f.filename}`,
      alt: `${product.name} image ${i + 1}`,
      is_primary: i === 0,
      sort_order: i,
    })
  ));

  return R.created(res, 'Images uploaded', images);
};

exports.addImageLink = async (req, res) => {
  const product = await ProductRepository.findById(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');

  const { url } = req.body;
  if (!url || !/^https?:\/\//i.test(url)) {
    return R.error(res, 'A valid image URL (starting with http:// or https://) is required');
  }

  const existingCount = await ProductImage.count({ where: { product_id: product.id, variant_id: null } });
  const image = await ProductImage.create({
    product_id: product.id,
    url,
    alt: `${product.name} image`,
    is_primary: existingCount === 0,
    sort_order: existingCount,
  });

  return R.created(res, 'Image added', image);
};

exports.deleteImage = async (req, res) => {
  const image = await ProductImage.findByPk(req.params.imageId);
  if (!image) return R.notFound(res, 'Image not found');
  await image.destroy();
  return R.success(res, 'Image deleted');
};

exports.featured = async (req, res) => {
  const { rows } = await ProductRepository.search({ is_featured: true, status: 'active' }, { limit: 12, offset: 0 });
  return R.success(res, 'Featured products', rows);
};

exports.updateB2BPricing = async (req, res) => {
  const { variantId } = req.params;
  const { tiers } = req.body;

  await B2BPricing.destroy({ where: { variant_id: variantId } });
  const created = await B2BPricing.bulkCreate(tiers.map(t => ({ ...t, variant_id: variantId })));

  return R.success(res, 'B2B pricing updated', created);
};
