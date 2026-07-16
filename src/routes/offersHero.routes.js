const router = require('express').Router();
const ctrl = require('../controllers/OffersHeroController');

router.get('/', ctrl.get);

module.exports = router;
