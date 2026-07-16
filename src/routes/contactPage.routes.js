const router = require('express').Router();
const ctrl = require('../controllers/ContactPageController');

router.get('/', ctrl.get);

module.exports = router;
