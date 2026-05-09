# Plan 3: Trust Score + SabiScore + WebSocket Broadcasting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the trust score calculation service (updates on every payment/rating event), the SabiScore credit scoring service (transaction-based financial identity), and the WebSocket server that broadcasts live events to the dashboard.

**Architecture:** Trust score is event-driven — every Squad webhook and rating triggers a recalculation. SabiScore runs on a time-window basis (looks at last 90 days of data). WebSocket server subscribes to Redis pub/sub and pushes to all connected dashboard clients.

**Tech Stack:** Express, Knex, Redis pub/sub, ws (WebSocket library)

**Depends on:** Plan 1 (database tables), Plan 2 (webhook handler publishes events to Redis)

---

## File Structure

```
backend/src/
├── services/
│   ├── trust.js              # Trust score calculation + update
│   └── sabiScore.js          # SabiScore (credit scoring) calculation
└── utils/
    └── websocket.js          # WebSocket server + Redis pub/sub subscriber
```

---

### Task 1: Trust Score Service

**Files:**
- Create: `backend/src/services/trust.js`

- [ ] **Step 1: Create trust score service**

```javascript
// backend/src/services/trust.js
const knex = require('../database/knex');
const redis = require('../utils/redis');

// Trust score signal deltas
const SIGNALS = {
  PAYMENT_FAST: 0.02,        // Payment within 2hrs of match
  PAYMENT_ANY: 0.005,        // Any payment received
  REPEAT_BUYER: 0.03,        // Same buyer re-books same worker
  DISPUTE: -0.08,            // Payment disputed or charged back
  DIGITAL_CHANNEL: 0.01,     // Card/transfer payment (not cash)
  STREAK_BONUS: 0.015,       // 3+ consecutive jobs no dispute
  RATING_ABOVE_3: 0.01,      // Per star above 3
  RATING_BELOW_3: -0.02,     // Per star below 3
  APPRENTICE_TRAINED: 0.05,  // Apprentice completes pathway
  AGENT_VERIFIED: 0.05       // Field agent onboarding (initial bonus)
};

const DAMPENING_FACTOR = 0.7;
const SCORE_MIN = 0.0;
const SCORE_MAX = 1.0;
const CACHE_TTL = 300; // 5 minutes

/**
 * Get a worker's trust score (cached in Redis)
 */
async function getTrustScore(workerId) {
  const cached = await redis.get(`trust:${workerId}`);
  if (cached !== null) {
    return parseFloat(cached);
  }

  const worker = await knex('workers').where({ id: workerId }).select('trust_score').first();
  const score = worker ? parseFloat(worker.trust_score) : 0.0;

  await redis.set(`trust:${workerId}`, score.toString(), 'EX', CACHE_TTL);
  return score;
}

/**
 * Apply a trust event and recalculate the score
 * @param {string} workerId
 * @param {string} eventType - Key from SIGNALS
 * @param {Object} options - { jobId, rating, paymentTimestamp, jobCreatedAt }
 * @returns {Object} { previousScore, newScore, delta, tier }
 */
async function applyTrustEvent(workerId, eventType, options = {}) {
  const currentScore = await getTrustScore(workerId);
  let delta = 0;

  switch (eventType) {
    case 'payment_received': {
      delta += SIGNALS.PAYMENT_ANY;

      // Bonus if payment came within 2 hours of job creation
      if (options.paymentTimestamp && options.jobCreatedAt) {
        const diffMs = new Date(options.paymentTimestamp) - new Date(options.jobCreatedAt);
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours <= 2) {
          delta += SIGNALS.PAYMENT_FAST;
        }
      }

      // Bonus for digital payment channel
      if (options.paymentChannel && ['card', 'transfer', 'bank'].includes(options.paymentChannel)) {
        delta += SIGNALS.DIGITAL_CHANNEL;
      }

      // Check for repeat buyer
      if (options.buyerId) {
        const repeatCount = await knex('jobs')
          .where({ worker_id: workerId, buyer_id: options.buyerId, status: 'payout_sent' })
          .count('id as count')
          .first();
        if (parseInt(repeatCount.count) > 0) {
          delta += SIGNALS.REPEAT_BUYER;
        }
      }

      // Check for streak (3+ consecutive jobs no dispute)
      const recentJobs = await knex('jobs')
        .where({ worker_id: workerId })
        .whereIn('status', ['completed', 'payout_sent'])
        .orderBy('completed_at', 'desc')
        .limit(3)
        .select('buyer_rating');

      if (recentJobs.length >= 3 && recentJobs.every(j => j.buyer_rating >= 3)) {
        delta += SIGNALS.STREAK_BONUS;
      }
      break;
    }

    case 'rating': {
      const rating = options.rating || 3;
      if (rating > 3) {
        delta += SIGNALS.RATING_ABOVE_3 * (rating - 3);
      } else if (rating < 3) {
        delta += SIGNALS.RATING_BELOW_3 * (3 - rating);
      }
      break;
    }

    case 'dispute': {
      delta += SIGNALS.DISPUTE;
      break;
    }

    case 'apprentice_trained': {
      delta += SIGNALS.APPRENTICE_TRAINED;
      break;
    }

    case 'agent_verified': {
      delta += SIGNALS.AGENT_VERIFIED;
      break;
    }

    default:
      return { previousScore: currentScore, newScore: currentScore, delta: 0, tier: getTier(currentScore) };
  }

  // Apply dampening
  delta = delta * DAMPENING_FACTOR;

  // Clamp score
  const newScore = Math.min(SCORE_MAX, Math.max(SCORE_MIN, currentScore + delta));
  const roundedScore = Math.round(newScore * 1000) / 1000;

  // Persist to database
  await knex('workers')
    .where({ id: workerId })
    .update({ trust_score: roundedScore });

  // Log trust event
  await knex('trust_events').insert({
    worker_id: workerId,
    event_type: eventType,
    score_delta: Math.round(delta * 10000) / 10000,
    score_after: roundedScore,
    job_id: options.jobId || null
  });

  // Update cache
  await redis.set(`trust:${workerId}`, roundedScore.toString(), 'EX', CACHE_TTL);

  // Update accepts_apprentices flag if crossing 0.6 threshold
  if (currentScore < 0.6 && roundedScore >= 0.6) {
    await knex('workers')
      .where({ id: workerId })
      .update({ accepts_apprentices: true });
  }

  return {
    previousScore: currentScore,
    newScore: roundedScore,
    delta: Math.round(delta * 10000) / 10000,
    tier: getTier(roundedScore)
  };
}

/**
 * Get trust tier from score
 */
function getTier(score) {
  if (score >= 0.80) return { label: 'Elite', emoji: '⭐' };
  if (score >= 0.60) return { label: 'Verified', emoji: '🔵' };
  if (score >= 0.30) return { label: 'Trusted', emoji: '✅' };
  return { label: 'Emerging', emoji: '🌱' };
}

module.exports = {
  getTrustScore,
  applyTrustEvent,
  getTier,
  SIGNALS
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/trust.js
git commit -m "feat: add trust score service with event-driven calculation"
```

