#!/usr/bin/env node
// Run locally to pair WhatsApp and store session in the database.
// Usage: DATABASE_URL=postgres://... node pair-whatsapp.js
//
// This shows a QR code in the terminal. Scan it on your phone:
// WhatsApp > Linked Devices > Link a Device > Scan QR code
//
// Once paired, the session is saved to DB and the Railway bot can connect.

import makeWASocket, { fetchLatestBaileysVersion, DisconnectReason, initAuthCreds } from '@whiskeysockets/baileys';
import pino from 'pino';
import pg from 'pg';

const logger = pino({ level: 'silent' });
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required.');
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

// MUST match the bot's authState.js serialization exactly
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

let firstRun = true;

async function main() {
  console.log('🔗 SabiWork WhatsApp Pairing Tool\n');
  await ensureTable();

  if (firstRun) {
    await pool.query('DELETE FROM whatsapp_sessions');
    console.log('Cleared old sessions.\n');
    firstRun = false;
  }

  const existingCreds = await readData('creds');
  const creds = existingCreds || initAuthCreds();
  const { version } = await fetchLatestBaileysVersion({});
  console.log('Using WA version:', version.join('.'));

  const sock = makeWASocket({
    auth: {
      creds,
      keys: {
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
              const key = `${type}-${id}`;
              if (value) await writeData(key, value);
              else await removeData(key);
            }
          }
        }
      }
    },
    version,
    browser: ['SabiWork', 'Chrome', '4.0.0'],
    logger,
    qrTimeout: 60000,
  });

  sock.ev.on('creds.update', async (newCreds) => {
    Object.assign(creds, newCreds);
    await writeData('creds', creds);
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR code with WhatsApp:\n');
      console.log('WhatsApp > Linked Devices > Link a Device\n');
      try {
        const qrcode = await import('qrcode-terminal');
        (qrcode.default || qrcode).generate(qr, { small: true });
      } catch {
        console.log('QR string:', qr);
      }
      console.log('\nWaiting for scan...\n');
    }

    if (connection === 'open') {
      console.log('✅ Connected and paired successfully!');
      console.log('   Session saved to database.');
      console.log('   Restart the Railway bot service to connect.\n');
      await new Promise(r => setTimeout(r, 2000));
      await pool.end();
      process.exit(0);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.error('❌ Logged out. Run again.');
        process.exit(1);
      }
      console.log('\nQR expired. New one in 5 seconds...\n');
      setTimeout(() => main(), 5000);
    }
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
