const router = require('express').Router();
const ctrl = require('../controllers/HeroSlideController');

router.get('/', ctrl.list);

module.exports = router;
