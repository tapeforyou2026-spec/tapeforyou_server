const ExcelJS = require('exceljs');
const { NewsletterSubscriber } = require('../models');
const R = require('../utils/response');
const EmailService = require('../services/EmailService');
const logger = require('../utils/logger');

exports.subscribe = async (req, res) => {
  const { email } = req.body;

  const existing = await NewsletterSubscriber.findOne({ where: { email } });
  if (existing) {
    if (existing.status === 'subscribed') {
      return R.success(res, "You're already subscribed!", existing);
    }
    await existing.update({ status: 'subscribed', subscribed_at: new Date() });
    EmailService.sendNewsletterWelcome(email).catch((err) => logger.error(`Newsletter welcome email failed for ${email}: ${err.message}`));
    return R.success(res, "You're subscribed again! Check your inbox.", existing);
  }

  const subscriber = await NewsletterSubscriber.create({ email });
  EmailService.sendNewsletterWelcome(email).catch((err) => logger.error(`Newsletter welcome email failed for ${email}: ${err.message}`));
  return R.created(res, "You're subscribed! Check your inbox.", subscriber);
};

exports.adminList = async (req, res) => {
  const subscribers = await NewsletterSubscriber.findAll({ order: [['created_at', 'DESC']] });
  return R.success(res, 'Newsletter subscribers', subscribers);
};

exports.adminExport = async (req, res) => {
  const subscribers = await NewsletterSubscriber.findAll({ order: [['created_at', 'DESC']] });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Subscribers');
  sheet.columns = [
    { header: 'Email', key: 'email', width: 40 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Subscribed At', key: 'subscribed_at', width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  subscribers.forEach((s) => {
    sheet.addRow({
      email: s.email,
      status: s.status,
      subscribed_at: new Date(s.subscribed_at).toLocaleString('en-IN'),
    });
  });

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.xlsx"`,
  });
  await workbook.xlsx.write(res);
  res.end();
};
