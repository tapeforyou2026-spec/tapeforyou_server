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

  // Bigship Direct — replaces Shiprocket as the active courier integration.
  // See src/services/bigship/claude.md for the full integration guide.
  BIGSHIP: {
    EMAIL: process.env.BIGSHIP_EMAIL,
    PASSWORD: process.env.BIGSHIP_PASSWORD,
    ACCESS_KEY: process.env.BIGSHIP_ACCESS_KEY,
    WAREHOUSE_ID: process.env.BIGSHIP_WAREHOUSE_ID || null,
  },

  // smsjust.com — no live credentials yet, SmsService runs in demo mode
  // (logs the OTP instead of sending) until these are set. See SmsService.js.
  SMSJUST: {
    API_KEY: process.env.SMSJUST_API_KEY || null,
    SENDER_ID: process.env.SMSJUST_SENDER_ID || null,
  },

  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT) || 587,
    EMAIL: process.env.SMTP_EMAIL,
    PASSWORD: process.env.SMTP_PASSWORD,
    FROM_NAME: process.env.SMTP_FROM_NAME || 'Tapes For You',
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@tapesforyou.in',
  },

  // URLS: {
  //   BASE: process.env.BASE_URL || 'http://localhost:5000',
  //   FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
  //   ADMIN: process.env.ADMIN_URL || 'http://localhost:5173',
  // },
  URLS: {
    BASE: process.env.BASE_URL || 'http://localhost:5000',
    FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
    ADMIN: process.env.ADMIN_URL || 'http://localhost:5174,https://tapeforyou-admin.vercel.app',
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
