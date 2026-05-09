# Plan 11: WhatsApp Bot (Baileys Connection + Message Handlers)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the WhatsApp bot using Baileys (headless WhatsApp client). Handles worker onboarding (5-step flow), buyer requests (AI matching via backend), trader sales logging (NLP parsing), seeker pathways, and worker status commands. Bot communicates with the backend via REST API — no direct database access.

**Architecture:** Adapted from iroyinayo WhatsApp bot. Uses Baileys multi-auth for session persistence, conversation state stored in a Map keyed by phone number, message routing based on state + keyword matching. All intelligence lives in the backend — bot is a thin client that formats responses for WhatsApp.

**Tech Stack:** Node.js 22, @whiskeysockets/baileys, pino (logger), Backend REST API calls

**Depends on:** Plan 1 (backend running), Plan 4 (chat endpoint), Plan 5 (workers/traders/seekers endpoints)

---

## File Structure

```
whatsapp-bot/
├── package.json
├── Dockerfile
├── .dockerignore
├── src/
│   ├── index.js               # Entry point — starts bot
│   ├── config.js              # Environment config
│   ├── bot/
│   │   ├── connection.js      # Baileys socket creation + auth
│   │   ├── authState.js       # Multi-auth state persistence (file)
│   │   └── messageHandler.js  # Routes incoming messages
│   ├── handlers/
│   │   ├── onboard.js         # 5-step worker registration
│   │   ├── buyer.js           # Buyer AI matching flow
│   │   ├── trader.js          # Sales logging + report
│   │   ├── seeker.js          # Pathway + apprenticeship
│   │   └── worker.js          # READY/BUSY, SCORE, ACCEPT/DECLINE
│   └── services/
│       └── api.js             # Backend API client
```

---

### Task 1: Package.json + Config

**Files:**
- Create: `whatsapp-bot/package.json`
- Create: `whatsapp-bot/src/config.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sabiwork-whatsapp-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",
    "pino": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create config.js**

```javascript
// whatsapp-bot/src/config.js
export const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  serviceKey: process.env.SERVICE_KEY || 'sabiwork-bot-secret',
  sessionDir: process.env.SESSION_DIR || './auth_state',
  botName: 'SabiWork'
};
```

- [ ] **Step 3: Install dependencies**

Run: `cd whatsapp-bot && npm install`

- [ ] **Step 4: Commit**

```bash
git add whatsapp-bot/package.json whatsapp-bot/src/config.js whatsapp-bot/package-lock.json
git commit -m "feat: initialize whatsapp-bot with Baileys dependency"
```

---

### Task 2: Backend API Client

**Files:**
- Create: `whatsapp-bot/src/services/api.js`

- [ ] **Step 1: Create API service**

```javascript
// whatsapp-bot/src/services/api.js
import { config } from '../config.js';

const headers = {
  'Content-Type': 'application/json',
  'x-service-key': config.serviceKey
};

async function request(method, path, body = null) {
  const url = `${config.backendUrl}${path}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API ${response.status}`);
  }
  return response.json();
}

export const backendAPI = {
  // Chat (AI matching)
  chat: (message, context) =>
    request('POST', '/api/chat', { message, ...context }),

  // Workers
  onboardWorker: (data) =>
    request('POST', '/api/workers/onboard', data),
  getWorkerByPhone: (phone) =>
    request('GET', `/api/workers/phone/${phone}`),
  updateAvailability: (id, available) =>
    request('PATCH', `/api/workers/${id}/availability`, { is_available: available }),

  // Traders
  registerTrader: (data) =>
    request('POST', '/api/traders', data),
  logSale: (data) =>
    request('POST', '/api/traders/sales', data),
  getTraderReport: (phone) =>
    request('GET', `/api/traders/phone/${phone}/report`),

  // Seekers
  registerSeeker: (data) =>
    request('POST', '/api/seekers', data),
  getPathway: (phone) =>
    request('GET', `/api/seekers/phone/${phone}/pathway`),

  // Scores
  getScores: (phone) =>
    request('GET', `/api/workers/phone/${phone}/scores`)
};
```

- [ ] **Step 2: Commit**

```bash
git add whatsapp-bot/src/services/api.js
git commit -m "feat: add backend API client for WhatsApp bot"
```

---

### Task 3: Baileys Connection + Auth State

**Files:**
- Create: `whatsapp-bot/src/bot/authState.js`
- Create: `whatsapp-bot/src/bot/connection.js`

- [ ] **Step 1: Create authState (file-based persistence)**

```javascript
// whatsapp-bot/src/bot/authState.js
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { mkdir } from 'fs/promises';

