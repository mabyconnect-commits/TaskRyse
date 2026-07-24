const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./lib/config');
const { authenticate } = require('./middleware/authenticate');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const setupRoutes = require('./routes/setup');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const planRoutes = require('./routes/plans');
const marketplaceRoutes = require('./routes/marketplace');
const workspaceRoutes = require('./routes/workspace');
const reviewRoutes = require('./routes/review');
const walletRoutes = require('./routes/wallet');
const growthRoutes = require('./routes/growth');
const businessRoutes = require('./routes/business');
const supportRoutes = require('./routes/support');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  if (config.isDev) app.use(morgan('dev'));

  // Health check (unauthenticated).
  app.get('/health', (req, res) => res.json({ ok: true, service: 'taskryse-api' }));

  const api = express.Router();

  // Public one-time DB setup (key-gated). Mounted before auth.
  api.use('/', setupRoutes);
  // Public auth/onboarding routes.
  api.use('/auth', authRoutes);
  // Public plan catalogue + coupon validation (subscriptions inside authenticate themselves).
  api.use('/', planRoutes);

  // Everything past here requires a valid Bearer token.
  api.use(authenticate);
  api.use('/', accountRoutes);
  api.use('/', marketplaceRoutes);
  api.use('/', workspaceRoutes);
  api.use('/', reviewRoutes);
  api.use('/', walletRoutes);
  api.use('/', growthRoutes);
  api.use('/', businessRoutes);
  api.use('/', supportRoutes);
  api.use('/admin', adminRoutes);

  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
