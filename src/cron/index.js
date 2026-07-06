const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

function startCronJobs(models) {
  const { RefreshToken, Coupon } = models;

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

  logger.info('Cron jobs started');
}

module.exports = startCronJobs;
