const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class SmsService {
  // Demo mode (no SMSJUST_API_KEY set): logs the OTP instead of sending a
  // real SMS, so the OTP flow is fully testable before smsjust.com
  // credentials + DLT registration are in place. Once SMSJUST_API_KEY and
  // SMSJUST_SENDER_ID are set, this switches to the real HTTP call below —
  // verify the exact endpoint/params against smsjust.com's API docs before
  // relying on it in production, this is a best-effort template.
  async send(phone, message) {
    if (!env.SMSJUST.API_KEY) {
      logger.info(`[SmsService demo mode] Would send to +91${phone}: ${message}`);
      return { demo: true };
    }

    try {
      const { data } = await axios.get('https://www.smsjust.com/blank/sms/user/urlsms.php', {
        params: {
          username: env.SMSJUST.API_KEY,
          senderid: env.SMSJUST.SENDER_ID,
          mobile: phone,
          message,
        },
      });
      logger.info(`SMS sent to ${phone}`);
      return data;
    } catch (err) {
      logger.error(`SMS failed to ${phone}:`, err.message);
      throw err;
    }
  }

  async sendOTP(phone, otp, purpose) {
    const action = purpose === 'reset_password' ? 'reset your password' : 'verify your mobile number';
    return this.send(phone, `${otp} is your OTP to ${action} on Tapes For You. Valid for 5 minutes. Do not share this code.`);
  }
}

module.exports = new SmsService();
