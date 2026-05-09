// backend/src/utils/websocket.js
const WebSocket = require('ws');
const Redis = require('ioredis');
const config = require('../config');

let wss = null;
let subscriber = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/dashboard/feed' });

  wss.on('connection', (ws) => {
    console.log('Dashboard client connected');

    ws.on('close', () => {
      console.log('Dashboard client disconnected');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to SabiWork live feed',
      timestamp: new Date().toISOString()
    }));
  });

  subscriber = new Redis(config.redisUrl);

  subscriber.subscribe('dashboard_events', (err) => {
    if (err) {
      console.error('Redis subscribe error:', err);
      return;
    }
    console.log('WebSocket subscribed to dashboard_events channel');
  });

  subscriber.on('message', (channel, message) => {
    if (channel === 'dashboard_events') {
      broadcast(message);
    }
  });

  console.log('WebSocket server initialized at /dashboard/feed');
}

function broadcast(data) {
  if (!wss) return;

  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastEvent(event) {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });
  broadcast(payload);
}

function getClientCount() {
  if (!wss) return 0;
  return wss.clients.size;
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastEvent,
  getClientCount
};
