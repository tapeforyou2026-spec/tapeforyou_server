'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('addresses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.ENUM('home', 'work', 'other'), defaultValue: 'home' },
      name: { type: Sequelize.STRING(100), allowNull: false },
      phone: { type: Sequelize.STRING(15), allowNull: false },
      line1: { type: Sequelize.STRING(300), allowNull: false },
      line2: { type: Sequelize.STRING(300), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: false },
      pincode: { type: Sequelize.STRING(10), allowNull: false },
      country: { type: Sequelize.STRING(50), defaultValue: 'India' },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      gstin: { type: Sequelize.STRING(20), allowNull: true },
      company_name: { type: Sequelize.STRING(200), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('wishlists', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addConstraint('wishlists', { fields: ['user_id', 'variant_id'], type: 'unique', name: 'unique_user_variant' });

    await queryInterface.createTable('carts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      session_id: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('cart_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cart_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'carts', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('coupons', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type: { type: Sequelize.ENUM('flat', 'percent'), allowNull: false },
      value: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      min_order_amount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      max_discount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      usage_limit: { type: Sequelize.INTEGER, allowNull: true },
      used_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      per_user_limit: { type: Sequelize.INTEGER, defaultValue: 1 },
      applicable_for: { type: Sequelize.ENUM('all', 'b2c', 'b2b'), defaultValue: 'all' },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive', 'expired'), defaultValue: 'active' },
      description: { type: Sequelize.STRING(300), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('coupons');
    await queryInterface.dropTable('cart_items');
    await queryInterface.dropTable('carts');
    await queryInterface.dropTable('wishlists');
    await queryInterface.dropTable('addresses');
  },
};
