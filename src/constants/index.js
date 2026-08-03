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
  HDFC: 'hdfc',
};

// Real values confirmed against HDFC SmartGateway's Transaction Status
// documentation (see PAYMENT_DOCUMENTATION.md Part 8) — do not add a value
// here that hasn't been seen in a real HDFC response or their docs.
const HDFC_ORDER_STATUS = {
  NEW: 'NEW',
  PENDING_VBV: 'PENDING_VBV',
  AUTHORIZING: 'AUTHORIZING',
  STARTED: 'STARTED',
  CHARGED: 'CHARGED',
  AUTHORIZED: 'AUTHORIZED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  JUSPAY_DECLINED: 'JUSPAY_DECLINED',
  VOIDED: 'VOIDED',
  VOID_INITIATED: 'VOID_INITIATED',
  VOID_FAILED: 'VOID_FAILED',
  AUTO_REFUNDED: 'AUTO_REFUNDED',
  CAPTURE_INITIATED: 'CAPTURE_INITIATED',
  CAPTURE_FAILED: 'CAPTURE_FAILED',
};

// This project's own internal payment-lifecycle status (Payment.status),
// separate from HDFC's raw status above — HDFC_STATUS_MAP below is the only
// place the two are translated into each other.
const HDFC_PAYMENT_STATUS = {
  PENDING: 'pending',
  CREATED: 'created',
  PROCESSING: 'processing',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// `payments.status` is a real Postgres ENUM restricted to the 5 existing
// Razorpay-oriented values (pending, paid, failed, refunded,
// partially_refunded) — extending it wasn't necessary (Part 4's own "only
// add a column/table if absolutely necessary" principle), so this maps
// HDFC_PAYMENT_STATUS's finer granularity down onto those 5 values for the
// actual `payments.status` column. The full granular value is never lost —
// it's still recorded as-is in `payment_status_history.to_status` (a plain
// STRING column, no ENUM constraint) for the detailed timeline/audit view.
const HDFC_TO_PAYMENT_STATUS_COLUMN = {
  pending: 'pending',
  created: 'pending',
  processing: 'pending',
  authorized: 'pending',
  captured: 'paid',
  failed: 'failed',
  cancelled: 'failed',
  expired: 'failed',
};

// See PAYMENT_DOCUMENTATION.md Part 8's status table for the reasoning
// behind each mapping.
const HDFC_STATUS_MAP = {
  [HDFC_ORDER_STATUS.NEW]: HDFC_PAYMENT_STATUS.PENDING,
  [HDFC_ORDER_STATUS.PENDING_VBV]: HDFC_PAYMENT_STATUS.PROCESSING,
  [HDFC_ORDER_STATUS.AUTHORIZING]: HDFC_PAYMENT_STATUS.PROCESSING,
  [HDFC_ORDER_STATUS.STARTED]: HDFC_PAYMENT_STATUS.PROCESSING,
  [HDFC_ORDER_STATUS.CHARGED]: HDFC_PAYMENT_STATUS.CAPTURED,
  [HDFC_ORDER_STATUS.AUTHORIZED]: HDFC_PAYMENT_STATUS.AUTHORIZED,
  [HDFC_ORDER_STATUS.AUTHENTICATION_FAILED]: HDFC_PAYMENT_STATUS.FAILED,
  [HDFC_ORDER_STATUS.AUTHORIZATION_FAILED]: HDFC_PAYMENT_STATUS.FAILED,
  [HDFC_ORDER_STATUS.JUSPAY_DECLINED]: HDFC_PAYMENT_STATUS.FAILED,
  [HDFC_ORDER_STATUS.VOIDED]: HDFC_PAYMENT_STATUS.CANCELLED,
  [HDFC_ORDER_STATUS.AUTO_REFUNDED]: HDFC_PAYMENT_STATUS.CAPTURED, // refund itself tracked on the Refund row, not the Payment status
};

const PAYMENT_SESSION_STATUS = {
  CREATED: 'created',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUPERSEDED: 'superseded',
  CONSUMED: 'consumed',
};

// Real values confirmed against HDFC's Refund Order API documentation.
const REFUND_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

const PAYMENT_TRIGGER_SOURCE = {
  REDIRECT: 'redirect',
  WEBHOOK: 'webhook',
  CRON: 'cron',
  ADMIN: 'admin',
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
  LOGIN: 'login',
};

const STOCK_IN_STATUS = {
  ORDERED: 'ordered',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

// Order Return Flow — whole-order-only scope (a customer either returns the
// entire order or contacts support; see ReturnService.js). A rejected
// request is terminal, same precedent as Cancel not being re-cancellable.
const RETURN_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REFUNDED: 'refunded',
};

// Customers can only request a return within this many days of delivery —
// requires `Order.delivered_at` to actually be set (see
// OrderController.adminUpdateStatus, which now sets it the first time an
// order reaches 'delivered' — previously a dead column, never written).
const RETURN_WINDOW_DAYS = 7;

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
  RETURN_REQUESTED: 'Return Requested',
  RETURN_APPROVED: 'Return Approved',
  RETURN_REJECTED: 'Return Rejected',
  RETURN_REFUNDED: 'Return Refunded',

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
  RETURN_STATUS, RETURN_WINDOW_DAYS,
  ACTIVITY_MODULES, ACTIVITY_ACTIONS,
  HDFC_ORDER_STATUS, HDFC_PAYMENT_STATUS, HDFC_STATUS_MAP, HDFC_TO_PAYMENT_STATUS_COLUMN,
  PAYMENT_SESSION_STATUS, REFUND_STATUS, PAYMENT_TRIGGER_SOURCE,
};
