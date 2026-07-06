const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path}: ${err.message}`, { stack: err.stack });

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors?.map(e => ({ field: e.path, message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation error', errors });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ success: false, message: 'Related resource not found' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  const status = err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  return res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
