const router = require('express').Router();
const ctrl = require('../controllers/AboutPageController');

router.get('/', ctrl.get);

module.exports = router;
