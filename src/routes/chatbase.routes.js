const router = require('express').Router();
const ctrl = require('../controllers/ChatbaseController');
const { protect } = require('../middlewares/auth');

router.get('/identify-token', protect, ctrl.getIdentityToken);

module.exports = router;
