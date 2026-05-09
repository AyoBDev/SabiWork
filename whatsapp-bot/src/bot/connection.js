// whatsapp-bot/src/bot/connection.js
import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import { getAuthState } from './authState.js';
import { handleMessage } from './messageHandler.js';

const logger = pino({ level: 'silent' });

let sock = null;

export async function startBot() {
  const { state, saveCreds } = await getAuthState();

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: true,
    logger,
    browser: ['SabiWork', 'Chrome', '4.0.0']
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR code with WhatsApp:\n');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Connection closed, reconnecting...');
        startBot();
      } else {
        console.log('Logged out. Delete auth_state folder and restart.');
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp bot connected!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const text = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || '';

      if (!text.trim()) continue;

      try {
        const reply = await handleMessage(phone, text.trim());
        if (reply) {
          await sock.sendMessage(msg.key.remoteJid, { text: reply });
        }
      } catch (err) {
        console.error(`Error handling message from ${phone}:`, err);
        await sock.sendMessage(msg.key.remoteJid, {
          text: '⚠️ Something went wrong. Try again shortly.'
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
