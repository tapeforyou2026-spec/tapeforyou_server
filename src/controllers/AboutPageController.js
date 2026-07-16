const { AboutPage } = require('../models');
const R = require('../utils/response');

const DEFAULTS = {
  hero_label: 'Our Story',
  hero_heading: "We're Passionate About Quality Tapes",
  hero_button_text: 'Shop Our Products',
  hero_button_link: '/shop',
  vision_label: 'Who We Are',
  values_label: 'What We Stand For',
  values_heading: 'Our Values',
  stats: [],
  values: [],
};

// Singleton — there is always exactly one row (id doesn't matter to
// callers), created on first access if the seeder hasn't run yet.
async function getOrCreate() {
  const [row] = await AboutPage.findOrCreate({ where: {}, defaults: DEFAULTS });
  return row;
}

exports.get = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'About page content', row);
};

exports.adminGet = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'About page content', row);
};

exports.adminUpdate = async (req, res) => {
  const row = await getOrCreate();

  const updates = { ...req.body };
  // Multipart form-data only sends strings — stats/values arrive as
  // JSON-stringified text from the admin form's dynamic list fields.
  if (typeof updates.stats === 'string') {
    try { updates.stats = JSON.parse(updates.stats); } catch { delete updates.stats; }
  }
  if (typeof updates.values === 'string') {
    try { updates.values = JSON.parse(updates.values); } catch { delete updates.values; }
  }
  if (req.file) updates.hero_image = `/uploads/about/${req.file.filename}`;

  await row.update(updates);
  return R.success(res, 'About page updated', row);
};
