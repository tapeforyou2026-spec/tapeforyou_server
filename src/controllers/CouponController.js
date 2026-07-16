const { Coupon, Order } = require('../models');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
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

  // per_user_limit has existed on the model since day one but was never
  // actually enforced anywhere — only the total usage_limit was checked.
  // A logged-in user (this route requires `protect`) could reuse a
  // "one per customer" coupon indefinitely. Counts their own past orders
  // placed with this coupon rather than a separate usage-log table, since
  // Order.coupon_id already records exactly that.
  const userUsage = await Order.count({ where: { coupon_id: coupon.id, user_id: req.user.id } });
  if (coupon.per_user_limit && userUsage >= coupon.per_user_limit) {
    return R.error(res, 'You have already used this coupon the maximum number of times');
  }

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
  const existing = await Coupon.findOne({ where: { code: req.body.code.toUpperCase() } });
  if (existing) return R.error(res, `Coupon code "${req.body.code.toUpperCase()}" already exists`);

  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.COUPONS, action: ACTIVITY_ACTIONS.COUPON_CREATED,
    description: `${req.admin.name} created coupon "${coupon.code}"`,
    recordId: coupon.id, newValues: { code: coupon.code, type: coupon.type, value: coupon.value },
  });

  return R.created(res, 'Coupon created', coupon);
};

exports.adminUpdate = async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return R.notFound(res, 'Coupon not found');

  const updates = { ...req.body };
  if (updates.code) updates.code = updates.code.toUpperCase();

  const oldValues = {};
  Object.keys(updates).forEach((k) => { oldValues[k] = coupon[k]; });

  await coupon.update(updates);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.COUPONS, action: ACTIVITY_ACTIONS.COUPON_UPDATED,
    description: `${req.admin.name} updated coupon "${coupon.code}"`,
    recordId: coupon.id, oldValues, newValues: updates,
  });

  return R.success(res, 'Coupon updated', coupon);
};

exports.adminDelete = async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return R.notFound(res, 'Coupon not found');

  const snapshot = coupon.toJSON();
  await coupon.destroy();

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.COUPONS, action: ACTIVITY_ACTIONS.COUPON_DELETED,
    description: `${req.admin.name} deleted coupon "${snapshot.code}"`,
    recordId: snapshot.id, snapshot,
  });

  return R.success(res, 'Coupon deleted');
};
