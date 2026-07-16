const router = require('express').Router();
const ctrl = require('../controllers/NewsletterController');
const validate = require('../middlewares/validate');
const { subscribe } = require('../validators/newsletter.validator');

router.post('/subscribe', validate(subscribe), ctrl.subscribe);

module.exports = router;
