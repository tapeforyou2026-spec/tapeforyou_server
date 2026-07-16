const router = require('express').Router();
const ctrl = require('../controllers/BlogController');

router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);

module.exports = router;
