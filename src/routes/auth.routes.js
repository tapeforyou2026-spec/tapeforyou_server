const router = require('express').Router();
const ctrl = require('../controllers/AuthController');
const validate = require('../middlewares/validate');
const v = require('../validators/auth.validator');
const { protect } = require('../middlewares/auth');
const csrf = require('../middlewares/csrf');
const { auth: authLimit, strict } = require('../middlewares/rateLimiter');

router.post('/register', authLimit, validate(v.register), ctrl.register);
router.post('/login', authLimit, validate(v.login), ctrl.login);
router.post('/refresh', csrf, ctrl.refreshToken);
router.post('/logout', ctrl.logout);
router.post('/logout-all', protect, ctrl.logoutAll);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/forgot-password', strict, validate(v.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validate(v.resetPassword), ctrl.resetPassword);
router.post('/resend-verification', strict, validate(v.resendVerification), ctrl.resendVerification);
router.post('/send-otp', strict, validate(v.sendOtp), ctrl.sendOtp);
router.post('/verify-otp', authLimit, validate(v.verifyOtp), ctrl.verifyOtp);
router.get('/active-sessions', protect, ctrl.activeSessions);
router.delete('/session/:id', protect, ctrl.deleteSession);
router.get('/me', protect, ctrl.me);

module.exports = router;
