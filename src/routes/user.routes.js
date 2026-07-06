const router = require('express').Router();
const ctrl = require('../controllers/UserController');
const { protect } = require('../middlewares/auth');
const { profileImage, handleUploadError } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const v = require('../validators/auth.validator');
const Joi = require('joi');

router.use(protect);
router.get('/profile', ctrl.getProfile);
router.put('/profile', profileImage, handleUploadError, ctrl.updateProfile);
router.post('/change-password', validate(v.changePassword), ctrl.changePassword);
router.get('/addresses', ctrl.getAddresses);
router.post('/addresses', validate(require('../validators/order.validator').address), ctrl.addAddress);
router.put('/addresses/:id', validate(require('../validators/order.validator').address), ctrl.updateAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

module.exports = router;
