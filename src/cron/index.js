const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const BigshipService = require('../services/bigship/BigshipService');
const { SHIPMENT_STATUS } = require('../constants');

const TERMINAL_SHIPMENT_STATUSES = [SHIPMENT_STATUS.DELIVERED, SHIPMENT_STATUS.FAILED, SHIPMENT_STATUS.RETURNED];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startCronJobs(models) {
  const { RefreshToken, Coupon, Shipment } = models;

  // Every day at 2 AM — purge expired/revoked refresh tokens older than 8 days
  cron.schedule('0 2 * * *', async () => {
    try {
      const deleted = await RefreshToken.destroy({
        where: {
          [Op.or]: [
            { is_revoked: true, updated_at: { [Op.lt]: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } },
            { expires_at: { [Op.lt]: new Date() } },
          ],
        },
      });
      if (deleted > 0) logger.info(`Cron: purged ${deleted} expired refresh tokens`);
    } catch (err) {
      logger.error('Cron refresh token cleanup error:', err);
    }
  });

  // Every hour — mark expired coupons as inactive
  cron.schedule('0 * * * *', async () => {
    try {
      const updated = await Coupon.update(
        { is_active: false },
        { where: { expires_at: { [Op.lt]: new Date() }, is_active: true } }
      );
      if (updated[0] > 0) logger.info(`Cron: deactivated ${updated[0]} expired coupons`);
    } catch (err) {
      logger.error('Cron coupon expiry error:', err);
    }
  });

  // Every 30 minutes — pull live status for every non-terminal Bigship
  // shipment. No webhooks exist in Bigship's documented API (see
  // services/bigship/claude.md "Shipment Flow / Tracking Flow"), so polling
  // is the only way `Shipment.status` ever advances past 'booked' without an
  // admin manually clicking "Refresh Tracking" on each order individually.
  // Sequential with a short delay between calls, not Promise.all — Bigship
  // rate-limits at 100 req/min/IP and this project's order volume doesn't
  // need parallelism to finish well within 30 minutes.
  cron.schedule('*/30 * * * *', async () => {
    let shipments;
    try {
      shipments = await Shipment.findAll({
        where: {
          bigship_custom_order_id: { [Op.ne]: null },
          status: { [Op.notIn]: TERMINAL_SHIPMENT_STATUSES },
        },
      });
    } catch (err) {
      logger.error(`Cron tracking-sync lookup error: ${err.message}`);
      return;
    }

    if (!shipments.length) return;

    let synced = 0;
    for (const shipment of shipments) {
      try {
        await BigshipService.syncShipmentStatus(shipment);
        synced += 1;
      } catch (err) {
        logger.error(`Cron tracking-sync failed for shipment #${shipment.id} (${shipment.bigship_custom_order_id}): ${err.message}`);
      }
      await sleep(1000);
    }
    logger.info(`Cron: tracking-sync checked ${shipments.length} shipment(s), updated ${synced}`);
  });

  logger.info('Cron jobs started');
}

module.exports = startCronJobs;
