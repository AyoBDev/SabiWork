// backend/src/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { startWhatsApp, getStatus, disconnect, clearSession, sendMessage } = require('../services/whatsapp');

// GET /api/whatsapp/status — check connection status + QR code
router.get('/status', (req, res) => {
  const { status, qr } = getStatus();
  res.json({ status, qr });
});

// POST /api/whatsapp/start — start WhatsApp connection (generates QR)
router.post('/start', async (req, res) => {
  try {
    const { status } = getStatus();
    if (status === 'open') {
      return res.json({ message: 'WhatsApp already connected', status: 'open' });
    }
    if (status === 'connecting' || status === 'qr_ready') {
      return res.json({ message: 'WhatsApp connection in progress', status });
    }

    startWhatsApp().catch(err => {
      console.error('[WhatsApp Route] Start error:', err.message);
    });

    res.json({ message: 'WhatsApp connection initiated. Poll /status for QR code.', status: 'connecting' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/disconnect — disconnect WhatsApp
router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ message: 'WhatsApp disconnected', status: 'disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/clear-session — clear stored session (for re-pairing)
router.post('/clear-session', async (req, res) => {
  try {
    await disconnect();
    await clearSession();
    res.json({ message: 'Session cleared. Start again to get a new QR code.', status: 'disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/send — send a message to a phone number
router.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }
    await sendMessage(phone, message);
    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
