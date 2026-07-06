const { Cart, CartItem, ProductVariant, ProductImage, Product } = require('../models');
const R = require('../utils/response');

const getOrCreateCart = async (userId, sessionId) => {
  if (userId) {
    const [cart] = await Cart.findOrCreate({ where: { user_id: userId }, defaults: { user_id: userId } });
    return cart;
  }
  const [cart] = await Cart.findOrCreate({ where: { session_id: sessionId }, defaults: { session_id: sessionId } });
  return cart;
};

exports.getCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user?.id, req.sessionId);
  const items = await CartItem.findAll({
    where: { cart_id: cart.id },
    include: [{
      model: ProductVariant, as: 'variant',
      include: [{ model: Product }, { model: ProductImage, as: 'images', where: { is_primary: true }, required: false }],
    }],
  });
  return R.success(res, 'Cart fetched', { cart, items });
};

exports.addItem = async (req, res) => {
  const { variant_id, quantity = 1 } = req.body;
  const cart = await getOrCreateCart(req.user?.id, req.sessionId);

  const variant = await ProductVariant.findByPk(variant_id);
  if (!variant || variant.status !== 'active') return R.error(res, 'Product not available');
  if (variant.stock_qty < quantity) return R.error(res, 'Insufficient stock');

  const [item, created] = await CartItem.findOrCreate({
    where: { cart_id: cart.id, variant_id },
    defaults: { cart_id: cart.id, variant_id, quantity },
  });

  if (!created) await item.update({ quantity: item.quantity + quantity });

  return R.success(res, created ? 'Item added to cart' : 'Cart updated', item);
};

exports.updateItem = async (req, res) => {
  const cart = await getOrCreateCart(req.user?.id, req.sessionId);
  const item = await CartItem.findOne({ where: { id: req.params.itemId, cart_id: cart.id } });
  if (!item) return R.notFound(res, 'Cart item not found');

  const { quantity } = req.body;
  if (quantity <= 0) {
    await item.destroy();
    return R.success(res, 'Item removed from cart');
  }

  await item.update({ quantity });
  return R.success(res, 'Cart updated', item);
};

exports.removeItem = async (req, res) => {
  const cart = await getOrCreateCart(req.user?.id, req.sessionId);
  const deleted = await CartItem.destroy({ where: { id: req.params.itemId, cart_id: cart.id } });
  if (!deleted) return R.notFound(res, 'Cart item not found');
  return R.success(res, 'Item removed');
};

exports.clearCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user?.id, req.sessionId);
  await CartItem.destroy({ where: { cart_id: cart.id } });
  return R.success(res, 'Cart cleared');
};

exports.mergeCart = async (req, res) => {
  const { session_id } = req.body;
  if (!session_id || !req.user) return R.error(res, 'Invalid request');

  const guestCart = await Cart.findOne({ where: { session_id } });
  if (!guestCart) return R.success(res, 'Nothing to merge');

  const [userCart] = await Cart.findOrCreate({ where: { user_id: req.user.id }, defaults: { user_id: req.user.id } });
  const guestItems = await CartItem.findAll({ where: { cart_id: guestCart.id } });

  for (const gi of guestItems) {
    const [ui, created] = await CartItem.findOrCreate({
      where: { cart_id: userCart.id, variant_id: gi.variant_id },
      defaults: { cart_id: userCart.id, variant_id: gi.variant_id, quantity: gi.quantity },
    });
    if (!created) await ui.update({ quantity: ui.quantity + gi.quantity });
  }

  await guestCart.destroy();
  return R.success(res, 'Cart merged');
};
