const { ContactSubmission } = require('../models');
const R = require('../utils/response');

exports.create = async (req, res) => {
  const submission = await ContactSubmission.create(req.body);
  return R.created(res, "Message sent! We'll get back to you within 24 hours.", submission);
};

exports.adminList = async (req, res) => {
  const submissions = await ContactSubmission.findAll({ order: [['created_at', 'DESC']] });
  return R.success(res, 'Contact submissions', submissions);
};

exports.adminGet = async (req, res) => {
  const submission = await ContactSubmission.findByPk(req.params.id);
  if (!submission) return R.notFound(res, 'Submission not found');
  if (submission.status === 'new') await submission.update({ status: 'read' });
  return R.success(res, 'Submission', submission);
};

exports.adminUpdateStatus = async (req, res) => {
  const submission = await ContactSubmission.findByPk(req.params.id);
  if (!submission) return R.notFound(res, 'Submission not found');
  await submission.update({ status: req.body.status });
  return R.success(res, 'Status updated', submission);
};

exports.adminDelete = async (req, res) => {
  const deleted = await ContactSubmission.destroy({ where: { id: req.params.id } });
  if (!deleted) return R.notFound(res, 'Submission not found');
  return R.success(res, 'Submission deleted');
};