---

### Task 2: SabiScore Service

**Files:**
- Create: `backend/src/services/sabiScore.js`

- [ ] **Step 1: Create SabiScore service**

```javascript
// backend/src/services/sabiScore.js
const knex = require('../database/knex');

// SabiScore weights (sum to 100)
const WEIGHTS = {
  TRANSACTION_CONSISTENCY: 25,
  INCOME_GROWTH: 15,
  TRUST_SCORE: 20,
  CUSTOMER_DIVERSITY: 15,
  DIGITAL_ENGAGEMENT: 10,
  LOCATION_CONSISTENCY: 10,
  REPAYMENT_HISTORY: 5
};

const WINDOW_DAYS = 90; // 3-month rolling window

/**
 * Calculate SabiScore for a worker
 * @param {string} workerId
 * @returns {Object} { score, breakdown, tier }
 */
async function calculateWorkerSabiScore(workerId) {
  const worker = await knex('workers').where({ id: workerId }).first();
  if (!worker) return { score: 0, breakdown: {}, tier: getTier(0) };

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  // 1. Transaction consistency (25%) — regular income over time
  const weeklyJobs = await knex('jobs')
    .where({ worker_id: workerId })
    .where('paid_at', '>=', windowStart)
    .whereIn('status', ['completed', 'payout_sent'])
    .select(knex.raw("DATE_TRUNC('week', paid_at) as week"))
    .count('id as count')
    .groupByRaw("DATE_TRUNC('week', paid_at)");

  const totalWeeks = Math.ceil(WINDOW_DAYS / 7);
  const activeWeeks = weeklyJobs.length;
  const consistencyRatio = activeWeeks / totalWeeks;
  const transactionConsistency = Math.min(100, Math.round(consistencyRatio * 100));

  // 2. Income growth (15%) — month-over-month revenue change
  const monthlyIncome = await knex('jobs')
    .where({ worker_id: workerId })
    .where('paid_at', '>=', windowStart)
    .whereIn('status', ['completed', 'payout_sent'])
    .select(knex.raw("DATE_TRUNC('month', paid_at) as month"))
    .sum('payout_amount as total')
    .groupByRaw("DATE_TRUNC('month', paid_at)")
    .orderBy('month', 'asc');

  let incomeGrowth = 50; // neutral
  if (monthlyIncome.length >= 2) {
    const last = parseInt(monthlyIncome[monthlyIncome.length - 1].total) || 0;
    const prev = parseInt(monthlyIncome[monthlyIncome.length - 2].total) || 1;
    const growthRate = (last - prev) / prev;
    incomeGrowth = Math.min(100, Math.max(0, Math.round(50 + growthRate * 50)));
  }

  // 3. Trust score (20%) — direct mapping from 0-1 to 0-100
  const trustScore = Math.round(parseFloat(worker.trust_score) * 100);

  // 4. Customer diversity (15%) — unique buyers in window
  const uniqueBuyers = await knex('jobs')
    .where({ worker_id: workerId })
    .where('paid_at', '>=', windowStart)
    .whereIn('status', ['completed', 'payout_sent'])
    .countDistinct('buyer_id as count')
    .first();

  const buyerCount = parseInt(uniqueBuyers.count) || 0;
  const customerDiversity = Math.min(100, buyerCount * 10); // 10+ unique = 100%

  // 5. Digital engagement (10%) — activity signals
  const totalJobs = await knex('jobs')
    .where({ worker_id: workerId })
    .where('created_at', '>=', windowStart)
    .count('id as count')
    .first();

  const jobCount = parseInt(totalJobs.count) || 0;
  const engagement = Math.min(100, jobCount * 5); // 20+ jobs in 90 days = 100%

  // 6. Location consistency (10%) — GPS stability
  let locationScore = 50; // neutral if no GPS data
  if (worker.gps_verified) {
    // Check if worker operates from consistent locations
    const jobLocations = await knex('jobs')
      .where({ worker_id: workerId })
      .whereIn('status', ['completed', 'payout_sent'])
      .whereNotNull('location_lat')
      .where('completed_at', '>=', windowStart)
      .select('location_lat', 'location_lng');

    if (jobLocations.length >= 3) {
      // Calculate spread (standard deviation of coordinates)
      const lats = jobLocations.map(j => parseFloat(j.location_lat));
      const lngs = jobLocations.map(j => parseFloat(j.location_lng));
      const latStd = standardDeviation(lats);
      const lngStd = standardDeviation(lngs);
      const avgSpread = (latStd + lngStd) / 2;

      // Lower spread = more consistent = higher score
      // 0.01 degrees ≈ 1.1km — operating within ~1km is very consistent
      if (avgSpread < 0.01) locationScore = 100;
      else if (avgSpread < 0.03) locationScore = 75;
      else if (avgSpread < 0.05) locationScore = 50;
      else locationScore = 25;
    }
  }

  // 7. Repayment history (5%) — placeholder (no MFI partner yet)
  const repaymentHistory = 50; // neutral until MFI integration

  // Calculate weighted score (0-100)
  const score = Math.round(
    (transactionConsistency * WEIGHTS.TRANSACTION_CONSISTENCY +
     incomeGrowth * WEIGHTS.INCOME_GROWTH +
     trustScore * WEIGHTS.TRUST_SCORE +
     customerDiversity * WEIGHTS.CUSTOMER_DIVERSITY +
     engagement * WEIGHTS.DIGITAL_ENGAGEMENT +
     locationScore * WEIGHTS.LOCATION_CONSISTENCY +
     repaymentHistory * WEIGHTS.REPAYMENT_HISTORY) / 100
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  // Persist
  await knex('workers')
    .where({ id: workerId })
    .update({ sabi_score: clampedScore });

  return {
    score: clampedScore,
    breakdown: {
      transaction_consistency: transactionConsistency,
      income_growth: incomeGrowth,
      trust_score: trustScore,
      customer_diversity: customerDiversity,
      digital_engagement: engagement,
      location_consistency: locationScore,
      repayment_history: repaymentHistory
    },
    tier: getTier(clampedScore)
  };
}

/**
 * Calculate SabiScore for a trader
 * @param {string} traderId
 * @returns {Object} { score, breakdown, tier }
 */
async function calculateTraderSabiScore(traderId) {
  const trader = await knex('traders').where({ id: traderId }).first();
  if (!trader) return { score: 0, breakdown: {}, tier: getTier(0) };

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  // 1. Transaction consistency (25%) — regular sales logging
  const weeklySales = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .select(knex.raw("DATE_TRUNC('week', logged_at) as week"))
    .count('id as count')
    .groupByRaw("DATE_TRUNC('week', logged_at)");

  const totalWeeks = Math.ceil(WINDOW_DAYS / 7);
  const activeWeeks = weeklySales.length;
  const transactionConsistency = Math.min(100, Math.round((activeWeeks / totalWeeks) * 100));

  // 2. Income growth (15%) — month-over-month revenue
  const monthlyRevenue = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .select(knex.raw("DATE_TRUNC('month', logged_at) as month"))
    .sum('amount as total')
    .groupByRaw("DATE_TRUNC('month', logged_at)")
    .orderBy('month', 'asc');

  let incomeGrowth = 50;
  if (monthlyRevenue.length >= 2) {
    const last = parseInt(monthlyRevenue[monthlyRevenue.length - 1].total) || 0;
    const prev = parseInt(monthlyRevenue[monthlyRevenue.length - 2].total) || 1;
    const growthRate = (last - prev) / prev;
    incomeGrowth = Math.min(100, Math.max(0, Math.round(50 + growthRate * 50)));
  }

  // 3. Trust equivalent (20%) — based on logging frequency and Squad usage
  const totalSales = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .count('id as count')
    .first();

  const salesCount = parseInt(totalSales.count) || 0;
  const trustEquivalent = Math.min(100, salesCount * 2); // 50+ sales in 90 days = 100%

  // 4. Revenue diversity (15%) — variety of categories sold
  const categories = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .countDistinct('category as count')
    .first();

  const catCount = parseInt(categories.count) || 0;
  const revenueDiversity = Math.min(100, catCount * 20); // 5+ categories = 100%

  // 5. Digital engagement (10%) — Squad payments vs cash
  const squadSales = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .where('payment_method', 'squad')
    .count('id as count')
    .first();

  const squadCount = parseInt(squadSales.count) || 0;
  const digitalRatio = salesCount > 0 ? squadCount / salesCount : 0;
  const digitalEngagement = Math.min(100, Math.round(digitalRatio * 100 + 30)); // 30 base for logging at all

  // 6. Location consistency (10%)
  const locationScore = trader.location_lat ? 75 : 30; // Has location = bonus

  // 7. Repayment history (5%)
  const repaymentHistory = 50;

  const score = Math.round(
    (transactionConsistency * WEIGHTS.TRANSACTION_CONSISTENCY +
     incomeGrowth * WEIGHTS.INCOME_GROWTH +
     trustEquivalent * WEIGHTS.TRUST_SCORE +
     revenueDiversity * WEIGHTS.CUSTOMER_DIVERSITY +
     digitalEngagement * WEIGHTS.DIGITAL_ENGAGEMENT +
     locationScore * WEIGHTS.LOCATION_CONSISTENCY +
     repaymentHistory * WEIGHTS.REPAYMENT_HISTORY) / 100
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  await knex('traders')
    .where({ id: traderId })
    .update({ sabi_score: clampedScore });

  return {
    score: clampedScore,
    breakdown: {
      transaction_consistency: transactionConsistency,
      income_growth: incomeGrowth,
      trust_equivalent: trustEquivalent,
      revenue_diversity: revenueDiversity,
      digital_engagement: digitalEngagement,
      location_consistency: locationScore,
      repayment_history: repaymentHistory
    },
    tier: getTier(clampedScore)
  };
}

/**
 * Get SabiScore tier
 */
function getTier(score) {
  if (score >= 70) return { label: 'Full Financial Suite', unlocks: 'full' };
  if (score >= 50) return { label: 'Microloan Eligible', unlocks: 'microloan' };
  if (score >= 30) return { label: 'Savings Unlocked', unlocks: 'savings' };
  return { label: 'Keep Logging', unlocks: 'none' };
}

/**
 * Helper: standard deviation
 */
function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

module.exports = {
  calculateWorkerSabiScore,
  calculateTraderSabiScore,
  getTier,
  WEIGHTS
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/sabiScore.js
git commit -m "feat: add SabiScore credit scoring service for workers and traders"
```

