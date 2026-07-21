const router = require('express').Router();
const { adminProtect, superAdmin } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(adminProtect);

// Dashboard
const dashCtrl = require('../controllers/DashboardController');
router.get('/dashboard/stats', dashCtrl.stats);
router.get('/dashboard/low-stock', dashCtrl.lowStock);

// Notifications
const notifCtrl = require('../controllers/NotificationController');
router.get('/notifications', notifCtrl.list);
router.get('/notifications/unread-count', notifCtrl.unreadCount);
router.put('/notifications/read-all', notifCtrl.markAllRead);
router.put('/notifications/:id/read', notifCtrl.markRead);

// Orders
const orderCtrl = require('../controllers/OrderController');
router.get('/orders', orderCtrl.adminList);
router.get('/orders/:id', orderCtrl.adminDetail);
router.get('/orders/:id/invoice', orderCtrl.adminDownloadInvoice);
router.get('/orders/:id/packing-slip', orderCtrl.adminDownloadPackingSlip);
router.get('/orders/:id/credit-note', orderCtrl.adminDownloadCreditNote);
router.get('/orders/:id/shipping-label', orderCtrl.adminShippingLabel);
router.post('/orders/:id/shipping-label', orderCtrl.adminGenerateShippingLabel);
router.put('/orders/:id/status', orderCtrl.adminUpdateStatus);
router.put('/orders/:id/mark-paid', orderCtrl.markPaid);
router.get('/orders/:id/shipping-rates', orderCtrl.adminShippingRates);
router.post('/orders/:id/ship', orderCtrl.shipOrder);
router.post('/orders/:id/cancel-shipment', orderCtrl.cancelShipment);

// Bigship — one-time pickup warehouse registration (see services/bigship/claude.md)
const bigshipCtrl = require('../controllers/BigshipController');
router.post('/bigship/warehouse', bigshipCtrl.registerWarehouse);
router.get('/bigship/warehouse', bigshipCtrl.getWarehouse);
router.get('/bigship/profile', bigshipCtrl.getProfile);

// Invoices
const invoiceCtrl = require('../controllers/InvoiceController');
router.get('/invoices', invoiceCtrl.adminList);

// Users
const userCtrl = require('../controllers/UserController');
router.get('/users', userCtrl.adminList);
router.get('/users/:id', userCtrl.adminDetail);
router.put('/users/:id/status', userCtrl.adminUpdateStatus);
router.put('/users/:id/verify', userCtrl.adminVerifyEmail);

// Coupons
const couponCtrl = require('../controllers/CouponController');
const couponValidator = require('../validators/coupon.validator');
router.get('/coupons', couponCtrl.adminList);
router.post('/coupons', validate(couponValidator.create), couponCtrl.adminCreate);
router.put('/coupons/:id', validate(couponValidator.update), couponCtrl.adminUpdate);
router.delete('/coupons/:id', couponCtrl.adminDelete);

// Incoming Stock
const stockInCtrl = require('../controllers/StockInController');
const stockInValidator = require('../validators/stockIn.validator');
router.get('/stock-in', stockInCtrl.list);
router.post('/stock-in', validate(stockInValidator.create), stockInCtrl.create);
router.put('/stock-in/:id/receive', validate(stockInValidator.receive), stockInCtrl.markReceived);
router.put('/stock-in/:id/cancel', stockInCtrl.cancel);

// Activity Logs — list/detail/recent are open to any admin (server-side
// scoped to "own logs only" for non-super-admins inside the controller);
// export is Super Admin only per spec. Route order matters: /export and
// /filter-options must come before /:id or Express would treat them as ids.
const activityLogCtrl = require('../controllers/AdminActivityLogController');
router.get('/activity-logs/filter-options', activityLogCtrl.filterOptions);
router.get('/activity-logs/recent', activityLogCtrl.recent);
router.get('/activity-logs/export', superAdmin, activityLogCtrl.exportCsv);
router.get('/activity-logs/:id', activityLogCtrl.detail);
router.get('/activity-logs', activityLogCtrl.list);

// Wishlist
const wishlistCtrl = require('../controllers/WishlistController');
router.get('/wishlist/most-wishlisted', wishlistCtrl.adminMostWishlisted);

// Hero Slides (homepage banner carousel)
const heroSlideCtrl = require('../controllers/HeroSlideController');
const { heroImages, handleUploadError } = require('../middlewares/upload');
router.get('/hero-slides', heroSlideCtrl.adminList);
router.post('/hero-slides', heroImages, handleUploadError, heroSlideCtrl.adminCreate);
router.put('/hero-slides/:id', heroImages, handleUploadError, heroSlideCtrl.adminUpdate);
router.delete('/hero-slides/:id', heroSlideCtrl.adminDelete);

// About Page (singleton content)
const aboutPageCtrl = require('../controllers/AboutPageController');
const { aboutImage } = require('../middlewares/upload');
router.get('/about-page', aboutPageCtrl.adminGet);
router.put('/about-page', aboutImage, handleUploadError, aboutPageCtrl.adminUpdate);

