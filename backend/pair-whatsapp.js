#!/usr/bin/env node
// backend/pair-whatsapp.js
// Run locally to pair WhatsApp, saves session directly to Railway DB
//
// Usage:
//   node pair-whatsapp.js "postgresql://user:pass@host:port/db?sslmode=require"
//
// After scanning the QR, the session is stored in the remote DB.
// Railway will auto-connect on next deploy without needing a QR again.

const { default: makeWASocket, DisconnectReason, makeCacheableSignalKeyStore, initAuthCreds } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const knexLib = require('knex');

const DB_URL = process.argv[2];

if (!DB_URL) {
  console.error('\n  Usage: node pair-whatsapp.js <RAILWAY_DATABASE_URL>\n');
  console.error('  Get your Railway DB URL from the Railway dashboard:');
  console.error('  Project → Postgres service → Variables → DATABASE_URL\n');
  process.exit(1);
}

console.log('[Pair] Connecting to remote database...');

const knex = knexLib({
  client: 'pg',
  connection: {
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  }
});

// Ensure table exists
async function ensureTable() {
  const exists = await knex.schema.hasTable('whatsapp_sessions');
  if (!exists) {
    await knex.schema.createTable('whatsapp_sessions', (table) => {
      table.string('key').primary();
      table.jsonb('data').notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('[Pair] Created whatsapp_sessions table');
  }
}

// DB auth state (same as service but using our direct knex connection)
async function useDBAuthState() {
  const writeData = async (key, data) => {
    const serialized = JSON.stringify(data, (k, v) => {
      if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
        return { type: 'Buffer', data: Array.from(v) };
      }
      return v;
    });
    await knex('whatsapp_sessions')
      .insert({ key, data: serialized, updated_at: new Date() })
      .onConflict('key')
      .merge();
  };

  const readData = async (key) => {
    const row = await knex('whatsapp_sessions').where({ key }).first();
    if (!row) return null;
    const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return JSON.parse(JSON.stringify(parsed), (k, v) => {
      if (v && typeof v === 'object' && v.type === 'Buffer' && Array.isArray(v.data)) {
        return Buffer.from(v.data);
      }
      return v;
    });
  };

  const removeData = async (key) => {
    await knex('whatsapp_sessions').where({ key }).del();
  };

  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
  }

  return {
    state: {
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
              if (value) {
                await writeData(`${type}-${id}`, value);
              } else {
                await removeData(`${type}-${id}`);
              }
            }
          }
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    }
  };
}

async function main() {
  await ensureTable();
  console.log('[Pair] Database ready. Starting WhatsApp pairing...\n');

  const { state, saveCreds } = await useDBAuthState();

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, { trace() {}, debug() {} })
    },
    printQRInTerminal: false,
    browser: ['SabiWork', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n  Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n  Waiting for scan...\n');
    }

    if (connection === 'open') {
      console.log('\n  ✓ WhatsApp paired successfully!');
      console.log('  ✓ Session saved to Railway database.');
      console.log('  ✓ Deploy to Railway — bot will auto-connect.\n');

      // Keep alive briefly to ensure all keys are saved
      setTimeout(async () => {
        await sock.end();
        await knex.destroy();
        process.exit(0);
      }, 3000);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.error('\n  ✗ Logged out. Clear session and try again.\n');
        await knex.destroy();
        process.exit(1);
      }
      // Retry on other disconnects
      console.log('[Pair] Reconnecting...');
      main();
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

main().catch(async (err) => {
  console.error('[Pair] Error:', err.message);
  await knex.destroy();
  process.exit(1);
});
