const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Product, ProductVariant, ProductImage, Category, Brand, B2BPricing } = require('../models');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  async findWithVariants(id) {
    return Product.findByPk(id, {
      include: [
        { model: ProductVariant, as: 'variants', include: [{ model: ProductImage, as: 'images' }, { model: B2BPricing, as: 'b2b_pricing' }] },
        { model: ProductImage, as: 'images', where: { variant_id: null }, required: false },
        { model: Category },
        { model: Brand },
      ],
    });
  }

  async findBySlug(slug) {
    return Product.findOne({
      where: { slug },
      include: [
        { model: ProductVariant, as: 'variants', where: { status: 'active' }, required: false, include: [{ model: ProductImage, as: 'images' }, { model: B2BPricing, as: 'b2b_pricing' }] },
        { model: ProductImage, as: 'images', where: { variant_id: null }, required: false },
        { model: Category },
        { model: Brand },
      ],
    });
  }

  async search(filters, { limit, offset }) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.category_id) where.category_id = filters.category_id;
    if (filters.brand_id) where.brand_id = filters.brand_id;
    if (filters.is_featured !== undefined) where.is_featured = filters.is_featured;
    if (filters.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.q}%` } },
        { short_description: { [Op.iLike]: `%${filters.q}%` } },
        { seo_tags: { [Op.iLike]: `%${filters.q}%` } },
      ];
    }

    return Product.findAndCountAll({
      where,
      include: [
        { model: ProductVariant, as: 'variants', required: false, where: { status: 'active' }, include: [{ model: ProductImage, as: 'images', where: { is_primary: true }, required: false }] },
        { model: Category },
        { model: Brand },
      ],
      distinct: true,
      limit,
      offset,
      order: [['is_featured', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async updateStock(variantId, quantity, transaction) {
    return ProductVariant.increment({ stock_qty: quantity }, {
      where: { id: variantId },
      transaction,
    });
  }
}

module.exports = new ProductRepository();
