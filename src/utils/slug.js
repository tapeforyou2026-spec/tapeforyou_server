const slugify = require('slugify');

const generateSlug = (text) =>
  slugify(text, { lower: true, strict: true, trim: true });

const generateUniqueSlug = async (text, Model, field = 'slug', excludeId = null) => {
  let slug = generateSlug(text);
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const where = { [field]: slug };
    if (excludeId) where.id = { [require('sequelize').Op.ne]: excludeId };

    const existing = await Model.findOne({ where });
    if (!existing) {
      isUnique = true;
    } else {
      slug = `${generateSlug(text)}-${counter}`;
      counter++;
    }
  }
  return slug;
};

module.exports = { generateSlug, generateUniqueSlug };