---

### Task 3: WebSocket Server (Dashboard Live Feed)

**Files:**
- Create: `backend/src/utils/websocket.js`

- [ ] **Step 1: Create WebSocket server with Redis pub/sub**

```javascript
// backend/src/utils/websocket.js
const WebSocket = require('ws');
const Redis = require('ioredis');
const config = require('../config');

let wss = null;
let subscriber = null;

/**
 * Initialize WebSocket server on the existing HTTP server
 * Subscribes to Redis 'dashboard_events' channel and broadcasts to all connected clients
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/dashboard/feed' });

  wss.on('connection', (ws) => {
    console.log('Dashboard client connected');

    ws.on('close', () => {
      console.log('Dashboard client disconnected');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to SabiWork live feed',
      timestamp: new Date().toISOString()
    }));
  });

  // Subscribe to Redis pub/sub for dashboard events
  subscriber = new Redis(config.redisUrl);

  subscriber.subscribe('dashboard_events', (err) => {
    if (err) {
      console.error('Redis subscribe error:', err);
      return;
    }
    console.log('WebSocket subscribed to dashboard_events channel');
  });

  subscriber.on('message', (channel, message) => {
    if (channel === 'dashboard_events') {
      broadcast(message);
    }
  });

  console.log('WebSocket server initialized at /dashboard/feed');
}

/**
 * Broadcast a message to all connected dashboard clients
 * @param {string|Object} data - Message to broadcast (stringified if object)
 */
function broadcast(data) {
  if (!wss) return;

  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Broadcast an event directly (without going through Redis)
 * Useful for events generated within the same process
 */
function broadcastEvent(event) {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });
  broadcast(payload);
}

/**
 * Get count of connected clients
 */
function getClientCount() {
  if (!wss) return 0;
  return wss.clients.size;
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastEvent,
  getClientCount
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/utils/websocket.js
git commit -m "feat: add WebSocket server with Redis pub/sub for dashboard live feed"
```

