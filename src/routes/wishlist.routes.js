const router = require('express').Router();
const ctrl = require('../controllers/WishlistController');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.get('/', ctrl.getWishlist);
router.post('/toggle', ctrl.toggle);
router.post('/move-to-cart', ctrl.moveToCart);

module.exports = router;
