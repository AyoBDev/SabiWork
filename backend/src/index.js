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

// Route index
app.get('/api', (req, res) => {
  res.json({
    message: 'SabiWork API v1.0',
    routes: [
      'POST /api/payments/initiate',
      'GET /api/payments/verify/:ref',
      'POST /api/payments/payout',
      'POST /api/webhooks/squad',
      'WS /dashboard/feed'
    ]
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`SabiWork backend running on port ${config.port}`);
  console.log(`WebSocket feed available at ws://localhost:${config.port}/dashboard/feed`);
});

module.exports = { app, server };
