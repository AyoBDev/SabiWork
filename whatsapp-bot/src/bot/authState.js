// whatsapp-bot/src/bot/authState.js
// DB-based auth state for Railway (persists across deploys)
import pg from 'pg';
import { initAuthCreds } from '@whiskeysockets/baileys';
import { config } from '../config.js';

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureTable() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function writeData(key, data) {
  const db = getPool();
  const serialized = JSON.stringify(data, (k, v) => {
    if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
      return { type: 'Buffer', data: Array.from(v) };
    }
    return v;
  });
  await db.query(
    `INSERT INTO whatsapp_sessions (key, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = NOW()`,
    [key, serialized]
  );
}

async function readData(key) {
  const db = getPool();
  const result = await db.query('SELECT data FROM whatsapp_sessions WHERE key = $1', [key]);
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
  const db = getPool();
  await db.query('DELETE FROM whatsapp_sessions WHERE key = $1', [key]);
}

export async function getAuthState() {
  await ensureTable();

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
