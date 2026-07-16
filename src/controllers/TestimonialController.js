const { Testimonial } = require('../models');
const R = require('../utils/response');

exports.list = async (req, res) => {
  const testimonials = await Testimonial.findAll({
    where: { status: 'active' },
    order: [['sort_order', 'ASC'], ['id', 'ASC']],
  });
  return R.success(res, 'Testimonials', testimonials);
};

exports.adminList = async (req, res) => {
  const testimonials = await Testimonial.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  return R.success(res, 'Testimonials', testimonials);
};

exports.adminCreate = async (req, res) => {
  const updates = { ...req.body };
  if (req.file) updates.avatar = `/uploads/testimonials/${req.file.filename}`;

  const testimonial = await Testimonial.create(updates);
  return R.created(res, 'Testimonial created', testimonial);
};

exports.adminUpdate = async (req, res) => {
  const testimonial = await Testimonial.findByPk(req.params.id);
  if (!testimonial) return R.notFound(res, 'Testimonial not found');

  const updates = { ...req.body };
  if (req.file) updates.avatar = `/uploads/testimonials/${req.file.filename}`;

  await testimonial.update(updates);
  return R.success(res, 'Testimonial updated', testimonial);
};

exports.adminDelete = async (req, res) => {
  const deleted = await Testimonial.destroy({ where: { id: req.params.id } });
  if (!deleted) return R.notFound(res, 'Testimonial not found');
  return R.success(res, 'Testimonial deleted');
};
