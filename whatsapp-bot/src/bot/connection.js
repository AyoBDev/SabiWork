// whatsapp-bot/src/bot/connection.js
import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import { getAuthState } from './authState.js';
import { handleMessage } from './messageHandler.js';
import { backendAPI } from '../services/api.js';

const logger = pino({ level: 'silent' });

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 5;

export async function startBot() {
  const { state, saveCreds } = await getAuthState();

  if (!state.creds.registered) {
    console.log('[WhatsApp] No session found in database.');
    console.log('[WhatsApp] Run: DATABASE_URL=... npm run pair');
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

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Logged out. Re-pair using: npm run pair');
        return;
      }

      if (reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++;
        const delay = Math.min(5000 * reconnectAttempts, 30000);
        console.log(`[WhatsApp] Connection closed, reconnecting in ${delay/1000}s (${reconnectAttempts}/${MAX_RECONNECTS})...`);
        setTimeout(() => startBot(), delay);
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

      try {
        // Handle voice notes
        if (msg.message.audioMessage) {
          const reply = await handleVoiceNote(msg, phone);
          if (reply) {
            await sock.sendMessage(msg.key.remoteJid, { text: reply });
          }
          continue;
        }

        // Handle text messages
        const text = msg.message.conversation
          || msg.message.extendedTextMessage?.text
          || '';

        if (!text.trim()) continue;

        const reply = await handleMessage(phone, text.trim(), pushName);
        if (reply) {
          await sock.sendMessage(msg.key.remoteJid, { text: reply });
        }
      } catch (err) {
        console.error(`Error handling message from ${phone}:`, err.message);
        await sock.sendMessage(msg.key.remoteJid, {
          text: 'Something went wrong. Try again shortly.'
        }).catch(() => {});
      }
    }
  });

  return sock;
}

async function handleVoiceNote(msg, phone) {
  const pushName = msg.pushName || '';

  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    const audioBase64 = buffer.toString('base64');

    const response = await backendAPI.chatWithAudio(audioBase64, {
      user_id: phone,
      user_type: 'unknown'
    });

    if (response.transcribed_text) {
      console.log(`[Voice] ${phone}: "${response.transcribed_text}"`);
    }

    if (response.message) {
      let reply = '';
      if (response.transcribed_text) {
        reply += `🎤 _"${response.transcribed_text}"_\n\n`;
      }
      reply += response.message;
      return reply;
    }

    // If backend responded but no message, process transcribed text as regular message
    if (response.transcribed_text) {
      const textReply = await handleMessage(phone, response.transcribed_text, pushName);
      return `🎤 _"${response.transcribed_text}"_\n\n${textReply}`;
    }

    return "🎤 I heard your voice note but couldn't understand it clearly. Try again or type your message.";
  } catch (err) {
    console.error(`[Voice] Error from ${phone}:`, err.message);
    return "🎤 Voice notes require the backend to be running for transcription. Please type your message instead.\n\nTry:\n• \"sold 5 bags rice 75000\"\n• \"I need a plumber\"\n• SCORE / READY / REPORT";
  }
}

export function getSocket() {
  return sock;
}

export async function sendMessage(phone, text) {
  if (!sock) return;
  const jid = `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
}
