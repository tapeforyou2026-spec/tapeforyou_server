const router = require('express').Router();
const ctrl = require('../controllers/OrderController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const v = require('../validators/order.validator');

router.use(protect);
router.post('/', validate(v.createOrder), ctrl.createOrder);
router.post('/verify-payment', ctrl.verifyPayment);
router.get('/my', ctrl.myOrders);
router.get('/my/:id', ctrl.myOrderDetail);
router.get('/my/:id/invoice', ctrl.downloadInvoice);
router.post('/my/:id/cancel', ctrl.cancelOrder);

module.exports = router;
