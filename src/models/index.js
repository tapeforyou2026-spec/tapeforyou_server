const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./User')(sequelize, DataTypes);
const Admin = require('./Admin')(sequelize, DataTypes);
const Role = require('./Role')(sequelize, DataTypes);
const Permission = require('./Permission')(sequelize, DataTypes);
const RolePermission = require('./RolePermission')(sequelize, DataTypes);
const AdminRole = require('./AdminRole')(sequelize, DataTypes);
const RefreshToken = require('./RefreshToken')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const Brand = require('./Brand')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const ProductVariant = require('./ProductVariant')(sequelize, DataTypes);
const ProductImage = require('./ProductImage')(sequelize, DataTypes);
const ProductReview = require('./ProductReview')(sequelize, DataTypes);
const B2BPricing = require('./B2BPricing')(sequelize, DataTypes);
const Cart = require('./Cart')(sequelize, DataTypes);
const CartItem = require('./CartItem')(sequelize, DataTypes);
const Wishlist = require('./Wishlist')(sequelize, DataTypes);
const Address = require('./Address')(sequelize, DataTypes);
const Coupon = require('./Coupon')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const Payment = require('./Payment')(sequelize, DataTypes);
const Shipment = require('./Shipment')(sequelize, DataTypes);
const Invoice = require('./Invoice')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);
const ActivityLog = require('./ActivityLog')(sequelize, DataTypes);

// ── Associations ──────────────────────────────────────────────────

// Admin ↔ Role (many-to-many)
Admin.belongsToMany(Role, { through: AdminRole, foreignKey: 'admin_id' });
Role.belongsToMany(Admin, { through: AdminRole, foreignKey: 'role_id' });

// Role ↔ Permission (many-to-many)
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id' });

// RefreshToken → User
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(RefreshToken, { foreignKey: 'user_id' });

// Category (self-referential)
Category.hasMany(Category, { as: 'children', foreignKey: 'parent_id' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parent_id' });

// Product → Category, Brand
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Brand, { foreignKey: 'brand_id' });
Brand.hasMany(Product, { foreignKey: 'brand_id' });

// ProductVariant → Product
ProductVariant.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'product_id' });

// ProductImage → Product + ProductVariant
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id' });
ProductImage.belongsTo(ProductVariant, { foreignKey: 'variant_id' });
ProductVariant.hasMany(ProductImage, { as: 'images', foreignKey: 'variant_id' });

// ProductReview → Product + User
ProductReview.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(ProductReview, { as: 'reviews', foreignKey: 'product_id' });
ProductReview.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(ProductReview, { foreignKey: 'user_id' });

// B2BPricing → ProductVariant
B2BPricing.belongsTo(ProductVariant, { foreignKey: 'variant_id' });
ProductVariant.hasMany(B2BPricing, { as: 'b2b_pricing', foreignKey: 'variant_id' });

// Cart → User
Cart.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Cart, { foreignKey: 'user_id' });

// CartItem → Cart + ProductVariant
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });
Cart.hasMany(CartItem, { as: 'items', foreignKey: 'cart_id' });
CartItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variant_id' });
ProductVariant.hasMany(CartItem, { foreignKey: 'variant_id' });

// Wishlist → User + ProductVariant
Wishlist.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Wishlist, { as: 'wishlist', foreignKey: 'user_id' });
Wishlist.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variant_id' });

// Address → User
Address.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Address, { as: 'addresses', foreignKey: 'user_id' });

// Order → User, Address, Coupon
Order.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Order, { as: 'orders', foreignKey: 'user_id' });
Order.belongsTo(Address, { as: 'shipping_address', foreignKey: 'address_id' });
Order.belongsTo(Coupon, { foreignKey: 'coupon_id' });

// OrderItem → Order + ProductVariant
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'order_id' });
OrderItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variant_id' });

// Payment → Order
Payment.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasOne(Payment, { as: 'payment', foreignKey: 'order_id' });

// Shipment → Order
Shipment.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasOne(Shipment, { as: 'shipment', foreignKey: 'order_id' });

// Invoice → Order
Invoice.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasOne(Invoice, { as: 'invoice', foreignKey: 'order_id' });

// Notification → User
Notification.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Notification, { as: 'notifications', foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User, Admin, Role, Permission, RolePermission, AdminRole, RefreshToken,
  Category, Brand, Product, ProductVariant, ProductImage, ProductReview, B2BPricing,
  Cart, CartItem, Wishlist, Address, Coupon,
  Order, OrderItem, Payment, Shipment, Invoice,
  Notification, ActivityLog,
};
