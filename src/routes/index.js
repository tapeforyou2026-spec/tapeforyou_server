const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/hero-slides', require('./heroSlide.routes'));
router.use('/about-page', require('./aboutPage.routes'));
router.use('/offers-hero', require('./offersHero.routes'));
router.use('/blogs', require('./blog.routes'));
router.use('/contact-page', require('./contactPage.routes'));
router.use('/contact', require('./contact.routes'));
router.use('/newsletter', require('./newsletter.routes'));
router.use('/chatbot', require('./chatbot.routes'));
router.use('/testimonials', require('./testimonial.routes'));
router.use('/shipping', require('./shipping.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/wishlist', require('./wishlist.routes'));
router.use('/orders', require('./order.routes'));
router.use('/coupons', require('./coupon.routes'));
router.use('/admin/auth', require('./admin.auth.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
