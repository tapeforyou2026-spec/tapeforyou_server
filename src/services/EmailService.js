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

  // Shared wrapper so every transactional email shares the same header/footer
  // instead of each method hand-rolling its own layout.
  wrapTemplate(bodyHtml) {
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f6;padding:32px 16px;">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
          <div style="background:#0B8B87;padding:20px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">TAPES FOR YOU</span>
          </div>
          <div style="padding:32px;color:#1a1a1a;">
            ${bodyHtml}
          </div>
          <div style="padding:20px 32px;background:#f4f6f6;color:#8a8a8a;font-size:12px;">
            <p style="margin:0;">Tapes For You &mdash; Premium Adhesive Tapes</p>
            <p style="margin:4px 0 0;">If you didn't expect this email, you can safely ignore it.</p>
          </div>
        </div>
      </div>
    `;
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
      logger.error(`Email failed to ${to}: ${err.message}`);
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
      html: this.wrapTemplate(`
        <h2 style="margin:0 0 12px;font-size:20px;">Hello ${user.name},</h2>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">Thanks for registering at Tapes For You. Please verify your email address to activate your account and sign in.</p>
        <p style="margin:0 0 20px;"><a href="${link}" style="background:#0B8B87;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Verify Email</a></p>
        <p style="margin:0;font-size:12px;color:#6b6b6b;">This link expires in 24 hours and can only be used once. If the button doesn't work, copy this link into your browser:<br>${link}</p>
      `),
    });
  }

  async sendPasswordReset(user, token) {
    const link = `${env.URLS.FRONTEND}/reset-password?token=${token}`;
    await this.send({
      to: user.email,
      subject: 'Reset Your Password — Tapes For You',
      html: this.wrapTemplate(`
        <h2 style="margin:0 0 12px;font-size:20px;">Hello ${user.name},</h2>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one.</p>
        <p style="margin:0 0 20px;"><a href="${link}" style="background:#0B8B87;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Reset Password</a></p>
        <p style="margin:0;font-size:12px;color:#6b6b6b;">This link expires in 30 minutes and can only be used once. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      `),
    });
  }

  async sendOrderConfirmation(user, order) {
    await this.send({
      to: user.email,
      subject: `Order Confirmed #${order.order_number} — Tapes For You`,
      html: `<h2>Hi ${user.name},</h2><p>Your order <strong>#${order.order_number}</strong> has been placed successfully!</p><p><strong>Total: ₹${order.total}</strong></p><p>We'll notify you once it ships.</p><p><a href="${env.URLS.FRONTEND}/orders/${order.id}">View Order</a></p>`,
    });
  }

  async sendNewsletterWelcome(email) {
    await this.send({
      to: email,
      subject: "You're Subscribed! — Tapes For You",
      html: this.wrapTemplate(`
        <h2 style="margin:0 0 12px;font-size:20px;">You&rsquo;re on the list! 🎉</h2>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">Thanks for subscribing to the Tapes For You newsletter. You&rsquo;ll now get first access to exclusive deals, new arrivals, and restock alerts straight to your inbox.</p>
        <p style="margin:0 0 20px;"><a href="${env.URLS.FRONTEND}/shop" style="background:#0B8B87;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Start Shopping</a></p>
        <p style="margin:0;font-size:12px;color:#6b6b6b;">Didn&rsquo;t sign up for this? You can safely ignore this email — no further messages will be sent unless you subscribe.</p>
      `),
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
