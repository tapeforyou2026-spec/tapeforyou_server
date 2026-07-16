const { User, Address, Order, OrderItem, Wishlist, ProductVariant, Product, ProductImage } = require('../models');
const UserRepository = require('../repositories/UserRepository');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

exports.getProfile = async (req, res) => R.success(res, 'Profile', { user: req.user });

exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const updates = {};
  if (name) updates.name = name.trim();
  if (phone) updates.phone = phone;
  if (req.file) updates.avatar = `/uploads/profiles/${req.file.filename}`;

  await User.update(updates, { where: { id: req.user.id } });
  const user = await UserRepository.findById(req.user.id);
  return R.success(res, 'Profile updated', { user });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.scope('withPassword').findByPk(req.user.id);

  const valid = await user.comparePassword(currentPassword);
  if (!valid) return R.error(res, 'Current password is incorrect');

  await user.update({ password: newPassword });
  return R.success(res, 'Password changed');
};

// Addresses
exports.getAddresses = async (req, res) => {
  const addresses = await Address.findAll({ where: { user_id: req.user.id }, order: [['is_default', 'DESC'], ['created_at', 'DESC']] });
  return R.success(res, 'Addresses', addresses);
};

exports.addAddress = async (req, res) => {
  if (req.body.is_default) await Address.update({ is_default: false }, { where: { user_id: req.user.id } });
  const address = await Address.create({ ...req.body, user_id: req.user.id });
  return R.created(res, 'Address added', address);
};

exports.updateAddress = async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!address) return R.notFound(res, 'Address not found');
  if (req.body.is_default) await Address.update({ is_default: false }, { where: { user_id: req.user.id } });
  await address.update(req.body);
  return R.success(res, 'Address updated', address);
};

exports.deleteAddress = async (req, res) => {
  const deleted = await Address.destroy({ where: { id: req.params.id, user_id: req.user.id } });
  if (!deleted) return R.notFound(res, 'Address not found');
  return R.success(res, 'Address deleted');
};

// Admin user management
exports.adminList = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await UserRepository.adminList({ search: req.query.q, limit, offset });
  return R.paginated(res, 'Users', rows, getPaginationMeta(count, page, limit));
};

// Powers the Customers list's "expand row" full detail view — full address
// book, actual wishlist products (not just a count), and full order history
// with line items. Each hasMany include uses `separate: true` so they run as
// independent queries instead of one giant join (which would multiply rows —
// e.g. 3 orders x 2 wishlist items = 6 duplicated user rows) and so each can
// carry its own ORDER BY/LIMIT.
exports.adminDetail = async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [
      { model: Address, as: 'addresses', separate: true, order: [['is_default', 'DESC'], ['created_at', 'ASC']] },
      {
        model: Wishlist,
        as: 'wishlist',
        separate: true,
        order: [['created_at', 'DESC']],
        include: [{
          model: ProductVariant,
          as: 'variant',
          include: [
            { model: Product, attributes: ['id', 'name', 'slug'] },
            { model: ProductImage, as: 'images', separate: true, limit: 1, order: [['is_primary', 'DESC'], ['sort_order', 'ASC']] },
          ],
        }],
      },
      {
        model: Order,
        as: 'orders',
        separate: true,
        order: [['created_at', 'DESC']],
        include: [{ model: OrderItem, as: 'items' }],
      },
    ],
  });
  if (!user) return R.notFound(res, 'User not found');
  return R.success(res, 'User details', user);
};

exports.adminUpdateStatus = async (req, res) => {
  await User.update({ status: req.body.status }, { where: { id: req.params.id } });
  return R.success(res, 'User status updated');
};

// Manual override for when a customer can't complete email verification
// themselves (email delivery issues, etc). Same permission level as
// adminUpdateStatus above — any admin, not just super admin.
exports.adminVerifyEmail = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return R.notFound(res, 'User not found');

  await user.update({ email_verified: true, email_verify_token: null, email_verify_expires: null });
  return R.success(res, 'User marked as verified');
};
