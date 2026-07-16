const { HeroSlide } = require('../models');
const R = require('../utils/response');

exports.list = async (req, res) => {
  const slides = await HeroSlide.findAll({
    where: { status: 'active' },
    order: [['sort_order', 'ASC'], ['id', 'ASC']],
  });
  return R.success(res, 'Hero slides', slides);
};

exports.adminList = async (req, res) => {
  const slides = await HeroSlide.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  return R.success(res, 'Hero slides', slides);
};

exports.adminCreate = async (req, res) => {
  const desktop_image = req.files?.desktop_image?.[0] ? `/uploads/hero/${req.files.desktop_image[0].filename}` : null;
  const mobile_image = req.files?.mobile_image?.[0] ? `/uploads/hero/${req.files.mobile_image[0].filename}` : null;

  const slide = await HeroSlide.create({ ...req.body, desktop_image, mobile_image });
  return R.created(res, 'Hero slide created', slide);
};

exports.adminUpdate = async (req, res) => {
  const slide = await HeroSlide.findByPk(req.params.id);
  if (!slide) return R.notFound(res, 'Hero slide not found');

  const updates = { ...req.body };
  if (req.files?.desktop_image?.[0]) updates.desktop_image = `/uploads/hero/${req.files.desktop_image[0].filename}`;
  if (req.files?.mobile_image?.[0]) updates.mobile_image = `/uploads/hero/${req.files.mobile_image[0].filename}`;

  await slide.update(updates);
  return R.success(res, 'Hero slide updated', slide);
};

exports.adminDelete = async (req, res) => {
  const deleted = await HeroSlide.destroy({ where: { id: req.params.id } });
  if (!deleted) return R.notFound(res, 'Hero slide not found');
  return R.success(res, 'Hero slide deleted');
};
