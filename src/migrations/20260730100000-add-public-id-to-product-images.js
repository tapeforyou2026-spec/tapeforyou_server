'use strict';

// Needed to actually delete an image from Cloudinary when an admin removes
// it — Cloudinary's destroy API takes a public_id, not a URL. NULL for any
// existing image (local-disk uploads, or an admin-pasted external URL via
// addImageLink) — deleteImage only calls Cloudinary's destroy when this is set.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('product_images', 'public_id', { type: Sequelize.STRING(255), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('product_images', 'public_id');
  },
};
