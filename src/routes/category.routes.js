const router = require('express').Router();
const ctrl = require('../controllers/CategoryController');
const { adminProtect } = require('../middlewares/auth');
const { categoryImage, handleUploadError } = require('../middlewares/upload');

router.get('/', ctrl.list);
router.get('/all', ctrl.all);
router.post('/', adminProtect, categoryImage, handleUploadError, ctrl.create);
router.put('/:id', adminProtect, categoryImage, handleUploadError, ctrl.update);
router.delete('/:id', adminProtect, ctrl.delete);

module.exports = router;
