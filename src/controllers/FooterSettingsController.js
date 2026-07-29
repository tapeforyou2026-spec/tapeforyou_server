const { FooterSettings } = require('../models');
const R = require('../utils/response');

const DEFAULTS = {
  tagline: 'Premium quality adhesive tapes for every need — trusted across India.',
  phone: '+91 81497 60064',
  email: 'hello@tapesforyou.in',
  address_line1: 'Gat No. 193, Trimbak Road,',
  address_line2: 'Belgaon Dhaga Shivar,',
  address_line3: 'Pimpalgaon Bahula, Anjaneri,',
  address_line4: 'Nashik, Maharashtra – 422213',
  instagram_url: '#',
  facebook_url: '#',
  twitter_url: '#',
  youtube_url: '#',
  linkedin_url: '#',
  copyright_text: 'Tapes For You. All rights reserved.',
};

// Singleton — there is always exactly one row (id doesn't matter to
// callers), created on first access if the migration's seed row is missing.
async function getOrCreate() {
  const [row] = await FooterSettings.findOrCreate({ where: {}, defaults: DEFAULTS });
  return row;
}

exports.get = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'Footer settings', row);
};

exports.adminGet = async (req, res) => {
  const row = await getOrCreate();
  return R.success(res, 'Footer settings', row);
};

exports.adminUpdate = async (req, res) => {
  const row = await getOrCreate();
  await row.update(req.body);
  return R.success(res, 'Footer settings updated', row);
};
