const { Category } = require('../models');
const { generateUniqueSlug } = require('../utils/slug');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
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
  const { name, description, parent_id, sort_order, status, seo_title, seo_description, seo_keywords, image_url } = req.body;
  const slug = await generateUniqueSlug(name, Category);
  // An uploaded file always wins over a CDN link if both are somehow provided.
  const image = req.file ? `/uploads/categories/${req.file.filename}` : (image_url || null);

  const cat = await Category.create({ name, slug, description, parent_id: parent_id || null, sort_order: sort_order || 0, status: status || 'active', image, seo_title, seo_description, seo_keywords });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.CATEGORIES, action: ACTIVITY_ACTIONS.CATEGORY_CREATED,
    description: `${req.admin.name} created category "${cat.name}"`,
    recordId: cat.id, newValues: { name: cat.name, parent_id: cat.parent_id, status: cat.status },
  });

  return R.created(res, 'Category created', cat);
};

exports.update = async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return R.notFound(res);

  const updates = { ...req.body };
  delete updates.image_url;
  if (updates.parent_id !== undefined) updates.parent_id = updates.parent_id || null;
  if (req.file) updates.image = `/uploads/categories/${req.file.filename}`;
  else if (req.body.image_url) updates.image = req.body.image_url;
  if (updates.name && updates.name !== cat.name) {
    updates.slug = await generateUniqueSlug(updates.name, Category, 'slug', cat.id);
  }

  const oldValues = {};
  Object.keys(updates).forEach((k) => { oldValues[k] = cat[k]; });

  await cat.update(updates);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.CATEGORIES, action: ACTIVITY_ACTIONS.CATEGORY_UPDATED,
    description: `${req.admin.name} updated category "${cat.name}"`,
    recordId: cat.id, oldValues, newValues: updates,
  });

  return R.success(res, 'Category updated', cat);
};

exports.delete = async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return R.notFound(res);

  const snapshot = cat.toJSON();
  await cat.destroy();

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.CATEGORIES, action: ACTIVITY_ACTIONS.CATEGORY_DELETED,
    description: `${req.admin.name} deleted category "${snapshot.name}"`,
    recordId: snapshot.id, snapshot,
  });

  return R.success(res, 'Category deleted');
};
