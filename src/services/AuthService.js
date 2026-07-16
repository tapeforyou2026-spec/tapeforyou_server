const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const env = require('../config/env');
const { hashToken, generateToken } = require('../utils/crypto');
const { User, RefreshToken } = require('../models');
const UserRepository = require('../repositories/UserRepository');

class AuthService {
  generateAccessToken(payload) {
    return jwt.sign(payload, env.JWT.SECRET, { expiresIn: env.JWT.ACCESS_EXPIRY });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, env.JWT.REFRESH_SECRET, { expiresIn: env.JWT.REFRESH_EXPIRY });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, env.JWT.SECRET);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT.REFRESH_SECRET);
  }

  async issueTokens(user, deviceInfo = null, ipAddress = null) {
    const payload = { id: user.id, uuid: user.uuid, email: user.email, type: 'user' };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt, device_info: deviceInfo, ip_address: ipAddress });

    await User.update({ last_login: new Date() }, { where: { id: user.id } });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(oldRefreshToken, deviceInfo, ipAddress) {
    let decoded;
    try {
      decoded = this.verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new Error('Invalid refresh token');
    }

    const tokenHash = hashToken(oldRefreshToken);
    const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash, is_revoked: false } });

    if (!stored || stored.expires_at < new Date()) {
      throw new Error('Refresh token expired or revoked');
    }

    await stored.update({ is_revoked: true });

    const user = await UserRepository.findById(decoded.id);
    if (!user || user.status !== 'active') throw new Error('User inactive');

    return this.issueTokens(user, deviceInfo, ipAddress);
  }

  async revokeRefreshToken(token) {
    const tokenHash = hashToken(token);
    await RefreshToken.update({ is_revoked: true }, { where: { token_hash: tokenHash } });
  }

  async revokeAllUserTokens(userId) {
    await RefreshToken.update({ is_revoked: true }, { where: { user_id: userId, is_revoked: false } });
  }

  // "Sessions" reuses RefreshToken rather than a parallel model — every
  // login already creates one with device_info/ip_address (see issueTokens
  // above), so an active, non-expired, non-revoked row already *is* a
  // session. token_hash is never returned to the client.
  async listActiveSessions(userId) {
    const sessions = await RefreshToken.findAll({
      where: { user_id: userId, is_revoked: false, expires_at: { [Op.gt]: new Date() } },
      attributes: ['id', 'device_info', 'ip_address', 'created_at', 'expires_at'],
      order: [['created_at', 'DESC']],
    });
    return sessions;
  }

  async revokeSessionById(userId, sessionId) {
    const [count] = await RefreshToken.update(
      { is_revoked: true },
      { where: { id: sessionId, user_id: userId, is_revoked: false } }
    );
    return count > 0;
  }
}

module.exports = new AuthService();
