// whatsapp-bot/src/bot/authState.js
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { mkdir } from 'fs/promises';

export async function getAuthState() {
  await mkdir(config.sessionDir, { recursive: true });
  return useMultiFileAuthState(config.sessionDir);
}
