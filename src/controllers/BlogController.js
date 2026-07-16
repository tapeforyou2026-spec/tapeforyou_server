const { Blog } = require('../models');
const R = require('../utils/response');
const { generateUniqueSlug } = require('../utils/slug');

const parseJsonField = (updates, field) => {
  if (typeof updates[field] === 'string') {
    try { updates[field] = JSON.parse(updates[field]); } catch { delete updates[field]; }
  }
};

exports.list = async (req, res) => {
  const blogs = await Blog.findAll({
    where: { status: 'published' },
    order: [['published_date', 'DESC'], ['id', 'DESC']],
  });
  return R.success(res, 'Blogs', blogs);
};

exports.getBySlug = async (req, res) => {
  const blog = await Blog.findOne({ where: { slug: req.params.slug, status: 'published' } });
  if (!blog) return R.notFound(res, 'Blog not found');
  return R.success(res, 'Blog', blog);
};

exports.adminList = async (req, res) => {
  const blogs = await Blog.findAll({ order: [['published_date', 'DESC'], ['id', 'DESC']] });
  return R.success(res, 'Blogs', blogs);
};

exports.adminGet = async (req, res) => {
  const blog = await Blog.findByPk(req.params.id);
  if (!blog) return R.notFound(res, 'Blog not found');
  return R.success(res, 'Blog', blog);
};

exports.adminCreate = async (req, res) => {
  const updates = { ...req.body };
  parseJsonField(updates, 'tags');
  parseJsonField(updates, 'seo_keywords');
  if (req.file) updates.image = `/uploads/blog/${req.file.filename}`;
  updates.slug = await generateUniqueSlug(updates.title, Blog);

  const blog = await Blog.create(updates);
  return R.created(res, 'Blog created', blog);
};

exports.adminUpdate = async (req, res) => {
  const blog = await Blog.findByPk(req.params.id);
  if (!blog) return R.notFound(res, 'Blog not found');

  const updates = { ...req.body };
  parseJsonField(updates, 'tags');
  parseJsonField(updates, 'seo_keywords');
  if (req.file) updates.image = `/uploads/blog/${req.file.filename}`;
  if (updates.title && updates.title !== blog.title) {
    updates.slug = await generateUniqueSlug(updates.title, Blog, 'slug', blog.id);
  }

  await blog.update(updates);
  return R.success(res, 'Blog updated', blog);
};

exports.adminDelete = async (req, res) => {
  const deleted = await Blog.destroy({ where: { id: req.params.id } });
  if (!deleted) return R.notFound(res, 'Blog not found');
  return R.success(res, 'Blog deleted');
};
