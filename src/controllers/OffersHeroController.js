const { OffersHero } = require('../models');
const R = require('../utils/response');

const DEFAULTS = {
  badge_text: 'Limited Time Deals',
  heading_line1: 'Save Big on',
  heading_line2: 'Premium Tapes',
};

async function getOrCreate() {
  const [row] = await OffersHero.findOrCreate({ where: {}, defaults: DEFAULTS });
  return row;
}

exports.get = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'Offers hero content', row);
};

exports.adminGet = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'Offers hero content', row);
};

exports.adminUpdate = async (req, res) => {
  const row = await getOrCreate();

  const updates = { ...req.body };
  if (req.files?.desktop_image?.[0]) updates.desktop_image = `/uploads/offers/${req.files.desktop_image[0].filename}`;
  if (req.files?.mobile_image?.[0]) updates.mobile_image = `/uploads/offers/${req.files.mobile_image[0].filename}`;

  await row.update(updates);
  return R.success(res, 'Offers hero updated', row);
};
