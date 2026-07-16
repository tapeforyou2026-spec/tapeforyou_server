const router = require('express').Router();
const ctrl = require('../controllers/ContactSubmissionController');
const validate = require('../middlewares/validate');
const { create } = require('../validators/contact.validator');

router.post('/', validate(create), ctrl.create);

module.exports = router;
