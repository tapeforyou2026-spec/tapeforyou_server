'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.STRING(50), allowNull: false },
      name: { type: Sequelize.STRING(300), allowNull: false },
      slug: { type: Sequelize.STRING(350), allowNull: false, unique: true },
      category_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'categories', key: 'id' } },
      brand_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'brands', key: 'id' }, onDelete: 'SET NULL' },
      short_description: { type: Sequelize.TEXT, allowNull: true },
      long_description: { type: Sequelize.TEXT, allowNull: true },
      application: { type: Sequelize.TEXT, allowNull: true },
      key_features: { type: Sequelize.TEXT, allowNull: true },
      hsn_code: { type: Sequelize.STRING(20), allowNull: true },
      gst_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 18.00 },
      status: { type: Sequelize.ENUM('active', 'draft', 'inactive', 'out_of_stock'), defaultValue: 'active' },
      is_featured: { type: Sequelize.BOOLEAN, defaultValue: false },
      avg_rating: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0 },
      review_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      seo_title: { type: Sequelize.STRING(200), allowNull: true },
      seo_description: { type: Sequelize.TEXT, allowNull: true },
      seo_tags: { type: Sequelize.STRING(500), allowNull: true },
      spec_sheet: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('products', ['slug']);
    await queryInterface.addIndex('products', ['status']);
    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['is_featured']);

    await queryInterface.createTable('product_variants', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      sku: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      width: { type: Sequelize.STRING(20), allowNull: true },
      length: { type: Sequelize.STRING(20), allowNull: true },
      micron: { type: Sequelize.STRING(20), allowNull: true },
      color: { type: Sequelize.STRING(50), allowNull: true },
      material: { type: Sequelize.STRING(100), allowNull: true },
      pack_size: { type: Sequelize.STRING(100), allowNull: true },
      mrp: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      selling_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      cost_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      b2b_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      stock_qty: { type: Sequelize.INTEGER, defaultValue: 0 },
      moq_b2c: { type: Sequelize.INTEGER, defaultValue: 1 },
      moq_b2b: { type: Sequelize.INTEGER, allowNull: true },
      low_stock_alert: { type: Sequelize.INTEGER, defaultValue: 10 },
      weight: { type: Sequelize.STRING(30), allowNull: true },
      dim_length: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      dim_width: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      dim_height: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive', 'out_of_stock'), defaultValue: 'active' },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('product_variants', ['sku']);
    await queryInterface.addIndex('product_variants', ['product_id']);

    await queryInterface.createTable('product_images', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
      url: { type: Sequelize.STRING(500), allowNull: false },
      alt: { type: Sequelize.STRING(200), allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, defaultValue: false },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('product_reviews', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      rating: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
      verified_purchase: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('b2b_pricing', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      variant_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      tier_qty: { type: Sequelize.INTEGER, allowNull: false },
      tier_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('b2b_pricing');
    await queryInterface.dropTable('product_reviews');
    await queryInterface.dropTable('product_images');
    await queryInterface.dropTable('product_variants');
    await queryInterface.dropTable('products');
  },
};
