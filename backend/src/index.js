// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const config = require('./config');

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sabiwork-backend', timestamp: new Date().toISOString() });
});

// API routes (to be added in Plan 5)
app.get('/api', (req, res) => {
  res.json({ message: 'SabiWork API v1.0', routes: [] });
});

// Start server
server.listen(config.port, () => {
  console.log(`SabiWork backend running on port ${config.port}`);
});

module.exports = { app, server };