export async function getAuthState() {
  await mkdir(config.sessionDir, { recursive: true });
  return useMultiFileAuthState(config.sessionDir);
}
```

- [ ] **Step 2: Create connection.js**

```javascript
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
```

- [ ] **Step 3: Commit**

```bash
git add whatsapp-bot/src/bot/authState.js whatsapp-bot/src/bot/connection.js
git commit -m "feat: add Baileys connection with QR auth and reconnect"
```

---

### Task 4: Message Handler (Router)

**Files:**
- Create: `whatsapp-bot/src/bot/messageHandler.js`

- [ ] **Step 1: Create message router**

```javascript
// whatsapp-bot/src/bot/messageHandler.js
import { handleOnboard, isOnboarding } from '../handlers/onboard.js';
import { handleBuyer } from '../handlers/buyer.js';
import { handleTrader, isTraderMessage } from '../handlers/trader.js';
import { handleSeeker } from '../handlers/seeker.js';
import { handleWorkerCommand } from '../handlers/worker.js';

// Conversation state: phone -> { step, data, flow }
const conversations = new Map();

// Keywords that trigger specific flows
const WORKER_COMMANDS = ['READY', 'BUSY', 'SCORE', 'ACCEPT', 'DECLINE'];
const REGISTER_KEYWORDS = ['register', 'join', 'start', 'signup', 'hello', 'hi'];
const SEEKER_KEYWORDS = ['find work', 'job', 'apprentice', 'learn', 'pathway', 'APPLY'];
const TRADER_KEYWORDS = ['sold', 'sale', 'REPORT'];

export async function handleMessage(phone, text) {
  const state = conversations.get(phone);
  const upperText = text.toUpperCase().trim();

  // 1. If in active onboarding flow, continue it
  if (state && state.flow === 'onboard') {
    return handleOnboard(phone, text, state, conversations);
  }

  // 2. Worker commands (existing workers)
  if (WORKER_COMMANDS.includes(upperText)) {
    return handleWorkerCommand(phone, upperText, state, conversations);
  }

  // 3. Registration trigger
  if (REGISTER_KEYWORDS.some((k) => text.toLowerCase().includes(k)) && !state) {
    conversations.set(phone, { flow: 'onboard', step: 1, data: {} });
    return handleOnboard(phone, text, { flow: 'onboard', step: 1, data: {} }, conversations);
  }

  // 4. Trader message (sales pattern: "sold X bags of Y at Z")
  if (isTraderMessage(text)) {
    return handleTrader(phone, text, state, conversations);
  }

  // 5. Trader REPORT command
  if (upperText === 'REPORT') {
    return handleTrader(phone, text, state, conversations);
  }

  // 6. Seeker keywords
  if (SEEKER_KEYWORDS.some((k) => text.toLowerCase().includes(k))) {
    return handleSeeker(phone, text, state, conversations);
  }

  // 7. Default: treat as buyer/natural language → AI matching
  return handleBuyer(phone, text, state, conversations);
}

export function getConversation(phone) {
  return conversations.get(phone);
}

export function clearConversation(phone) {
  conversations.delete(phone);
}
```

- [ ] **Step 2: Commit**

```bash
git add whatsapp-bot/src/bot/messageHandler.js
git commit -m "feat: add message router with flow detection"
```

---

### Task 5: Onboard Handler (5-Step Worker Registration)

**Files:**
- Create: `whatsapp-bot/src/handlers/onboard.js`

- [ ] **Step 1: Create onboard handler**

```javascript
// whatsapp-bot/src/handlers/onboard.js
import { backendAPI } from '../services/api.js';

