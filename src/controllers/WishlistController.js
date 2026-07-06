const { Wishlist, ProductVariant, Product, ProductImage } = require('../models');
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
