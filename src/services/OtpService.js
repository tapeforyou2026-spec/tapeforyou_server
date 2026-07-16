const { OTP } = require('../models');
const { Op } = require('sequelize');
const { generateOTP, hashToken } = require('../utils/crypto');
const SmsService = require('./SmsService');

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

class OtpService {
  async send(user, purpose) {
    const lastOtp = await OTP.findOne({
      where: { user_id: user.id, purpose },
      order: [['created_at', 'DESC']],
    });

    if (lastOtp && Date.now() - new Date(lastOtp.created_at).getTime() < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(lastOtp.created_at).getTime())) / 1000);
      const err = new Error(`Please wait ${waitSeconds}s before requesting another OTP`);
      err.statusCode = 429;
      throw err;
    }

    const otp = generateOTP(6);
    await OTP.create({
      user_id: user.id,
      phone: user.phone,
      otp_hash: hashToken(otp),
      purpose,
      expires_at: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    await SmsService.sendOTP(user.phone, otp, purpose);
  }

  // Returns true/false rather than throwing on a wrong OTP, so the caller
  // can return a normal 400 without treating it as a server error. Throws
  // only for the "too many attempts" case, which invalidates the OTP.
  async verify(userId, otp, purpose) {
    const record = await OTP.findOne({
      where: { user_id: userId, purpose, is_used: false, expires_at: { [Op.gt]: new Date() } },
      order: [['created_at', 'DESC']],
    });

    if (!record) return false;

    if (record.attempts >= MAX_ATTEMPTS) {
      await record.update({ is_used: true });
      const err = new Error('Too many incorrect attempts. Please request a new OTP.');
      err.statusCode = 429;
      throw err;
    }

    if (record.otp_hash !== hashToken(otp)) {
      await record.increment('attempts');
      return false;
    }

    await record.update({ is_used: true });
    return true;
  }
}

module.exports = new OtpService();
