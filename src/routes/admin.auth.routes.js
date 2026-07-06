const router = require('express').Router();
const ctrl = require('../controllers/AdminAuthController');
const { adminProtect } = require('../middlewares/auth');
const { auth: authLimit } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');
const { changePassword } = require('../validators/auth.validator');

router.post('/login', authLimit, ctrl.login);
router.post('/logout', adminProtect, ctrl.logout);
router.get('/me', adminProtect, ctrl.me);
router.post('/change-password', adminProtect, validate(changePassword), ctrl.changePassword);

module.exports = router;
