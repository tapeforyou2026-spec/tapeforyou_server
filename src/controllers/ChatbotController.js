const { ChatbotFaq, ChatbotLog } = require('../models');
const R = require('../utils/response');

exports.listFaqs = async (req, res) => {
  const faqs = await ChatbotFaq.findAll({
    where: { status: 'active' },
    order: [['sort_order', 'ASC'], ['id', 'ASC']],
  });
  return R.success(res, 'Chatbot FAQs', faqs);
};

// Public — fire-and-forget analytics write called after every question the
// widget answers (whether it matched an FAQ or not). optionalAuth means
// req.user is populated for logged-in customers and undefined for guests;
// guests are still tracked via a client-generated guest_id so admin can see
// per-visitor conversations without requiring login.
exports.log = async (req, res) => {
  const { question, answer, matched, guest_id } = req.body;
  const log = await ChatbotLog.create({
    question,
    answer,
    matched,
    guest_id: req.user ? null : guest_id,
    customer_id: req.user?.id || null,
    customer_name: req.user?.name || null,
    customer_email: req.user?.email || null,
  });
  return R.created(res, 'Logged', log);
};

exports.adminListFaqs = async (req, res) => {
  const faqs = await ChatbotFaq.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  return R.success(res, 'Chatbot FAQs', faqs);
};

exports.adminCreateFaq = async (req, res) => {
  const faq = await ChatbotFaq.create(req.body);
  return R.created(res, 'FAQ created', faq);
};

exports.adminUpdateFaq = async (req, res) => {
  const faq = await ChatbotFaq.findByPk(req.params.id);
  if (!faq) return R.notFound(res, 'FAQ not found');
  await faq.update(req.body);
  return R.success(res, 'FAQ updated', faq);
};

exports.adminDeleteFaq = async (req, res) => {
  const deleted = await ChatbotFaq.destroy({ where: { id: req.params.id } });
  if (!deleted) return R.notFound(res, 'FAQ not found');
  return R.success(res, 'FAQ deleted');
};

exports.adminListLogs = async (req, res) => {
  const logs = await ChatbotLog.findAll({ order: [['created_at', 'DESC']], limit: 2000 });
  return R.success(res, 'Chatbot logs', logs);
};
