const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

// Real, confirmed smsjust.com endpoint + param names (provided directly by
// the account owner, not guessed from generic gateway conventions like the
// earlier version of this file was — that guess used the wrong path
// (/blank/sms/...) and wrong param names (username/mobile instead of the
// real username+pass pair/dest_mobileno)). GET request, plain query string.
const SMSJUST_URL = 'https://www.smsjust.com/sms/user/urlsms.php';

// DLT-registered template text (must match on file with the telecom
// operator's DLT registrar *exactly* except for the {#var#} substitutions,
// or the carrier silently drops the message) — sender ID RICHSL.
// var1 = recipient's name (falls back to "Customer" when unknown), var2 =
// the OTP itself.
function buildOtpMessage(name, otp) {
  return `Dear ${name || 'Customer'} Your OTP is : ${otp}. Rich Solutions`;
}

class SmsService {
  // Demo mode (no SMSJUST_USERNAME set): logs the OTP instead of sending a
  // real SMS. Kept so the OTP flow (send → cooldown → verify → attempts-
  // exhausted) stays fully testable without spending real SMS credits.
  async send(phone, message) {
    if (!env.SMSJUST.USERNAME) {
      logger.info(`[SmsService demo mode] Would send to +91${phone}: ${message}`);
      return { demo: true };
    }

    try {
      const { data } = await axios.get(SMSJUST_URL, {
        params: {
          username: env.SMSJUST.USERNAME,
          pass: env.SMSJUST.PASSWORD,
          senderid: env.SMSJUST.SENDER_ID,
          dest_mobileno: phone,
          msgtype: 'TXT',
          message,
          response: 'Y',
        },
      });
      logger.info(`SMS sent to ${phone}: ${JSON.stringify(data)}`);
      return data;
    } catch (err) {
      // Interpolated directly into the message string, not passed as a
      // second argument — winston's console formatter here only destructures
      // {timestamp, level, message, stack} from the log call, so a second
      // positional arg is silently dropped (the exact bug already found and
      // fixed in EmailService.send(); same fix applies here).
      logger.error(`SMS failed to ${phone}: ${err.message}`);
      throw err;
    }
  }

  async sendOTP(phone, otp, purpose, name) {
    return this.send(phone, buildOtpMessage(name, otp));
  }
}

module.exports = new SmsService();
