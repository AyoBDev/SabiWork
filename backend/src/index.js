// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const config = require('./config');
const { initWebSocket } = require('./utils/websocket');

const app = express();
const server = createServer(app);

// Initialize WebSocket server
initWebSocket(server);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const { getClientCount } = require('./utils/websocket');
  res.json({
    status: 'ok',
    service: 'sabiwork-backend',
    timestamp: new Date().toISOString(),
    dashboard_clients: getClientCount()
  });
});

// API routes
app.use('/api/payments', require('./routes/payments'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/traders', require('./routes/traders'));
app.use('/api/seekers', require('./routes/seekers'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/invest', require('./routes/invest'));
app.use('/api/demo', require('./routes/demo'));

// Route index
app.get('/api', (req, res) => {
  res.json({
    message: 'SabiWork API v1.0',
    routes: [
      'POST   /api/chat',
      'POST   /api/payments/initiate',
      'GET    /api/payments/verify/:ref',
      'POST   /api/payments/payout',
      'POST   /api/webhooks/squad',
      'POST   /api/workers/onboard',
      'GET    /api/workers',
      'GET    /api/workers/:id',
      'PATCH  /api/workers/:id/availability',
      'PATCH  /api/workers/:id/location',
      'POST   /api/traders/register',
      'POST   /api/traders/log-sale',
      'GET    /api/traders/report',
      'POST   /api/seekers/register',
      'GET    /api/seekers',
      'GET    /api/seekers/:id/pathway',
      'POST   /api/seekers/:id/apply',
      'POST   /api/jobs/:id/complete',
      'GET    /api/jobs/:id',
      'GET    /api/intelligence/stats',
      'GET    /api/intelligence/gaps',
      'GET    /api/intelligence/demand-heat',
      'GET    /api/intelligence/channels',
      'GET    /api/intelligence/forecast',
      'GET    /api/intelligence/financial-inclusion',
      'GET    /api/intelligence/pathway',
      'WS     /dashboard/feed'
    ]
  });
});

// Start server — bind to 0.0.0.0 for Railway/container deployments
server.listen(config.port, '0.0.0.0', () => {
  console.log(`SabiWork backend running on port ${config.port}`);
  console.log(`WebSocket feed available at ws://0.0.0.0:${config.port}/dashboard/feed`);
  console.log(`API index at http://0.0.0.0:${config.port}/api`);
});

module.exports = { app, server };
