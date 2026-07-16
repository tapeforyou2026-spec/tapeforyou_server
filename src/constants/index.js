const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPPORT: 'support',
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
  PENDING: 'pending',
};

const PRODUCT_STATUS = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
};

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

const PAYMENT_METHOD = {
  RAZORPAY: 'razorpay',
  COD: 'cod',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
};

const SHIPMENT_STATUS = {
  PENDING: 'pending',
  BOOKED: 'booked',
  PICKUP_REQUESTED: 'pickup_requested',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
};

const COUPON_TYPE = {
  FLAT: 'flat',
  PERCENT: 'percent',
};

const NOTIFICATION_TYPE = {
  ORDER: 'order',
  PAYMENT: 'payment',
  SHIPMENT: 'shipment',
  PROMO: 'promo',
  SYSTEM: 'system',
};

const ADDRESS_TYPE = {
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other',
};

const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const OTP_PURPOSE = {
  VERIFY_MOBILE: 'verify_mobile',
  RESET_PASSWORD: 'reset_password',
};

const STOCK_IN_STATUS = {
  ORDERED: 'ordered',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

// Activity Logs / Audit Trail. Only modules with real CRUD in this codebase
// today are listed — Banners and Website Settings were explicitly deferred
// (no such features exist yet to log).
const ACTIVITY_MODULES = {
  AUTH: 'auth',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  COUPONS: 'coupons',
  ADMINS: 'admins',
};

const ACTIVITY_ACTIONS = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  FAILED_LOGIN: 'Failed Login',
  PASSWORD_CHANGED: 'Password Changed',
  PASSWORD_RESET: 'Password Reset',

  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_DELETED: 'Product Deleted',
  PRODUCT_PUBLISHED: 'Product Published',
  PRODUCT_HIDDEN: 'Product Hidden',
  PRODUCT_STOCK_UPDATED: 'Product Stock Updated',
  PRODUCT_PRICE_UPDATED: 'Product Price Updated',

  CATEGORY_CREATED: 'Category Created',
  CATEGORY_UPDATED: 'Category Updated',
  CATEGORY_DELETED: 'Category Deleted',

  ORDER_CREATED: 'Order Created',
  ORDER_UPDATED: 'Order Updated',
  ORDER_STATUS_CHANGED: 'Order Status Changed',
  ORDER_CANCELLED: 'Order Cancelled',
  ORDER_REFUNDED: 'Order Refunded',
  ORDER_SHIPPED: 'Order Shipped',
  ORDER_DELIVERED: 'Order Delivered',
  ORDER_PAYMENT_RECEIVED: 'Order Payment Received',

  COUPON_CREATED: 'Coupon Created',
  COUPON_UPDATED: 'Coupon Updated',
  COUPON_DELETED: 'Coupon Deleted',

  ADMIN_CREATED: 'Admin Created',
  ADMIN_UPDATED: 'Admin Updated',
  ADMIN_DELETED: 'Admin Deleted',
  ADMIN_STATUS_CHANGED: 'Admin Status Changed',
  ROLE_CHANGED: 'Role Changed',
};

const GST_HSN = {
  BOPP: { hsn: '39191000', gst: 18 },
  PVC_ELECTRICAL: { hsn: '85469090', gst: 18 },
  PVC_FLOOR: { hsn: '39199090', gst: 18 },
  MASKING: { hsn: '48114100', gst: 18 },
  TISSUE: { hsn: '48114100', gst: 18 },
  DEFAULT: { hsn: '39199090', gst: 18 },
};

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];

module.exports = {
  ROLES, USER_STATUS, PRODUCT_STATUS, ORDER_STATUS, PAYMENT_STATUS,
  PAYMENT_METHOD, SHIPMENT_STATUS, COUPON_TYPE, NOTIFICATION_TYPE,
  ADDRESS_TYPE, REVIEW_STATUS, GST_HSN, INDIA_STATES, OTP_PURPOSE, STOCK_IN_STATUS,
  ACTIVITY_MODULES, ACTIVITY_ACTIONS,
};
