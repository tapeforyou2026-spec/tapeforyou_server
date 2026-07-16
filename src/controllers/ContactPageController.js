const { ContactPage } = require('../models');
const R = require('../utils/response');

const DEFAULTS = {
  hero_label: 'Reach Out',
  hero_heading: 'Get in Touch',
  hero_description: "Have a question, need bulk pricing, or just want to say hello? We're here to help.",
  phone: '+91 99999 99999',
  email: 'hello@tapesforyou.in',
  address: 'Mumbai, Maharashtra, India',
  bulk_heading: 'Bulk Orders?',
  bulk_description: 'Get special business pricing and dedicated support.',
  bulk_email: 'bulk@tapesforyou.in',
};

// Singleton — there is always exactly one row, created on first access if
// the seeder hasn't run yet. Mirrors AboutPageController/OffersHeroController.
async function getOrCreate() {
  const [row] = await ContactPage.findOrCreate({ where: {}, defaults: DEFAULTS });
  return row;
}

exports.get = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'Contact page content', row);
};

exports.adminGet = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'Contact page content', row);
};

exports.adminUpdate = async (req, res) => {
  const row = await getOrCreate();
  await row.update(req.body);
  return R.success(res, 'Contact page updated', row);
};
