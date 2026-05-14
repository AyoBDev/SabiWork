// whatsapp-bot/src/bot/connection.js
import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import { getAuthState } from './authState.js';
import { handleMessage } from './messageHandler.js';

const logger = pino({ level: 'silent' });

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 5;

export async function startBot() {
  const { state, saveCreds } = await getAuthState();

  // If no registered creds, wait — pair locally using pair-whatsapp.js
  if (!state.creds.registered) {
    console.log('[WhatsApp] No session found in database.');
    console.log('[WhatsApp] Run pair-whatsapp.js locally to pair and push session to DB.');
    console.log('[WhatsApp] Will retry in 30s...');
    setTimeout(() => startBot(), 30000);
    return;
  }

  console.log('[WhatsApp] Found stored session, connecting...');

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    logger,
    browser: ['SabiWork', 'Chrome', '4.0.0']
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Logged out. Re-pair using pair-whatsapp.js locally.');
        return;
      }

      if (reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++;
        console.log(`[WhatsApp] Connection closed, reconnecting (${reconnectAttempts}/${MAX_RECONNECTS})...`);
        setTimeout(() => startBot(), 5000);
      } else {
        console.log('[WhatsApp] Max reconnect attempts reached. Will retry in 60s.');
        reconnectAttempts = 0;
        setTimeout(() => startBot(), 60000);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('✅ WhatsApp bot connected!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;

      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg.pushName || '';
      const text = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || '';

      if (!text.trim()) continue;

      try {
        const reply = await handleMessage(phone, text.trim(), pushName);
        if (reply) {
          await sock.sendMessage(msg.key.remoteJid, { text: reply });
        }
      } catch (err) {
        console.error(`Error handling message from ${phone}:`, err);
        await sock.sendMessage(msg.key.remoteJid, {
          text: 'Something went wrong. Try again shortly.'
        });
      }
    }
  });

  return sock;
}

export function getSocket() {
  return sock;
}

export async function sendMessage(phone, text) {
  if (!sock) return;
  const jid = `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
}
