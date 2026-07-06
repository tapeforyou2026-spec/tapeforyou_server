const router = require('express').Router();
const ctrl = require('../controllers/AuthController');
const validate = require('../middlewares/validate');
const v = require('../validators/auth.validator');
const { protect } = require('../middlewares/auth');
const { auth: authLimit, strict } = require('../middlewares/rateLimiter');

router.post('/register', authLimit, validate(v.register), ctrl.register);
router.post('/login', authLimit, validate(v.login), ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', ctrl.logout);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/forgot-password', strict, validate(v.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validate(v.resetPassword), ctrl.resetPassword);
router.get('/me', protect, ctrl.me);

module.exports = router;
