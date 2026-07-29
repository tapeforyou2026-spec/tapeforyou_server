const router = require('express').Router();
const ctrl = require('../controllers/FooterSettingsController');

router.get('/', ctrl.get);

module.exports = router;