// Offers Page Hero (singleton content)
const offersHeroCtrl = require('../controllers/OffersHeroController');
const { offersHeroImages } = require('../middlewares/upload');
router.get('/offers-hero', offersHeroCtrl.adminGet);
router.put('/offers-hero', offersHeroImages, handleUploadError, offersHeroCtrl.adminUpdate);

// Blog
const blogCtrl = require('../controllers/BlogController');
const { blogImage } = require('../middlewares/upload');
router.get('/blogs', blogCtrl.adminList);
router.get('/blogs/:id', blogCtrl.adminGet);
router.post('/blogs', blogImage, handleUploadError, blogCtrl.adminCreate);
router.put('/blogs/:id', blogImage, handleUploadError, blogCtrl.adminUpdate);
router.delete('/blogs/:id', blogCtrl.adminDelete);

// Contact Page (singleton content) + Contact Submissions (customer messages)
const contactPageCtrl = require('../controllers/ContactPageController');
const contactSubmissionCtrl = require('../controllers/ContactSubmissionController');
router.get('/contact-page', contactPageCtrl.adminGet);
router.put('/contact-page', contactPageCtrl.adminUpdate);
router.get('/contact-submissions', contactSubmissionCtrl.adminList);
router.get('/contact-submissions/:id', contactSubmissionCtrl.adminGet);
router.put('/contact-submissions/:id/status', contactSubmissionCtrl.adminUpdateStatus);
router.delete('/contact-submissions/:id', contactSubmissionCtrl.adminDelete);

// Newsletter Subscribers
const newsletterCtrl = require('../controllers/NewsletterController');
router.get('/newsletter-subscribers', newsletterCtrl.adminList);
router.get('/newsletter-subscribers/export', newsletterCtrl.adminExport);

// Chatbot FAQs + Logs
const chatbotCtrl = require('../controllers/ChatbotController');
const { faqCreate, faqUpdate } = require('../validators/chatbot.validator');
router.get('/chatbot-faqs', chatbotCtrl.adminListFaqs);
router.post('/chatbot-faqs', validate(faqCreate), chatbotCtrl.adminCreateFaq);
router.put('/chatbot-faqs/:id', validate(faqUpdate), chatbotCtrl.adminUpdateFaq);
router.delete('/chatbot-faqs/:id', chatbotCtrl.adminDeleteFaq);
router.get('/chatbot-logs', chatbotCtrl.adminListLogs);

// Testimonials
const testimonialCtrl = require('../controllers/TestimonialController');
const { testimonialAvatar } = require('../middlewares/upload');
router.get('/testimonials', testimonialCtrl.adminList);
router.post('/testimonials', testimonialAvatar, handleUploadError, testimonialCtrl.adminCreate);
router.put('/testimonials/:id', testimonialAvatar, handleUploadError, testimonialCtrl.adminUpdate);
router.delete('/testimonials/:id', testimonialCtrl.adminDelete);

// Analytics
const analyticsCtrl = require('../controllers/AnalyticsController');
router.get('/analytics/most-viewed-products', analyticsCtrl.mostViewedProducts);
router.get('/analytics/top-selling-products', analyticsCtrl.topSellingProducts);
router.get('/analytics/revenue-trend', analyticsCtrl.revenueTrend);
router.get('/analytics/avg-order-value', analyticsCtrl.avgOrderValue);
router.get('/analytics/returning-customers', analyticsCtrl.returningCustomers);
router.get('/analytics/traffic-source', analyticsCtrl.trafficSource);

// Reports
const reportsCtrl = require('../controllers/ReportsController');
router.get('/reports/sales', reportsCtrl.salesReport);
router.get('/reports/gst', reportsCtrl.gstReport);
router.get('/reports/inventory', reportsCtrl.inventoryReport);
router.get('/reports/customers', reportsCtrl.customerReport);
router.get('/reports/products', reportsCtrl.productReport);
router.get('/reports/courier', reportsCtrl.courierReport);
router.get('/reports/refunds', reportsCtrl.refundReport);
router.get('/reports/:type/pdf', reportsCtrl.downloadReportPdf);

// Staff / Admin management (Super Admin only)
const adminUserCtrl = require('../controllers/AdminUserController');
const adminUserValidator = require('../validators/adminUser.validator');
router.get('/roles', superAdmin, adminUserCtrl.listRoles);
router.get('/admins', superAdmin, adminUserCtrl.list);
router.get('/admins/:id', superAdmin, adminUserCtrl.detail);
router.post('/admins', superAdmin, validate(adminUserValidator.create), adminUserCtrl.create);
router.put('/admins/:id', superAdmin, validate(adminUserValidator.update), adminUserCtrl.update);
router.put('/admins/:id/status', superAdmin, validate(adminUserValidator.updateStatus), adminUserCtrl.updateStatus);
router.put('/admins/:id/reset-password', superAdmin, validate(adminUserValidator.resetPassword), adminUserCtrl.resetPassword);

module.exports = router;