const TRADES = [
  '1. Plumbing', '2. Electrical', '3. Carpentry', '4. Cleaning',
  '5. Tailoring', '6. Hairdressing', '7. Painting', '8. Catering',
  '9. Welding', '10. Tiling'
];

const TRADE_MAP = {
  '1': 'plumbing', '2': 'electrical', '3': 'carpentry', '4': 'cleaning',
  '5': 'tailoring', '6': 'hairdressing', '7': 'painting', '8': 'catering',
  '9': 'welding', '10': 'tiling'
};

const AREAS = [
  '1. Surulere', '2. Yaba', '3. Ikeja', '4. Lekki', '5. VI',
  '6. Mushin', '7. Maryland', '8. Ojota', '9. Ikorodu', '10. Ajah'
];

const AREA_MAP = {
  '1': 'surulere', '2': 'yaba', '3': 'ikeja', '4': 'lekki',
  '5': 'victoria_island', '6': 'mushin', '7': 'maryland',
  '8': 'ojota', '9': 'ikorodu', '10': 'ajah'
};

export function isOnboarding(state) {
  return state && state.flow === 'onboard';
}

export async function handleOnboard(phone, text, state, conversations) {
  const step = state.step;
  const data = state.data;

  switch (step) {
    case 1:
      // Ask for name
      return `🎉 Welcome to *SabiWork*!

Let's get you registered so you can start receiving jobs and building your financial identity.

*What is your full name?*`;

    case 2:
      // Save name, ask for trade
      data.name = text;
      data.phone = phone;
      conversations.set(phone, { flow: 'onboard', step: 3, data });
      return `Nice to meet you, *${text}*! 👋

What trade do you do? Reply with the number:

${TRADES.join('\n')}`;

    case 3:
      // Save trade, ask for areas
      const trade = TRADE_MAP[text.trim()] || text.toLowerCase().trim();
      if (!Object.values(TRADE_MAP).includes(trade) && !TRADE_MAP[text.trim()]) {
        return `Please reply with a number (1-10):\n\n${TRADES.join('\n')}`;
      }
      data.primary_trade = TRADE_MAP[text.trim()] || trade;
      conversations.set(phone, { flow: 'onboard', step: 4, data });
      return `✅ *${data.primary_trade}* — nice!

Which areas do you serve? Reply with numbers separated by commas (e.g., 1,3,5):

${AREAS.join('\n')}`;

    case 4:
      // Save areas, ask for bank
      const areaNumbers = text.split(',').map((s) => s.trim());
      const areas = areaNumbers.map((n) => AREA_MAP[n]).filter(Boolean);
      if (areas.length === 0) {
        return `Please reply with numbers separated by commas (e.g., 1,3,5):\n\n${AREAS.join('\n')}`;
      }
      data.service_areas = areas;
      conversations.set(phone, { flow: 'onboard', step: 5, data });
      return `Great! You'll serve: *${areas.join(', ')}*

Last step — your bank details for receiving payments.

Reply in this format:
*Bank code, Account number*

Example: 058, 0123456789

(Common codes: GTB=058, Access=044, First=011, UBA=033)`;

    case 5:
      // Save bank, register
      const parts = text.split(',').map((s) => s.trim());
      if (parts.length !== 2) {
        return `Please reply in format: *Bank code, Account number*\n\nExample: 058, 0123456789`;
      }
      data.bank_code = parts[0];
      data.account_number = parts[1];
      data.onboarding_channel = 'whatsapp';

      try {
        const result = await backendAPI.onboardWorker(data);

        conversations.delete(phone);

        return `🎊 *Registration Complete!*

Welcome to SabiWork, ${data.name}!

📋 *Your details:*
• Trade: ${data.primary_trade}
• Areas: ${data.service_areas.join(', ')}
• Bank: ${data.bank_code} - ${data.account_number}

🏦 *Virtual Account:* ${result.virtual_account_number || 'Creating...'}
Any payment to this account is auto-logged!

📱 *Commands:*
• READY — start receiving jobs
• BUSY — pause job alerts
• SCORE — check your trust + SabiScore

Sabi dey pay! 💪`;
      } catch (err) {
        conversations.delete(phone);
        return `⚠️ Registration failed: ${err.message}\n\nTry again by sending "register"`;
      }

    default:
      conversations.delete(phone);
      return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add whatsapp-bot/src/handlers/onboard.js
git commit -m "feat: add 5-step WhatsApp onboarding handler"
```

---

### Task 6: Buyer Handler (AI Matching via Backend)

**Files:**
- Create: `whatsapp-bot/src/handlers/buyer.js`

- [ ] **Step 1: Create buyer handler**

```javascript
// whatsapp-bot/src/handlers/buyer.js
import { backendAPI } from '../services/api.js';

export async function handleBuyer(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // Handle BOOK command (user wants to book a specific worker)
  if (upperText.startsWith('BOOK') || upperText === 'NEXT') {
    const ctx = state?.buyerContext;
    if (!ctx) {
      return `I don't have any matches saved. Tell me what you need — e.g., "I need a plumber in Surulere"`;
    }

    if (upperText === 'NEXT') {
      // Show next worker in list
      const nextIdx = (ctx.currentIdx || 0) + 1;
      if (nextIdx >= ctx.workers.length) {
        return `No more matches available. Try a different search?`;
      }
      conversations.set(phone, {
        ...state,
        buyerContext: { ...ctx, currentIdx: nextIdx }
      });
      const worker = ctx.workers[nextIdx];
      return formatWorkerMatch(worker, nextIdx + 1, ctx.workers.length);
    }

    // BOOK — proceed to payment
    const worker = ctx.workers[ctx.currentIdx || 0];
    try {
      const response = await backendAPI.chat(`BOOK ${worker.id}`, {
        action: 'book',
        worker_id: worker.id,
        buyer_phone: phone
      });

      const paymentMsg = response.messages?.find((m) => m.type === 'payment_card');
      if (paymentMsg) {
        conversations.delete(phone);
        return `💳 *Payment for ${worker.name}*

Amount: *₦${Number(paymentMsg.data.amount).toLocaleString()}*
Service: ${paymentMsg.data.service_category}

Pay here: ${paymentMsg.data.checkout_url}

After payment, ${worker.name.split(' ')[0]} will be notified and you'll get a confirmation. 👍`;
      }

      return response.messages?.[0]?.text || 'Booking initiated! You\'ll receive payment instructions shortly.';
    } catch (err) {
      return `⚠️ Booking failed. Try again shortly.`;
    }
  }

  // Default: Send natural language to AI
  try {
    const response = await backendAPI.chat(text, { phone, channel: 'whatsapp' });

    // Process response messages
    const messages = response.messages || [response];
    let reply = '';

    for (const msg of messages) {
      if (msg.type === 'text') {
        reply += msg.text + '\n\n';
      } else if (msg.type === 'worker_card') {
        // Store context for BOOK/NEXT flow
        const workers = response.workers || [msg.data];
        conversations.set(phone, {
          ...state,
          buyerContext: { workers, currentIdx: 0 }
        });
        reply += formatWorkerMatch(msg.data, 1, workers.length);
      }
    }

    return reply.trim() || 'I couldn\'t understand that. Try telling me what service you need — e.g., "I need a plumber in Surulere"';
  } catch (err) {
    return `Sorry, I couldn't process that right now. Try again in a moment.\n\nTip: Tell me what you need like "I need a plumber in Surulere"`;
  }
}

function formatWorkerMatch(worker, idx, total) {
  const stars = '⭐'.repeat(Math.round(worker.trust_score * 5));
  return `👷 *Match ${idx}/${total}: ${worker.name}*

🔧 Trade: ${worker.primary_trade}
${stars} Trust: ${(worker.trust_score * 100).toFixed(0)}%
📍 ${worker.distance || 'Nearby'}
💼 ${worker.total_jobs} jobs completed

Reply:
• *BOOK* — hire ${worker.name.split(' ')[0]}
• *NEXT* — see next match`;
}
```

- [ ] **Step 2: Commit**

```bash
git add whatsapp-bot/src/handlers/buyer.js
git commit -m "feat: add buyer handler with AI matching and BOOK/NEXT flow"
```

---

### Task 7: Trader Handler (Sales Logging + Report)

**Files:**
- Create: `whatsapp-bot/src/handlers/trader.js`

- [ ] **Step 1: Create trader handler**

```javascript
// whatsapp-bot/src/handlers/trader.js
import { backendAPI } from '../services/api.js';

// Pattern: "sold 3 bags rice 75000" or "sold rice 5000"
const SALE_PATTERN = /sold\s+(\d+)?\s*(bags?|pieces?|cartons?|rolls?|plates?|packs?)?\s*(?:of\s+)?(.+?)\s+(\d[\d,]*)/i;

export function isTraderMessage(text) {
  return SALE_PATTERN.test(text) || text.toUpperCase().trim() === 'REPORT';
}

export async function handleTrader(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // REPORT command
  if (upperText === 'REPORT') {
    try {
      const report = await backendAPI.getTraderReport(phone);
      return formatReport(report);
    } catch (err) {
      return `⚠️ Could not get your report. Make sure you're registered as a trader.`;
    }
  }

  // Parse sale
  const match = text.match(SALE_PATTERN);
  if (!match) {
    // Try sending to AI for NLP parsing
    try {
      const response = await backendAPI.chat(text, { phone, channel: 'whatsapp', context: 'trader' });
      return response.messages?.[0]?.text || 'I couldn\'t parse that sale. Try: "sold 3 bags rice 75000"';
    } catch {
      return `I couldn't understand that. Try format:\n*sold [qty] [item] [amount]*\n\nExample: "sold 3 bags rice 75000"`;
    }
  }

  const quantity = parseInt(match[1]) || 1;
  const item = match[3].trim();
  const amount = parseInt(match[4].replace(/,/g, ''));

  try {
    const result = await backendAPI.logSale({
      phone,
      item_name: item,
      quantity,
      amount,
      payment_method: 'cash' // default, can be specified
    });

    return `✅ *Sale Logged!*

📦 ${quantity}x ${item}
💰 ₦${amount.toLocaleString()}

📊 *Today:* ${result.today_count || '—'} sales, ₦${(result.today_total || amount).toLocaleString()}
📈 *SabiScore:* ${result.sabi_score || '—'}/100

Keep logging to build your credit score! 💪`;
  } catch (err) {
    return `⚠️ Failed to log sale: ${err.message}\n\nMake sure you're registered. Send "register" to start.`;
  }
}

function formatReport(report) {
  if (!report) return 'No sales data found.';

  return `📊 *Weekly Sales Report*

🗓️ Period: Last 7 days

💰 *Revenue:* ₦${(report.weekly_revenue || 0).toLocaleString()}
📦 *Sales:* ${report.weekly_count || 0}
📈 *vs Last Week:* ${report.growth_pct > 0 ? '↑' : '↓'} ${Math.abs(report.growth_pct || 0)}%

🏆 *Top Items:*
${(report.top_items || []).map((i, idx) => `  ${idx + 1}. ${i.name} — ₦${i.total.toLocaleString()}`).join('\n')}

📊 *SabiScore:* ${report.sabi_score || 0}/100
${report.sabi_score >= 50 ? '🎉 You qualify for a microloan!' : `📍 ${50 - (report.sabi_score || 0)} points to loan eligibility`}

Keep logging every sale! 🚀`;
}
```

- [ ] **Step 2: Commit**

```bash
git add whatsapp-bot/src/handlers/trader.js
git commit -m "feat: add trader handler with NLP sale parsing and weekly report"
```

---

### Task 8: Seeker + Worker Handlers

**Files:**
- Create: `whatsapp-bot/src/handlers/seeker.js`
- Create: `whatsapp-bot/src/handlers/worker.js`

- [ ] **Step 1: Create seeker handler**

```javascript
// whatsapp-bot/src/handlers/seeker.js
import { backendAPI } from '../services/api.js';

export async function handleSeeker(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // APPLY for apprenticeship
  if (upperText === 'APPLY') {
    const ctx = state?.seekerContext;
    if (!ctx || !ctx.apprenticeship) {
      return `No apprenticeship selected. Tell me what trade you want to learn — e.g., "I want to learn tiling"`;
    }

    try {
      const response = await backendAPI.chat(`APPLY ${ctx.apprenticeship.id}`, {
        action: 'apply_apprenticeship',
        phone,
        apprenticeship_id: ctx.apprenticeship.id
      });
      conversations.delete(phone);
      return response.messages?.[0]?.text || `✅ Application sent! You'll hear back from ${ctx.apprenticeship.master_name} soon.`;
    } catch (err) {
      return `⚠️ Application failed: ${err.message}`;
    }
  }

  // Get pathway recommendation
  try {
    const response = await backendAPI.chat(text, { phone, channel: 'whatsapp', context: 'seeker' });
    const messages = response.messages || [response];
    let reply = '';

    for (const msg of messages) {
      if (msg.type === 'text') {
        reply += msg.text + '\n\n';
      } else if (msg.type === 'demand_card' || msg.type === 'apprenticeship_card') {
        // Store context for APPLY
        if (msg.data?.apprenticeship) {
          conversations.set(phone, {
            ...state,
            seekerContext: { apprenticeship: msg.data.apprenticeship }
          });
        }
        reply += formatPathway(msg.data);
      }
    }

    return reply.trim() || `I can help you find work or an apprenticeship. What trade interests you?

Try: "I want to learn tiling" or "What jobs are available near me?"`;
  } catch (err) {
    return `I can help you find a career path! Tell me:\n• What trade interests you?\n• What area are you in?\n\nExample: "I want to learn plumbing in Surulere"`;
  }
}

function formatPathway(data) {
  if (!data) return '';

  let reply = `🎯 *Pathway: ${data.trade || 'Recommended'}*\n\n`;

  if (data.demand_info) {
    reply += `📊 *Demand:* ${data.demand_info}\n`;
  }

  if (data.apprenticeship) {
    reply += `\n📚 *Apprenticeship Available:*\n`;
    reply += `👷 Master: ${data.apprenticeship.master_name}\n`;
    reply += `⏱️ Duration: ${data.apprenticeship.duration_weeks} weeks\n`;
    reply += `💰 Stipend: ₦${(data.apprenticeship.weekly_stipend || 0).toLocaleString()}/week\n\n`;
    reply += `Reply *APPLY* to apply!`;
  }

  return reply;
}
```

- [ ] **Step 2: Create worker handler**

```javascript
// whatsapp-bot/src/handlers/worker.js
import { backendAPI } from '../services/api.js';

export async function handleWorkerCommand(phone, command, state, conversations) {
  switch (command) {
    case 'READY':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        await backendAPI.updateAvailability(worker.id, true);
        return `✅ *You're now READY!*

You'll receive job alerts for your area. Stay close to your phone! 📱

Current Trust Score: ${(worker.trust_score * 100).toFixed(0)}%
SabiScore: ${worker.sabi_score}/100`;
      } catch (err) {
        return `⚠️ Could not update status. Are you registered? Send "register" to start.`;
      }

    case 'BUSY':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        await backendAPI.updateAvailability(worker.id, false);
        return `⏸️ *Status: BUSY*

You won't receive new job alerts until you send READY again.

Rest well! 💤`;
      } catch (err) {
        return `⚠️ Could not update status.`;
      }

    case 'SCORE':
      try {
        const scores = await backendAPI.getScores(phone);
        return formatScores(scores);
      } catch (err) {
        return `⚠️ Could not fetch your scores. Are you registered?`;
      }

    case 'ACCEPT':
      try {
        const ctx = state?.jobAlert;
        if (!ctx) return `No pending job alert. Wait for a new one!`;

        const response = await backendAPI.chat('ACCEPT', {
          action: 'accept_job',
          job_id: ctx.job_id,
          phone
        });

        conversations.set(phone, { ...state, jobAlert: null });
        return response.messages?.[0]?.text || `✅ Job accepted! Head to the location. The buyer has been notified.`;
      } catch (err) {
        return `⚠️ Could not accept job: ${err.message}`;
      }

    case 'DECLINE':
      try {
        const ctx = state?.jobAlert;
        if (!ctx) return `No pending job alert.`;

        conversations.set(phone, { ...state, jobAlert: null });
        return `❌ Job declined. You'll get the next one that matches you.`;
      } catch (err) {
        return `⚠️ Error processing decline.`;
      }

    default:
      return null;
  }
}

