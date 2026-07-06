require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',

  DB: {
    URL: process.env.DATABASE_URL || null,
    HOST: process.env.DATABASE_HOST || 'localhost',
    PORT: parseInt(process.env.DATABASE_PORT) || 5432,
    NAME: process.env.DATABASE_NAME || 'tape_for_you_with_node',
    USER: process.env.DATABASE_USER || 'postgres',
    PASSWORD: process.env.DATABASE_PASSWORD || 'root',
  },

  JWT: {
    SECRET: process.env.JWT_SECRET,
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    ACCESS_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    REFRESH_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },

  COOKIE: {
    SECRET: process.env.COOKIE_SECRET,
  },

  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID,
    SECRET: process.env.RAZORPAY_SECRET,
  },

  SHIPROCKET: {
    EMAIL: process.env.SHIPROCKET_EMAIL,
    PASSWORD: process.env.SHIPROCKET_PASSWORD,
  },

  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT) || 587,
    EMAIL: process.env.SMTP_EMAIL,
    PASSWORD: process.env.SMTP_PASSWORD,
    FROM_NAME: process.env.SMTP_FROM_NAME || 'Tapes For You',
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@tapesforyou.in',
  },

  URLS: {
    BASE: process.env.BASE_URL || 'http://localhost:5000',
    FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
    ADMIN: process.env.ADMIN_URL || 'http://localhost:5173',
  },

  GST_PERCENT: parseFloat(process.env.GST_PERCENT) || 18,
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'src/uploads',

  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },
};

module.exports = env;
