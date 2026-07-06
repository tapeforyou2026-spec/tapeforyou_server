const { ActivityLog } = require('../models');
const logger = require('../utils/logger');

const log = (action, model = null) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      try {
        await ActivityLog.create({
          actor_id: req.admin?.id || req.user?.id || null,
          actor_type: req.admin ? 'admin' : 'user',
          action,
          model,
          model_id: req.params.id || null,
          description: `${req.method} ${req.path}`,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
      } catch (err) {
        logger.error('ActivityLog error:', err.message);
      }
    }
  });
  next();
};

module.exports = log;
