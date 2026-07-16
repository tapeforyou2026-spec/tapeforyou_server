const Joi = require('joi');

exports.log = Joi.object({
  question: Joi.string().trim().min(1).max(2000).required(),
  answer: Joi.string().trim().max(4000).allow('', null),
  matched: Joi.boolean().default(true),
  guest_id: Joi.string().trim().max(64).allow('', null),
});

exports.faqCreate = Joi.object({
  question: Joi.string().trim().min(3).max(300).required(),
  answer: Joi.string().trim().min(1).required(),
  sort_order: Joi.number().integer().default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

exports.faqUpdate = exports.faqCreate.fork(['question', 'answer'], (s) => s.optional());
