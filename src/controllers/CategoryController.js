const { Category } = require('../models');
const { generateUniqueSlug } = require('../utils/slug');
const R = require('../utils/response');

exports.list = async (req, res) => {
  const categories = await Category.findAll({
    where: { status: 'active', parent_id: null },
    include: [{ model: Category, as: 'children', where: { status: 'active' }, required: false }],
    order: [['sort_order', 'ASC'], [{ model: Category, as: 'children' }, 'sort_order', 'ASC']],
  });
  return R.success(res, 'Categories fetched', categories);
};

exports.all = async (req, res) => {
  const categories = await Category.findAll({ order: [['sort_order', 'ASC'], ['name', 'ASC']] });
  return R.success(res, 'All categories', categories);
};

exports.create = async (req, res) => {
  const { name, description, parent_id, sort_order, status, seo_title, seo_description, seo_keywords } = req.body;
  const slug = await generateUniqueSlug(name, Category);
  const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

  const cat = await Category.create({ name, slug, description, parent_id: parent_id || null, sort_order: sort_order || 0, status: status || 'active', image, seo_title, seo_description, seo_keywords });
  return R.created(res, 'Category created', cat);
};

exports.update = async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return R.notFound(res);

  const updates = { ...req.body };
  if (req.file) updates.image = `/uploads/categories/${req.file.filename}`;
  if (updates.name && updates.name !== cat.name) {
    updates.slug = await generateUniqueSlug(updates.name, Category, 'slug', cat.id);
  }

  await cat.update(updates);
  return R.success(res, 'Category updated', cat);
};

exports.delete = async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return R.notFound(res);
  await cat.destroy();
  return R.success(res, 'Category deleted');
};
