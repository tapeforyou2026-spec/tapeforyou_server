const { Wishlist, ProductVariant, Product, ProductImage, sequelize } = require('../models');
const R = require('../utils/response');

exports.getWishlist = async (req, res) => {
  const items = await Wishlist.findAll({
    where: { user_id: req.user.id },
    include: [{
      model: ProductVariant, as: 'variant',
      include: [{ model: Product }, { model: ProductImage, as: 'images', where: { is_primary: true }, required: false }],
    }],
    order: [['created_at', 'DESC']],
  });
  return R.success(res, 'Wishlist fetched', items);
};

exports.toggle = async (req, res) => {
  const { variant_id } = req.body;
  const existing = await Wishlist.findOne({ where: { user_id: req.user.id, variant_id } });

  if (existing) {
    await existing.destroy();
    return R.success(res, 'Removed from wishlist');
  }

  const variant = await ProductVariant.findByPk(variant_id);
  if (!variant) return R.notFound(res, 'Product not found');

  const item = await Wishlist.create({ user_id: req.user.id, variant_id });
  return R.created(res, 'Added to wishlist', item);
};

exports.moveToCart = async (req, res) => {
  const { variant_id } = req.body;
  const { Cart, CartItem } = require('../models');

  const [cart] = await Cart.findOrCreate({ where: { user_id: req.user.id }, defaults: { user_id: req.user.id } });
  const [item, created] = await CartItem.findOrCreate({
    where: { cart_id: cart.id, variant_id },
    defaults: { cart_id: cart.id, variant_id, quantity: 1 },
  });
  if (!created) await item.update({ quantity: item.quantity + 1 });

  await Wishlist.destroy({ where: { user_id: req.user.id, variant_id } });
  return R.success(res, 'Moved to cart');
};

// Admin — aggregated across every customer's wishlist. Wishlist rows are
// per-variant (a customer wishlists a specific SKU), rolled up to the
// product level here since "most wishlisted products" is asked per-product,
// not per-variant. `customers` is a json_agg of every customer who
// wishlisted any variant of the product (name/email/phone/when), so the
// admin UI can show exactly who without a second per-row request.
//
// `total_stock` is computed via a separate subquery rather than
// SUM(pv.stock_qty) in the main GROUP BY — the main query fans out one row
// per wishlist entry (per customer), so summing stock directly there would
// multiply a variant's stock by however many customers wishlisted it.
exports.adminMostWishlisted = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      p.id,
      p.name as product_name,
      c.name as category,
      COUNT(w.id) as wishlist_count,
      MIN(pv.selling_price) as min_price,
      MAX(pv.selling_price) as max_price,
      COALESCE(stock.total_stock, 0) as total_stock,
      json_agg(
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone, 'added_at', w.created_at)
        ORDER BY w.created_at DESC
      ) as customers
    FROM wishlists w
    JOIN product_variants pv ON pv.id = w.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN users u ON u.id = w.user_id
    LEFT JOIN (
      SELECT product_id, SUM(stock_qty) as total_stock FROM product_variants GROUP BY product_id
    ) stock ON stock.product_id = p.id
    GROUP BY p.id, c.name, stock.total_stock
    ORDER BY wishlist_count DESC
    LIMIT 50
  `);
  return R.success(res, 'Most wishlisted products', rows);
};
