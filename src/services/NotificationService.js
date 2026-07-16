const logger = require('../utils/logger');

// Admin-facing notifications reuse the existing `Notification` model
// (`user_id` was already nullable) rather than a new table — a row with
// `user_id: null` means "not tied to one customer, shown on the admin
// dashboard bell". Deliberately never throws: a notification failing to
// write must never block the real action (an order being placed, a payment
// being captured, etc.) that triggered it.
class NotificationService {
  async notifyAdmins({ type, title, body, data }) {
    try {
      const { Notification } = require('../models');
      await Notification.create({ user_id: null, type, title, body, data: data || null });
    } catch (err) {
      logger.error(`Failed to create admin notification (${type}): ${err.message}`);
    }
  }
}

module.exports = new NotificationService();
