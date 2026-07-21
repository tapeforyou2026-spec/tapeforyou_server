const router = require('express').Router();
const ctrl = require('../controllers/ShippingController');

router.post('/check', ctrl.check);

module.exports = router;
