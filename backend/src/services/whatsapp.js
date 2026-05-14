// backend/src/services/whatsapp.js
// WhatsApp bot using Baileys with local QR pairing and DB session storage
const { default: makeWASocket, DisconnectReason, makeCacheableSignalKeyStore, proto, initAuthCreds } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const knex = require('../database/knex');
const eventBus = require('../utils/eventBus');

let sock = null;
let connectionStatus = 'disconnected'; // disconnected, connecting, qr_ready, open
let qrCode = null;

// DB-based auth state (works on Railway's ephemeral filesystem)
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

  // Load or init creds
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

// Format WhatsApp response for text message
function formatResponse(response) {
  if (!response) return 'Something went wrong. Try again.';

  switch (response.type) {
    case 'text':
      return response.message;

    case 'worker_card': {
      const w = response.data;
      if (!w) return response.message;
      let msg = `${response.message}\n\n`;
      msg += `*${w.name}*\n`;
      msg += `${w.area || 'Lagos'}\n`;
      msg += `Trust: ${w.trust_score || 'N/A'}\n`;
      if (w.phone) msg += `${w.phone}\n`;
      if (response.alternatives && response.alternatives.length > 0) {
        msg += `\n_Other options:_\n`;
        response.alternatives.forEach((alt, i) => {
          msg += `${i + 1}. ${alt.name} (${alt.trust_score || 'N/A'})\n`;
        });
      }
      return msg;
    }

    case 'sale_logged': {
      const d = response.data;
      let msg = `*Sale Logged!*\n\n`;
      msg += `${d.sale.quantity}x ${d.sale.item_name}\n`;
      msg += `N${d.sale.amount.toLocaleString()}\n\n`;
      msg += `*Today:* N${(d.today_total || 0).toLocaleString()} (${d.today_count} sales)\n`;
      msg += `*This week:* N${(d.week_total || 0).toLocaleString()}\n`;
      msg += `*Sabi Score:* ${d.sabi_score_after || 0}`;
      if (d.weeks_to_loan > 0) {
        msg += ` (${d.weeks_to_loan} weeks to loan eligibility)`;
      } else {
        msg += ` — Loan eligible!`;
      }
      return msg;
    }

    case 'demand_card': {
      const d = response.data;
      let msg = `${response.message}\n\n`;
      if (d.trades && d.trades.length > 0) {
        msg += `*In-Demand Trades:*\n`;
        d.trades.forEach((t, i) => {
          msg += `${i + 1}. ${t.trade || t.name} — ${t.demand || 'High'} demand\n`;
        });
      }
      return msg;
    }

    case 'status': {
      const d = response.data;
      let msg = `*Your Status*\n\n`;
      if (d.trust_score !== undefined) msg += `Trust Score: ${d.trust_score}\n`;
      if (d.sabi_score !== undefined) msg += `Sabi Score: ${d.sabi_score}\n`;
      if (d.total_jobs !== undefined) msg += `Total Jobs: ${d.total_jobs}\n`;
      if (d.total_income !== undefined) msg += `Total Income: N${d.total_income?.toLocaleString() || 0}\n`;
      if (d.total_sales !== undefined) msg += `Total Sales: ${d.total_sales}\n`;
      if (d.total_revenue !== undefined) msg += `Total Revenue: N${d.total_revenue?.toLocaleString() || 0}\n`;
      return msg;
    }

    default:
      return response.message || 'I received your message but I\'m not sure how to respond.';
  }
}

