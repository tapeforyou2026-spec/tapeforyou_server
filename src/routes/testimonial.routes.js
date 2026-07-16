const router = require('express').Router();
const ctrl = require('../controllers/TestimonialController');

router.get('/', ctrl.list);

module.exports = router;
