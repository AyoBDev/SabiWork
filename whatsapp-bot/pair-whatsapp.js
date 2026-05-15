#!/usr/bin/env node
// Run locally to pair WhatsApp and store session in the database.
// Usage: DATABASE_URL=postgres://... node pair-whatsapp.js
//
// This shows a pairing code in the terminal. Enter it on your phone:
// WhatsApp > Linked Devices > Link a Device > Link with phone number
//
// Once paired, the session is saved to DB and the Railway bot can connect.

import makeWASocket, { makeCacheableSignalKeyStore, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import pg from 'pg';
import readline from 'readline';

const logger = pino({ level: 'silent' });
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required. Set it as an environment variable.');
  console.error('   Example: DATABASE_URL=postgres://user:pass@host:5432/db node pair-whatsapp.js');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function writeData(key, data) {
  const serialized = JSON.stringify(data, (k, v) => {
    if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
      return { type: 'Buffer', data: Array.from(v) };
    }
    return v;
  });
  await pool.query(
    `INSERT INTO whatsapp_sessions (key, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = NOW()`,
    [key, serialized]
  );
}

async function readData(key) {
  const result = await pool.query('SELECT data FROM whatsapp_sessions WHERE key = $1', [key]);
  if (result.rows.length === 0) return null;
  const raw = result.rows[0].data;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return JSON.parse(JSON.stringify(parsed), (k, v) => {
    if (v && typeof v === 'object' && v.type === 'Buffer' && Array.isArray(v.data)) {
      return Buffer.from(v.data);
    }
    return v;
  });
}

async function removeData(key) {
  await pool.query('DELETE FROM whatsapp_sessions WHERE key = $1', [key]);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(r => rl.question(q, r)); }

async function main() {
  console.log('🔗 SabiWork WhatsApp Pairing Tool\n');
  await ensureTable();

  // Check existing session
  const existing = await readData('creds');
  if (existing && existing.registered) {
    const answer = await ask('⚠️  Session already exists in DB. Overwrite? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Exiting.');
      process.exit(0);
    }
    await pool.query('DELETE FROM whatsapp_sessions');
    console.log('Cleared old session.\n');
  }

  const phoneNumber = await ask('Enter your WhatsApp phone number (with country code, e.g., 2348012345678): ');
  rl.close();

  if (!phoneNumber || phoneNumber.length < 10) {
    console.error('Invalid phone number.');
    process.exit(1);
  }

  let creds = null;

  const sock = makeWASocket({
    auth: {
      creds: (await import('@whiskeysockets/baileys')).initAuthCreds(),
      keys: makeCacheableSignalKeyStore({
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            const value = await readData(`${type}-${id}`);
            if (value) result[id] = value;
          }
          return result;
        },
        set: async (data) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) await writeData(`${type}-${id}`, value);
              else await removeData(`${type}-${id}`);
            }
          }
        }
      }, logger)
    },
    printQRInTerminal: false,
    logger,
    browser: ['SabiWork', 'Chrome', '4.0.0']
  });

  sock.ev.on('creds.update', async (newCreds) => {
    creds = { ...creds, ...newCreds };
    await writeData('creds', creds);
  });

  // Request pairing code
  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
      console.log(`\n📱 Pairing code: ${code}\n`);
      console.log('Enter this code on your phone:');
      console.log('WhatsApp > Linked Devices > Link a Device > Link with phone number\n');
      console.log('Waiting for connection...\n');
    } catch (err) {
      console.error('Failed to get pairing code:', err.message);
      process.exit(1);
    }
  }, 3000);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('✅ Connected and paired successfully!');
      console.log('   Session saved to database.');
      console.log('   The Railway bot will pick it up on next restart.\n');
      await new Promise(r => setTimeout(r, 2000));
      process.exit(0);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.error('❌ Logged out. Try again.');
      } else {
        console.error('❌ Connection closed unexpectedly:', lastDisconnect?.error?.message);
      }
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
