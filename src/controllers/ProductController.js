const ProductRepository = require('../repositories/ProductRepository');
const { Product, ProductVariant, ProductImage, B2BPricing, Category, Brand } = require('../models');
const { generateUniqueSlug } = require('../utils/slug');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

exports.list = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await ProductRepository.search(req.query, { limit, offset });
  return R.paginated(res, 'Products fetched', rows, getPaginationMeta(count, page, limit));
};

exports.show = async (req, res) => {
  const product = await ProductRepository.findBySlug(req.params.slug);
  if (!product) return R.notFound(res, 'Product not found');
  return R.success(res, 'Product fetched', product);
};

exports.create = async (req, res) => {
  const { name, category_id, brand_id, short_description, long_description, application, key_features, hsn_code, gst_percent, status, is_featured, seo_title, seo_description, seo_tags, notes, product_id } = req.body;

  const slug = await generateUniqueSlug(name, Product);
  const product = await Product.create({ product_id, name, slug, category_id, brand_id, short_description, long_description, application, key_features, hsn_code, gst_percent: gst_percent || 18, status: status || 'draft', is_featured: is_featured || false, seo_title, seo_description, seo_tags, notes });

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

  await product.update(updates);
  return R.success(res, 'Product updated', product);
};

exports.delete = async (req, res) => {
  const product = await ProductRepository.findById(req.params.id);
  if (!product) return R.notFound(res, 'Product not found');
  await product.destroy();
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
  await variant.update(req.body);
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
