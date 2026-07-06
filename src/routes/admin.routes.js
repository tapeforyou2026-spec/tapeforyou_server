const router = require('express').Router();
const { adminProtect, superAdmin } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(adminProtect);

// Dashboard
const dashCtrl = require('../controllers/DashboardController');
router.get('/dashboard/stats', dashCtrl.stats);
router.get('/dashboard/low-stock', dashCtrl.lowStock);

// Orders
const orderCtrl = require('../controllers/OrderController');
router.get('/orders', orderCtrl.adminList);
router.get('/orders/:id', orderCtrl.adminDetail);
router.get('/orders/:id/invoice', orderCtrl.adminDownloadInvoice);
router.put('/orders/:id/status', orderCtrl.adminUpdateStatus);
router.put('/orders/:id/mark-paid', orderCtrl.markPaid);
router.post('/orders/:id/ship', orderCtrl.shipOrder);

// Users
const userCtrl = require('../controllers/UserController');
router.get('/users', userCtrl.adminList);
router.get('/users/:id', userCtrl.adminDetail);
router.put('/users/:id/status', userCtrl.adminUpdateStatus);

// Coupons
const couponCtrl = require('../controllers/CouponController');
router.get('/coupons', couponCtrl.adminList);
router.post('/coupons', couponCtrl.adminCreate);
router.put('/coupons/:id', couponCtrl.adminUpdate);
router.delete('/coupons/:id', couponCtrl.adminDelete);

// Reports
const reportsCtrl = require('../controllers/ReportsController');
router.get('/reports/sales', reportsCtrl.salesReport);
router.get('/reports/gst', reportsCtrl.gstReport);
router.get('/reports/inventory', reportsCtrl.inventoryReport);
router.get('/reports/customers', reportsCtrl.customerReport);

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
