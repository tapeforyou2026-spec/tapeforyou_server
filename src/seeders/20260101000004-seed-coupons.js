'use strict';
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('coupons', [
      { code: 'TAPE15', type: 'percent', value: 15, min_order_amount: 299, max_discount: 200, usage_limit: null, per_user_limit: 3, status: 'active', description: '15% off on all orders', created_at: new Date(), updated_at: new Date() },
      { code: 'WELCOME100', type: 'flat', value: 100, min_order_amount: 499, usage_limit: 500, per_user_limit: 1, status: 'active', description: '₹100 off for new users', created_at: new Date(), updated_at: new Date() },
      { code: 'BULK10', type: 'percent', value: 10, min_order_amount: 1000, max_discount: 500, usage_limit: null, applicable_for: 'b2b', status: 'active', description: '10% off for bulk orders above ₹1000', created_at: new Date(), updated_at: new Date() },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('coupons', null, {});
  },
};
