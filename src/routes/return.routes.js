const router = require('express').Router();
const ctrl = require('../controllers/ReturnController');
const { protect, adminProtect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const v = require('../validators/return.validator');

// Admin routes — registered BEFORE `router.use(protect)` below, same reason
// as payment.routes.js: `protect` requires a customer/`type:'user'` token
// and would reject an admin token before `adminProtect` ever runs.
router.get('/admin/list', adminProtect, ctrl.adminList);
router.get('/admin/:id', adminProtect, ctrl.adminDetail);
router.put('/admin/:id/approve', adminProtect, ctrl.adminApprove);
router.put('/admin/:id/reject', adminProtect, validate(v.rejectReturn), ctrl.adminReject);
router.put('/admin/:id/mark-refunded', adminProtect, ctrl.adminMarkRefunded);

// --- Customer routes (below this line only) ---
router.use(protect);
router.post('/', validate(v.requestReturn), ctrl.requestReturn);
router.get('/order/:orderId', ctrl.myReturn);

module.exports = router;
