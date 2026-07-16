const router = require('express').Router();
const ctrl = require('../controllers/ChatbotController');
const validate = require('../middlewares/validate');
const { log } = require('../validators/chatbot.validator');
const { optionalAuth } = require('../middlewares/auth');

router.get('/faqs', ctrl.listFaqs);
router.post('/log', optionalAuth, validate(log), ctrl.log);

module.exports = router;
