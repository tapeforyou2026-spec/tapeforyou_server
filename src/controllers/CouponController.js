const { Coupon } = require('../models');
const R = require('../utils/response');

exports.validate = async (req, res) => {
  const { code, order_amount } = req.body;
  const coupon = await Coupon.findOne({ where: { code: code.toUpperCase(), status: 'active' } });
  if (!coupon) return R.error(res, 'Invalid coupon code');

  const now = new Date();
  if (coupon.starts_at && now < coupon.starts_at) return R.error(res, 'Coupon not active yet');
  if (coupon.expires_at && now > coupon.expires_at) return R.error(res, 'Coupon expired');
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return R.error(res, 'Coupon usage limit reached');
  if (order_amount < parseFloat(coupon.min_order_amount)) return R.error(res, `Minimum order amount is ₹${coupon.min_order_amount}`);

  let discount = 0;
  if (coupon.type === 'flat') discount = Math.min(parseFloat(coupon.value), order_amount);
  else {
    discount = (order_amount * parseFloat(coupon.value)) / 100;
    if (coupon.max_discount) discount = Math.min(discount, parseFloat(coupon.max_discount));
  }

  return R.success(res, 'Coupon applied', { coupon, discount: parseFloat(discount.toFixed(2)) });
};

exports.adminList = async (req, res) => {
  const coupons = await Coupon.findAll({ order: [['created_at', 'DESC']] });
  return R.success(res, 'Coupons', coupons);
};

exports.adminCreate = async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  return R.created(res, 'Coupon created', coupon);
};

exports.adminUpdate = async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return R.notFound(res, 'Coupon not found');
  await coupon.update(req.body);
  return R.success(res, 'Coupon updated', coupon);
};

exports.adminDelete = async (req, res) => {
  const deleted = await Coupon.destroy({ where: { id: req.params.id } });
  if (!deleted) return R.notFound(res, 'Coupon not found');
  return R.success(res, 'Coupon deleted');
};
