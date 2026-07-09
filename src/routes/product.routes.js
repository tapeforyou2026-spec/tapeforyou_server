const router = require('express').Router();
const ctrl = require('../controllers/ProductController');
const { protect, adminProtect } = require('../middlewares/auth');
const { productImages, categoryImage, handleUploadError } = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const v = require('../validators/product.validator');

// Public
router.get('/', ctrl.list);
router.get('/featured', ctrl.featured);
router.get('/id/:id', adminProtect, ctrl.getById);
router.get('/:slug', ctrl.show);

// Admin
router.post('/', adminProtect, validate(v.createProduct), ctrl.create);
router.put('/:id', adminProtect, ctrl.update);
router.delete('/:id', adminProtect, ctrl.delete);

// Variants
router.post('/:id/variants', adminProtect, validate(v.createVariant), ctrl.addVariant);
router.put('/:id/variants/:variantId', adminProtect, ctrl.updateVariant);
router.delete('/:id/variants/:variantId', adminProtect, ctrl.deleteVariant);

// Images
router.post('/:id/images', adminProtect, productImages, handleUploadError, ctrl.uploadImages);
router.post('/:id/images/link', adminProtect, ctrl.addImageLink);
router.delete('/:id/images/:imageId', adminProtect, ctrl.deleteImage);

// B2B Pricing
router.put('/variants/:variantId/b2b-pricing', adminProtect, ctrl.updateB2BPricing);

module.exports = router;