function formatScores(scores) {
  if (!scores) return 'No score data available.';

  const trustBar = '█'.repeat(Math.round(scores.trust_score * 10)) + '░'.repeat(10 - Math.round(scores.trust_score * 10));
  const sabiBar = '█'.repeat(Math.round(scores.sabi_score / 10)) + '░'.repeat(10 - Math.round(scores.sabi_score / 10));

  let tier = 'Emerging';
  if (scores.trust_score >= 0.8) tier = '🥇 Elite';
  else if (scores.trust_score >= 0.6) tier = '✅ Verified';
  else if (scores.trust_score >= 0.3) tier = '⭐ Trusted';
  else tier = '🌱 Emerging';

  return `📊 *Your SabiWork Scores*

🛡️ *Trust Score:* ${(scores.trust_score * 100).toFixed(0)}%
[${trustBar}]
Tier: ${tier}

💳 *SabiScore:* ${scores.sabi_score}/100
[${sabiBar}]
${scores.sabi_score >= 50 ? '✅ Microloan eligible!' : `📍 ${50 - scores.sabi_score} points to loan`}

📈 *Stats:*
• Jobs completed: ${scores.total_jobs || 0}
• Total earned: ₦${(scores.total_income || 0).toLocaleString()}
• This month: ₦${(scores.monthly_income || 0).toLocaleString()}

Keep working, keep growing! 💪`;
}
```

- [ ] **Step 3: Commit**

```bash
git add whatsapp-bot/src/handlers/seeker.js whatsapp-bot/src/handlers/worker.js
git commit -m "feat: add seeker pathway and worker command handlers"
```

---

### Task 9: Entry Point + Dockerfile

**Files:**
- Create: `whatsapp-bot/src/index.js`
- Create: `whatsapp-bot/Dockerfile`
- Create: `whatsapp-bot/.dockerignore`

- [ ] **Step 1: Create index.js**

```javascript
// whatsapp-bot/src/index.js
import { startBot } from './bot/connection.js';

console.log('🤖 Starting SabiWork WhatsApp Bot...');
console.log('   Connecting to WhatsApp...\n');

startBot().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
# whatsapp-bot/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
VOLUME ["/app/auth_state"]
CMD ["npm", "start"]
```

- [ ] **Step 3: Create .dockerignore**

```
node_modules
auth_state
.env
```

- [ ] **Step 4: Verify bot starts (will show QR code)**

Run: `cd whatsapp-bot && npm start`

Expected: Bot starts, prints "Scan this QR code with WhatsApp:" and displays a QR code in terminal. This confirms Baileys is working.

Press Ctrl+C to stop after verifying.

- [ ] **Step 5: Commit**

```bash
git add whatsapp-bot/src/index.js whatsapp-bot/Dockerfile whatsapp-bot/.dockerignore
git commit -m "feat: WhatsApp bot complete — connection, routing, all handlers"
```
