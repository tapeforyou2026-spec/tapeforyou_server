const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const env = require('../config/env');

const logDir = path.join(process.cwd(), 'src/logs');

const formats = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    stack ? `[${timestamp}] ${level}: ${message}\n${stack}` : `[${timestamp}] ${level}: ${message}`
  )
);

const transports = [
  new winston.transports.Console({
    level: env.IS_PRODUCTION ? 'warn' : 'debug',
    format: consoleFormat,
  }),
  new DailyRotateFile({
    level: 'error',
    dirname: logDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    format: formats,
  }),
  new DailyRotateFile({
    level: 'info',
    dirname: logDir,
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    format: formats,
  }),
];

const logger = winston.createLogger({
  level: env.IS_PRODUCTION ? 'info' : 'debug',
  format: formats,
  transports,
  exceptionHandlers: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
});

module.exports = logger;
