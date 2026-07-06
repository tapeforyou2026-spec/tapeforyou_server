const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP.HOST,
      port: env.SMTP.PORT,
      secure: env.SMTP.PORT === 465,
      auth: { user: env.SMTP.EMAIL, pass: env.SMTP.PASSWORD },
    });
  }

  async send({ to, subject, html, text }) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${env.SMTP.FROM_NAME}" <${env.SMTP.FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (err) {
      logger.error(`Email failed to ${to}:`, err.message);
      throw err;
    }
  }

  async sendWelcome(user) {
    await this.send({
      to: user.email,
      subject: 'Welcome to Tapes For You!',
      html: `<h2>Welcome, ${user.name}!</h2><p>Thanks for registering at <strong>Tapes For You</strong>.</p><p>Start shopping premium quality tapes at <a href="${env.URLS.FRONTEND}">tapesforyou.in</a></p>`,
    });
  }

  async sendEmailVerification(user, token) {
    const link = `${env.URLS.FRONTEND}/verify-email?token=${token}`;
    await this.send({
      to: user.email,
      subject: 'Verify Your Email — Tapes For You',
      html: `<h2>Hello ${user.name},</h2><p>Click the link below to verify your email address:</p><p><a href="${link}" style="background:#0B8B87;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a></p><p>Link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordReset(user, token) {
    const link = `${env.URLS.FRONTEND}/reset-password?token=${token}`;
    await this.send({
      to: user.email,
      subject: 'Reset Your Password — Tapes For You',
      html: `<h2>Hello ${user.name},</h2><p>You requested a password reset. Click the button below:</p><p><a href="${link}" style="background:#0B8B87;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    });
  }

  async sendOrderConfirmation(user, order) {
    await this.send({
      to: user.email,
      subject: `Order Confirmed #${order.order_number} — Tapes For You`,
      html: `<h2>Hi ${user.name},</h2><p>Your order <strong>#${order.order_number}</strong> has been placed successfully!</p><p><strong>Total: ₹${order.total}</strong></p><p>We'll notify you once it ships.</p><p><a href="${env.URLS.FRONTEND}/orders/${order.id}">View Order</a></p>`,
    });
  }

  async sendShipmentUpdate(user, order, shipment) {
    await this.send({
      to: user.email,
      subject: `Order Shipped #${order.order_number} — Tapes For You`,
      html: `<h2>Hi ${user.name},</h2><p>Your order <strong>#${order.order_number}</strong> has been shipped!</p><p>AWB: <strong>${shipment.awb_code}</strong></p>${shipment.tracking_url ? `<p><a href="${shipment.tracking_url}">Track Your Shipment</a></p>` : ''}`,
    });
  }
}

module.exports = new EmailService();