// Process incoming WhatsApp message via existing chat API logic
async function processMessage(phone, text) {
  try {
    const { classifyIntent, findNearbyWorkers, rankWorkers, generateMatchResponse } = require('./matching');
    const { classifySale } = require('./nlp');
    const sabiScoreService = require('./sabiScore');

    const intent = await classifyIntent(text);

    // Determine user type from DB
    let userType = null;
    const worker = await knex('workers').where({ phone }).first();
    const trader = await knex('traders').where({ phone }).first();
    if (worker) userType = 'worker';
    else if (trader) userType = 'trader';

    switch (intent.type) {
      case 'buyer_request': {
        await knex('demand_signals').insert({
          trade_category: intent.trade_category || 'unknown',
          area: intent.location,
          request_type: 'buyer_request',
          matched: false,
          recorded_at: new Date()
        });

        const candidates = await findNearbyWorkers(intent, null, null);
        if (candidates.length === 0) {
          return { type: 'text', message: `No ${(intent.trade_category || 'worker').replace('_', ' ')} available near ${intent.location || 'you'} right now. We've logged your request and will notify you.` };
        }

        const { topMatch, reasoning, allCandidates } = await rankWorkers(intent, candidates);
        const matchResponse = await generateMatchResponse(intent, topMatch, reasoning);

        eventBus.emit('job_matched', {
          actor: 'AI Engine',
          description: `Matched buyer with ${topMatch.name} (${intent.trade_category}, via WhatsApp)`,
          metadata: { worker_name: topMatch.name, service: intent.trade_category, area: intent.location, channel: 'whatsapp' }
        });

        return {
          type: 'worker_card',
          message: matchResponse.message,
          data: matchResponse.worker_card,
          alternatives: allCandidates.slice(1, 4).map(w => ({
            name: w.name,
            trust_score: parseFloat(w.trust_score)
          }))
        };
      }

      case 'sale_log': {
        if (!trader) {
          return { type: 'text', message: "You're not registered as a trader yet. Reply with your name to get started, e.g. \"register trader Ade\"" };
        }

        const sale = await classifySale(text);
        if (!sale) {
          return { type: 'text', message: "I couldn't parse that sale. Try: \"sold 3 bags rice 75000\"" };
        }

        await knex('sales_logs').insert({
          trader_id: trader.id,
          amount: sale.amount,
          item_name: sale.item_name,
          quantity: sale.quantity,
          category: sale.category,
          payment_method: 'cash',
          logged_at: new Date()
        });

        await knex('traders').where({ id: trader.id }).update({
          total_logged_sales: knex.raw('total_logged_sales + 1'),
          total_logged_revenue: knex.raw('total_logged_revenue + ?', [sale.amount])
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStats = await knex('sales_logs')
          .where({ trader_id: trader.id })
          .where('logged_at', '>=', today)
          .select(knex.raw('COALESCE(SUM(amount), 0) as total'), knex.raw('COUNT(*) as count'))
          .first();

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekStats = await knex('sales_logs')
          .where({ trader_id: trader.id })
          .where('logged_at', '>=', weekStart)
          .sum('amount as total')
          .first();

        const sabiResult = await sabiScoreService.calculateTraderSabiScore(trader.id);

        eventBus.emit('sale_logged', {
          actor: trader.name,
          description: `Sale logged via WhatsApp: ${sale.quantity}x ${sale.item_name} for N${sale.amount.toLocaleString()}`,
          metadata: { amount: sale.amount, trader_name: trader.name, area: trader.area, channel: 'whatsapp', sabi_score: sabiResult.score }
        });

        return {
          type: 'sale_logged',
          message: 'Sale Logged!',
          data: {
            sale,
            today_total: parseInt(todayStats.total) || 0,
            today_count: parseInt(todayStats.count) || 0,
            week_total: parseInt(weekStats.total) || 0,
            sabi_score_after: sabiResult.score,
            weeks_to_loan: sabiResult.score >= 50 ? 0 : Math.ceil((50 - sabiResult.score) / 2)
          }
        };
      }

      case 'greeting': {
        let greeting = 'Welcome to SabiWork!\n\nI can help you:\n- Find workers ("I need a plumber")\n- Log sales ("sold 5 bags rice 50000")\n- Check your status ("my score")';
        if (worker) greeting = `Hi ${worker.name}! You have jobs nearby. Say "my score" to check your stats.`;
        if (trader) greeting = `Hello ${trader.name}! Ready to log sales? Just tell me what you sold.`;
        return { type: 'text', message: greeting };
      }

      case 'status_check': {
        if (worker) {
          return {
            type: 'status',
            data: {
              trust_score: parseFloat(worker.trust_score),
              sabi_score: worker.sabi_score,
              total_jobs: worker.total_jobs,
              total_income: worker.total_income
            }
          };
        }
        if (trader) {
          return {
            type: 'status',
            data: {
              sabi_score: trader.sabi_score,
              total_sales: trader.total_logged_sales,
              total_revenue: trader.total_logged_revenue
            }
          };
        }
        return { type: 'text', message: "I couldn't find your profile. Send \"hi\" to learn how to register." };
      }

      default:
        return { type: 'text', message: "I'm not sure what you need. Try:\n- \"I need a plumber in Yaba\"\n- \"sold 3 bags rice 75000\"\n- \"my score\"" };
    }
  } catch (error) {
    console.error('[WhatsApp] Message processing error:', error);
    return { type: 'text', message: 'Something went wrong processing your message. Please try again.' };
  }
}

// Start WhatsApp connection
async function startWhatsApp() {
  try {
    connectionStatus = 'connecting';
    qrCode = null;

    const { state, saveCreds } = await useDBAuthState();

    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, { trace() {}, debug() {} })
      },
      printQRInTerminal: true,
      browser: ['SabiWork', 'Chrome', '1.0.0']
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        connectionStatus = 'qr_ready';
        console.log('[WhatsApp] QR Code ready — scan with WhatsApp:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('[WhatsApp] Connection closed. Status:', statusCode, 'Reconnecting:', shouldReconnect);
        connectionStatus = 'disconnected';
        qrCode = null;

        if (shouldReconnect) {
          setTimeout(() => startWhatsApp(), 3000);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'open';
        qrCode = null;
        console.log('[WhatsApp] Connected successfully!');
        eventBus.emit('whatsapp_connected', {
          actor: 'System',
          description: 'WhatsApp bot connected and ready',
          metadata: { channel: 'whatsapp' }
        });
      }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe || !msg.message) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        const text = msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          '';

        if (!text.trim()) continue;

        const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
        console.log(`[WhatsApp] Message from ${phone}: ${text}`);

        const response = await processMessage(phone, text);
        const replyText = formatResponse(response);

        try {
          await sock.sendMessage(msg.key.remoteJid, { text: replyText });
        } catch (sendErr) {
          console.error('[WhatsApp] Failed to send reply:', sendErr.message);
        }
      }
    });

    return sock;
  } catch (error) {
    console.error('[WhatsApp] Failed to start:', error);
    connectionStatus = 'disconnected';
    throw error;
  }
}

// Send message to a phone number
async function sendMessage(phone, text) {
  if (!sock || connectionStatus !== 'open') {
    throw new Error('WhatsApp not connected');
  }
  const jid = `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
}

// Get current status
function getStatus() {
  return { status: connectionStatus, qr: qrCode };
}

// Disconnect
async function disconnect() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      console.error('[WhatsApp] Logout error:', e.message);
    }
    sock = null;
    connectionStatus = 'disconnected';
    qrCode = null;
  }
}

// Clear stored session (for re-pairing)
async function clearSession() {
  await knex('whatsapp_sessions').del();
  connectionStatus = 'disconnected';
  qrCode = null;
}

module.exports = { startWhatsApp, sendMessage, getStatus, disconnect, clearSession };