---

### Task 4: Wire WebSocket into Express Server

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Update index.js to initialize WebSocket**

Replace the contents of `backend/src/index.js` with:

```javascript
// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const config = require('./config');
const { initWebSocket } = require('./utils/websocket');

const app = express();
const server = createServer(app);

// Initialize WebSocket server
initWebSocket(server);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const { getClientCount } = require('./utils/websocket');
  res.json({
    status: 'ok',
    service: 'sabiwork-backend',
    timestamp: new Date().toISOString(),
    dashboard_clients: getClientCount()
  });
});

// API routes
app.use('/api/payments', require('./routes/payments'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Route index
app.get('/api', (req, res) => {
  res.json({
    message: 'SabiWork API v1.0',
    routes: [
      'POST /api/payments/initiate',
      'GET /api/payments/verify/:ref',
      'POST /api/payments/payout',
      'POST /api/webhooks/squad',
      'WS /dashboard/feed'
    ]
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`SabiWork backend running on port ${config.port}`);
  console.log(`WebSocket feed available at ws://localhost:${config.port}/dashboard/feed`);
});

module.exports = { app, server };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: wire WebSocket server into Express app"
```

---

### Task 5: Integrate Trust Score into Webhook Handler

**Files:**
- Modify: `backend/src/routes/webhooks.js`

- [ ] **Step 1: Add trust score update to handleChargeSuccessful**

In `backend/src/routes/webhooks.js`, add the import at the top of the file (after existing requires):

```javascript
const trustService = require('../services/trust');
const sabiScoreService = require('../services/sabiScore');
```

Then replace the `handleChargeSuccessful` function with:

```javascript
async function handleChargeSuccessful(transactionRef, payload) {
  const amount = (payload.data?.amount || payload.amount || 0) / 100; // kobo to Naira
  const channel = payload.data?.payment_channel || payload.payment_channel || 'unknown';
  const metadata = payload.data?.meta || payload.meta || {};

  // Find and update the job
  const job = await knex('jobs')
    .where({ transaction_ref: transactionRef })
    .first();

  if (job) {
    await knex('jobs')
      .where({ id: job.id })
      .update({
        status: 'paid',
        payment_channel: channel,
        paid_at: new Date()
      });

    // Log demand signal
    await knex('demand_signals').insert({
      trade_category: job.service_category,
      area: job.area,
      location_lat: job.location_lat,
      location_lng: job.location_lng,
      request_type: 'buyer_request',
      amount: job.agreed_amount,
      matched: true,
      payment_channel: channel,
      recorded_at: new Date()
    });

    // Update trust score
    if (job.worker_id) {
      const trustResult = await trustService.applyTrustEvent(job.worker_id, 'payment_received', {
        jobId: job.id,
        paymentTimestamp: new Date(),
        jobCreatedAt: job.created_at,
        paymentChannel: channel,
        buyerId: job.buyer_id
      });

      // Recalculate SabiScore
      const sabiResult = await sabiScoreService.calculateWorkerSabiScore(job.worker_id);

      // Broadcast event with trust + sabi updates
      await redis.publish('dashboard_events', JSON.stringify({
        type: 'payment_received',
        amount,
        channel,
        area: job.area,
        trade: job.service_category,
        worker_id: job.worker_id,
        trust_update: {
          before: trustResult.previousScore,
          after: trustResult.newScore,
          tier: trustResult.tier.label
        },
        sabi_score: sabiResult.score,
        transaction_ref: transactionRef,
        timestamp: new Date().toISOString()
      }));

      return;
    }
  }

  // Fallback broadcast (no job found — might be direct VA payment)
  await redis.publish('dashboard_events', JSON.stringify({
    type: 'payment_received',
    amount,
    channel,
    area: metadata.area,
    trade: metadata.service_category,
    transaction_ref: transactionRef,
    timestamp: new Date().toISOString()
  }));
}
```

- [ ] **Step 2: Update handleVirtualAccountCredit to recalculate SabiScore**

Replace the `handleVirtualAccountCredit` function with:

```javascript
async function handleVirtualAccountCredit(transactionRef, payload) {
  const amount = (payload.data?.amount || payload.amount || 0) / 100;
  const virtualAccountNumber = payload.data?.virtual_account_number;

  if (!virtualAccountNumber) return;

  // Find worker by virtual account
  let worker = await knex('workers')
    .where({ virtual_account_number: virtualAccountNumber })
    .first();

  if (worker) {
    await knex('workers')
      .where({ id: worker.id })
      .update({
        total_income: knex.raw('total_income + ?', [amount]),
        last_active_at: new Date()
      });

    // Update trust score (payment received)
    const trustResult = await trustService.applyTrustEvent(worker.id, 'payment_received', {
      paymentChannel: 'transfer'
    });

    // Recalculate SabiScore
    const sabiResult = await sabiScoreService.calculateWorkerSabiScore(worker.id);

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'va_credit',
      amount,
      worker_name: worker.name,
      area: worker.service_areas?.[0],
      trust_score: trustResult.newScore,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Check traders
  let trader = await knex('traders')
    .where({ virtual_account_number: virtualAccountNumber })
    .first();

  if (trader) {
    await knex('sales_logs').insert({
      trader_id: trader.id,
      amount,
      item_name: 'Auto-logged (VA credit)',
      category: trader.business_type || 'other',
      payment_method: 'squad',
      squad_ref: transactionRef,
      logged_at: new Date()
    });

    await knex('traders')
      .where({ id: trader.id })
      .update({
        total_logged_sales: knex.raw('total_logged_sales + 1'),
        total_logged_revenue: knex.raw('total_logged_revenue + ?', [amount])
      });

    // Recalculate trader SabiScore
    const sabiResult = await sabiScoreService.calculateTraderSabiScore(trader.id);

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'sale_logged',
      amount,
      trader_name: trader.name,
      area: trader.area,
      category: trader.business_type,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/webhooks.js
git commit -m "feat: integrate trust score and SabiScore into webhook processing"
```

---

### Task 6: Trust Score Update on Job Completion + Rating

**Files:**
- Create: `backend/src/routes/jobs.js` (partial — just the completion endpoint)

- [ ] **Step 1: Create job completion route**

```javascript
// backend/src/routes/jobs.js
const { Router } = require('express');
const knex = require('../database/knex');
const redis = require('../utils/redis');
const trustService = require('../services/trust');
const sabiScoreService = require('../services/sabiScore');

const router = Router();

/**
 * POST /api/jobs/:id/complete
 * Buyer confirms job completion and rates the worker
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const job = await knex('jobs').where({ id }).first();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'paid' && job.status !== 'in_progress') {
      return res.status(400).json({ error: 'Job must be paid or in_progress to complete' });
    }

    // Update job
    await knex('jobs')
      .where({ id })
      .update({
        status: 'completed',
        buyer_rating: rating,
        completed_at: new Date()
      });

    // Apply rating trust event
    const trustResult = await trustService.applyTrustEvent(job.worker_id, 'rating', {
      jobId: id,
      rating
    });

    // Recalculate SabiScore
    const sabiResult = await sabiScoreService.calculateWorkerSabiScore(job.worker_id);

    // Get worker for response
    const worker = await knex('workers').where({ id: job.worker_id }).first();

    // Broadcast
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'job_completed',
      worker_name: worker.name,
      area: job.area,
      trade: job.service_category,
      rating,
      trust_score: trustResult.newScore,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));

    return res.status(200).json({
      success: true,
      job_id: id,
      rating,
      trust: {
        previous: trustResult.previousScore,
        current: trustResult.newScore,
        delta: trustResult.delta,
        tier: trustResult.tier
      },
      sabi_score: sabiResult.score,
      sabi_tier: sabiResult.tier
    });
  } catch (error) {
    console.error('Job completion error:', error);
    return res.status(500).json({ error: 'Failed to complete job', details: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Get job details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await knex('jobs').where({ id }).first();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(job);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Mount jobs route in index.js**

Add this line to `backend/src/index.js` after the existing route mounts:

```javascript
app.use('/api/jobs', require('./routes/jobs'));
```

And add to the routes array in the `/api` endpoint:

```javascript
'POST /api/jobs/:id/complete',
'GET /api/jobs/:id',
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/jobs.js backend/src/index.js
git commit -m "feat: add job completion route with rating, trust update, and SabiScore recalc"
```

---

### Task 7: Test the Complete Flow

- [ ] **Step 1: Start services**

```bash
docker-compose up --build
```

- [ ] **Step 2: Test WebSocket connection**

```bash
# Install wscat if not available
npx wscat -c ws://localhost:3000/dashboard/feed
# Expected: {"type":"connected","message":"Connected to SabiWork live feed",...}
```

- [ ] **Step 3: Test health endpoint shows dashboard clients**

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok",...,"dashboard_clients":1} (if wscat still connected)
```

- [ ] **Step 4: Verify Redis pub/sub works**

In a separate terminal while wscat is connected:

```bash
docker-compose exec redis redis-cli PUBLISH dashboard_events '{"type":"test","message":"hello dashboard"}'
# wscat should receive: {"type":"test","message":"hello dashboard"}
```

- [ ] **Step 5: Test webhook with trust score (simulated)**

First, insert a test worker and buyer directly:

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "
INSERT INTO workers (id, name, phone, primary_trade, service_areas, trust_score, bank_code, account_number, account_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Emeka', '2348012345678', 'plumbing', '{Yaba,Surulere}', 0.5, '090267', '2012345678', 'Test Emeka');

INSERT INTO buyers (id, name, phone, email)
VALUES ('22222222-2222-2222-2222-222222222222', 'Test Buyer', '2348087654321', 'buyer@test.com');

INSERT INTO jobs (id, buyer_id, worker_id, service_category, area, agreed_amount, status, transaction_ref)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'plumbing', 'Yaba', 5000, 'payment_pending', 'SABI_TEST_123');
"
```

Then test job completion:

```bash
curl -X POST http://localhost:3000/api/jobs/33333333-3333-3333-3333-333333333333/complete \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}'
```

Expected response:
```json
{
  "success": true,
  "job_id": "33333333-...",
  "rating": 5,
  "trust": {
    "previous": 0.5,
    "current": 0.514,
    "delta": 0.014,
    "tier": { "label": "Trusted", "emoji": "✅" }
  },
  "sabi_score": ...,
  "sabi_tier": ...
}
```

And the wscat terminal should show the `job_completed` event broadcast.

- [ ] **Step 6: Verify trust_events table logged the event**

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "SELECT * FROM trust_events;"
# Expected: 1 row with event_type='rating', score_delta > 0
```

- [ ] **Step 7: Clean up test data**

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "
DELETE FROM trust_events;
DELETE FROM jobs;
DELETE FROM workers;
DELETE FROM buyers;
"
```

---

## Summary

After completing this plan you have:
- Trust score service with event-driven calculation (8 signal types, dampening, tier promotion)
- SabiScore service for workers (7 weighted factors, 90-day window)
- SabiScore service for traders (adapted factors for sales-log-based identity)
- WebSocket server (Redis pub/sub → all connected dashboard clients)
- Trust score automatically updates on every webhook payment event
- SabiScore recalculates on every payment and job completion
- Job completion route with rating → trust + SabiScore cascade
- All events broadcast to dashboard in real-time
- Ready for Plan 4 (AI/Groq integration) and Plan 5 (remaining API routes)
