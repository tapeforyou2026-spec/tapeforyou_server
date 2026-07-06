const router = require('express').Router();
const ctrl = require('../controllers/CouponController');
const { protect } = require('../middlewares/auth');

router.post('/validate', protect, ctrl.validate);

module.exports = router;
