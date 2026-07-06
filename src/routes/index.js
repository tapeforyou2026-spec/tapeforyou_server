const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/wishlist', require('./wishlist.routes'));
router.use('/orders', require('./order.routes'));
router.use('/coupons', require('./coupon.routes'));
router.use('/admin/auth', require('./admin.auth.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
