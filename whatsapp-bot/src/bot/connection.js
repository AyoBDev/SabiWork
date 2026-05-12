// whatsapp-bot/src/bot/connection.js
import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import { getAuthState } from './authState.js';
import { handleMessage } from './messageHandler.js';

const logger = pino({ level: 'silent' });

let sock = null;

// Use pairing code for headless deployment (Railway)
// Set PAIRING_PHONE=234XXXXXXXXXX in env to use pairing code instead of QR
const PAIRING_PHONE = process.env.PAIRING_PHONE || '';

export async function startBot() {
  const { state, saveCreds } = await getAuthState();

  const usePairingCode = !!PAIRING_PHONE && !state.creds.registered;

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: !usePairingCode,
    logger,
    browser: usePairingCode ? ['Chrome (Linux)', '', ''] : ['SabiWork', 'Chrome', '4.0.0']
  });

  // Request pairing code for headless environments
  if (usePairingCode) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PAIRING_PHONE);
        console.log(`\n📱 PAIRING CODE: ${code}`);
        console.log(`   Enter this code in WhatsApp > Linked Devices > Link with Phone Number\n`);
      } catch (err) {
        console.error('Failed to request pairing code:', err.message);
      }
    }, 3000);
  }

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
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
