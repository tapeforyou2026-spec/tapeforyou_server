const app = require('./app');
const { connectDB } = require('./config/database');
const env = require('./config/env');
const logger = require('./utils/logger');
const startCronJobs = require('./cron');
const models = require('./models');

const start = async () => {
  await connectDB();
  startCronJobs(models);

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`API: http://localhost:${env.PORT}/api/v1`);
    logger.info(`Health: http://localhost:${env.PORT}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Kill the process holding it and restart.`);
    } else {
      logger.error('Server error:', err);
    }
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down');
    server.close(() => process.exit(0));
  });
};

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
