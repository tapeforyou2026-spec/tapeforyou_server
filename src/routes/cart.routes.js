const router = require('express').Router();
const ctrl = require('../controllers/CartController');
const { protect, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const v = require('../validators/order.validator');

router.get('/', optionalAuth, ctrl.getCart);
router.post('/items', optionalAuth, validate(v.addToCart), ctrl.addItem);
router.put('/items/:itemId', optionalAuth, validate(v.updateCartItem), ctrl.updateItem);
router.delete('/items/:itemId', optionalAuth, ctrl.removeItem);
router.delete('/', optionalAuth, ctrl.clearCart);
router.post('/merge', protect, ctrl.mergeCart);

module.exports = router;
