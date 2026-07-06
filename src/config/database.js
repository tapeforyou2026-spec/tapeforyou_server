const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const commonOptions = {
  dialect: 'postgres',
  logging: env.IS_DEVELOPMENT ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: false,
  },
};

const sequelize = env.DB.URL
  ? new Sequelize(env.DB.URL, commonOptions)
  : new Sequelize(env.DB.NAME, env.DB.USER, env.DB.PASSWORD, {
      host: env.DB.HOST,
      port: env.DB.PORT,
      ...commonOptions,
    });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
