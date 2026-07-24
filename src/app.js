require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const logger = require('./utils/logger');
const { general: generalLimit, publicCatalog: publicCatalogLimit } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
// Both FRONTEND_URL and ADMIN_URL support comma-separated multiple origins
// (e.g. "http://localhost:3000,http://localhost:3001") — FRONTEND_URL was
// previously used as one raw string here, so setting it to a comma-joined
// value (matching ADMIN_URL's already-supported format) made every real
// browser Origin header fail to match, breaking CORS for all frontend ports.
const allowedOrigins = [
  ...env.URLS.FRONTEND.split(',').map((s) => s.trim()),
  ...env.URLS.ADMIN.split(',').map((s) => s.trim()),
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE.SECRET));

// Compression
app.use(compression());

// Logging
if (env.IS_DEVELOPMENT) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === '/health',
  }));
}

// Rate limiting
app.use('/api', generalLimit);
app.use('/api/v1/products', publicCatalogLimit);
app.use('/api/v1/categories', publicCatalogLimit);

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'src/uploads')));
app.use('/public', express.static(path.join(process.cwd(), 'src/public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

// API Routes
app.use('/api/v1', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use(errorHandler);

module.exports = app;
