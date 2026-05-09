# Plan 5: Backend API Routes (Workers, Traders, Seekers, Intelligence)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining REST API routes — worker onboarding/CRUD, trader profiles and reports, job seeker profiles, and the Economic Intelligence endpoints that power the dashboard.

**Architecture:** Each route file handles one domain. Onboarding routes call Squad (virtual account + account lookup). Intelligence routes aggregate data from demand_signals, workers, and sales_logs tables for the dashboard.

**Tech Stack:** Express 5, Knex, Squad service (from Plan 2), shared constants

**Depends on:** Plan 1 (database), Plan 2 (Squad service), Plan 3 (trust + SabiScore), Plan 4 (demand service)

---

## File Structure

```
backend/src/routes/
├── workers.js            # Worker onboarding, CRUD, availability
├── traders.js            # Trader registration, sales logging, reports
├── seekers.js            # Job seeker profiles, apprenticeship applications
├── jobs.js               # Job CRUD, status updates, rating
└── intelligence.js       # EI Engine endpoints (stats, gaps, heat, channels, forecast)
```

---

### Task 1: Workers Route (Onboarding + CRUD)

**Files:**
- Create: `backend/src/routes/workers.js`

- [ ] **Step 1: Create workers route**

```javascript
// backend/src/routes/workers.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const redis = require('../utils/redis');
const { applyTrustEvent } = require('../services/trust');
const { SUPPORTED_BANKS } = require('../../shared/constants');

const router = Router();

/**
 * POST /api/workers/onboard
 * Register a new worker — verifies bank, creates virtual account
 */
router.post('/onboard', async (req, res) => {
  try {
    const {
      name, phone, primary_trade, secondary_trades,
      service_areas, bank_name, account_number,
      location_lat, location_lng,
      onboarding_channel, onboarded_by
    } = req.body;

    if (!name || !phone || !primary_trade) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, primary_trade' });
    }

    // Check if already registered
    const existing = await knex('workers').where({ phone }).first();
    if (existing) {
      return res.status(409).json({ error: 'Worker already registered', worker_id: existing.id });
    }

    // Resolve bank code
    let bankCode = null;
    if (bank_name && account_number) {
      const bank = SUPPORTED_BANKS.find(b =>
        b.name.toLowerCase() === bank_name.toLowerCase()
      );
      if (!bank) {
        return res.status(400).json({ error: `Unsupported bank: ${bank_name}. Supported: ${SUPPORTED_BANKS.map(b => b.name).join(', ')}` });
      }
      bankCode = bank.code;
    }

    // Verify bank account via Squad
    let accountName = name;
    if (bankCode && account_number) {
      try {
        const lookup = await squadService.lookupAccount(bankCode, account_number);
        accountName = lookup.accountName;
      } catch (lookupError) {
        console.error('Bank lookup failed:', lookupError.message);
        // Continue with provided name — don't block onboarding
      }
    }

    // Insert worker
    const [worker] = await knex('workers').insert({
      name,
      phone,
      primary_trade,
      secondary_trades: secondary_trades || [],
      service_areas: service_areas || [],
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      bank_code: bankCode,
      account_number: account_number || null,
      account_name: accountName,
      trust_score: onboarding_channel === 'field_agent' ? 0.05 : 0.0,
      onboarding_channel: onboarding_channel || 'whatsapp',
      onboarded_by: onboarded_by || null,
      gps_verified: !!(location_lat && location_lng && onboarding_channel === 'field_agent')
    }).returning('*');

    // Create Squad virtual account
    let virtualAccountNumber = null;
    try {
      const nameParts = name.split(' ');
      const va = await squadService.createVirtualAccount({
        customerId: worker.id,
        firstName: nameParts[0] || name,
        lastName: nameParts.slice(1).join(' ') || name,
        phone,
        email: `${worker.id}@sabiwork.ng`
      });
      virtualAccountNumber = va.accountNumber;

      await knex('workers')
        .where({ id: worker.id })
        .update({ virtual_account_number: virtualAccountNumber });
    } catch (vaError) {
      console.error('Virtual account creation failed:', vaError.message);
      // Non-blocking — worker still registered
    }

    // Apply agent-verified trust bonus
    if (onboarding_channel === 'field_agent') {
      await applyTrustEvent(worker.id, 'agent_verified', {});
    }

    // Broadcast to dashboard
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'worker_onboarded',
      worker_name: name,
      trade: primary_trade,
      area: service_areas?.[0] || 'Lagos',
      channel: onboarding_channel || 'whatsapp',
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      worker_id: worker.id,
      name,
      phone,
      primary_trade,
      service_areas,
      bank_verified: !!bankCode,
      account_name: accountName,
      virtual_account_number: virtualAccountNumber,
      trust_score: onboarding_channel === 'field_agent' ? 0.05 : 0.0
    });
  } catch (error) {
    console.error('Worker onboarding error:', error);
    return res.status(500).json({ error: 'Onboarding failed', details: error.message });
  }
});

/**
 * GET /api/workers
 * List workers with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { trade, area, available, limit = 50 } = req.query;

    let query = knex('workers').orderBy('trust_score', 'desc').limit(parseInt(limit));

    if (trade) query = query.where('primary_trade', trade);
    if (area) query = query.whereRaw('? = ANY(service_areas)', [area]);
    if (available === 'true') query = query.where('is_available', true);

    const workers = await query;
    return res.status(200).json(workers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

/**
 * GET /api/workers/:id
 * Get single worker profile
 */
router.get('/:id', async (req, res) => {
  try {
    const worker = await knex('workers').where({ id: req.params.id }).first();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Get recent jobs
    const recentJobs = await knex('jobs')
      .where({ worker_id: worker.id })
      .whereIn('status', ['completed', 'payout_sent'])
      .orderBy('completed_at', 'desc')
      .limit(5);

    return res.status(200).json({ ...worker, recent_jobs: recentJobs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch worker' });
  }
});

/**
 * PATCH /api/workers/:id/availability
 * Toggle worker availability
 */
router.patch('/:id/availability', async (req, res) => {
  try {
    const { is_available } = req.body;
    await knex('workers')
      .where({ id: req.params.id })
      .update({ is_available, last_active_at: new Date() });

    return res.status(200).json({ success: true, is_available });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update availability' });
  }
});

/**
 * PATCH /api/workers/:id/location
 * Update worker's GPS location
 */
router.patch('/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await knex('workers')
      .where({ id: req.params.id })
      .update({ location_lat: lat, location_lng: lng, last_active_at: new Date() });

    await redis.del(`worker_location:${req.params.id}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/workers.js
git commit -m "feat: add workers route (onboarding with Squad VA, CRUD, availability, location)"
```

---

### Task 2: Traders Route (Registration + Sales + Reports)

**Files:**
- Create: `backend/src/routes/traders.js`

- [ ] **Step 1: Create traders route**

```javascript
// backend/src/routes/traders.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const redis = require('../utils/redis');
const { classifySale } = require('../services/nlp');
const { calculateTraderSabiScore } = require('../services/sabiScore');

const router = Router();

/**
 * POST /api/traders/register
 * Register a new trader
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, business_type, area, location_lat, location_lng } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }

    const existing = await knex('traders').where({ phone }).first();
    if (existing) {
      return res.status(409).json({ error: 'Trader already registered', trader_id: existing.id });
    }

    const [trader] = await knex('traders').insert({
      name,
      phone,
      business_type: business_type || 'other',
      area: area || 'Lagos',
      location_lat,
      location_lng
    }).returning('*');

    // Create virtual account for trader
    let virtualAccountNumber = null;
    try {
      const nameParts = name.split(' ');
      const va = await squadService.createVirtualAccount({
        customerId: trader.id,
        firstName: nameParts[0] || name,
        lastName: nameParts.slice(1).join(' ') || name,
        phone,
        email: `trader_${trader.id}@sabiwork.ng`
      });
      virtualAccountNumber = va.accountNumber;

      await knex('traders')
        .where({ id: trader.id })
        .update({ virtual_account_number: virtualAccountNumber });
    } catch (vaError) {
      console.error('Trader VA creation failed:', vaError.message);
    }

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'trader_registered',
      trader_name: name,
      area,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      trader_id: trader.id,
      name,
      phone,
      business_type,
      virtual_account_number: virtualAccountNumber
    });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

/**
 * POST /api/traders/log-sale
 * Log a sale from WhatsApp message (parsed by NLP)
 */
router.post('/log-sale', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Missing phone or message' });
    }

    const trader = await knex('traders').where({ phone }).first();
    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    // Parse sale via NLP
    const sale = await classifySale(message);
    if (!sale) {
      return res.status(400).json({ error: 'Could not parse sale message' });
    }

    // Insert sale log
    await knex('sales_logs').insert({
      trader_id: trader.id,
      amount: sale.amount,
      item_name: sale.item_name,
      quantity: sale.quantity,
      category: sale.category,
      payment_method: 'cash',
      logged_at: new Date()
    });

    // Update trader totals
    await knex('traders')
      .where({ id: trader.id })
      .update({
        total_logged_sales: knex.raw('total_logged_sales + 1'),
        total_logged_revenue: knex.raw('total_logged_revenue + ?', [sale.amount])
      });

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const todayStats = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', today)
      .select(knex.raw('COALESCE(SUM(amount), 0) as total'), knex.raw('COUNT(*) as count'))
      .first();

    const weekTotal = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .sum('amount as total')
      .first();

    // Recalculate SabiScore
    const previousScore = trader.sabi_score;
    const sabiResult = await calculateTraderSabiScore(trader.id);
    const weeksToLoan = sabiResult.score >= 50 ? 0 : Math.ceil((50 - sabiResult.score) / 2);

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'sale_logged',
      amount: sale.amount,
      trader_name: trader.name,
      area: trader.area,
      category: sale.category,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));

    return res.status(200).json({
      success: true,
      sale,
      trader_stats: {
        today_total: parseInt(todayStats.total) || 0,
        today_count: parseInt(todayStats.count) || 0,
        week_total: parseInt(weekTotal.total) || 0,
        sabi_score_before: previousScore,
        sabi_score_after: sabiResult.score,
        weeks_to_loan: weeksToLoan
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sale logging failed', details: error.message });
  }
});

/**
 * GET /api/traders/report
 * Get weekly report for a trader
 */
router.get('/report', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const trader = await knex('traders').where({ phone }).first();
    if (!trader) return res.status(404).json({ error: 'Trader not found' });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const prevWeekStart = new Date();
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);

    // This week
    const thisWeek = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .select(
        knex.raw('COALESCE(SUM(amount), 0) as revenue'),
        knex.raw('COUNT(*) as count')
      )
      .first();

    // Previous week (for trend)
    const prevWeek = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .whereBetween('logged_at', [prevWeekStart, weekStart])
      .sum('amount as revenue')
      .first();

    const thisRevenue = parseInt(thisWeek.revenue) || 0;
    const prevRevenue = parseInt(prevWeek.revenue) || 1;
    const trendPct = Math.round(((thisRevenue - prevRevenue) / prevRevenue) * 100);
    const trend = trendPct >= 0 ? `↑${trendPct}%` : `↓${Math.abs(trendPct)}%`;

    // Top item
    const topItem = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .select('item_name', 'category')
      .sum('amount as total')
      .groupBy('item_name', 'category')
      .orderByRaw('SUM(amount) DESC')
      .first();

    // Best day
    const bestDay = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .select(knex.raw("TO_CHAR(logged_at, 'Day') as day_name"))
      .sum('amount as total')
      .groupByRaw("TO_CHAR(logged_at, 'Day')")
      .orderByRaw('SUM(amount) DESC')
      .first();

    const topPct = thisRevenue > 0 && topItem
      ? Math.round((parseInt(topItem.total) / thisRevenue) * 100)
      : 0;

    return res.status(200).json({
      business_name: `${trader.name} ${trader.business_type || ''}`.trim(),
      week_revenue: thisRevenue,
      week_count: parseInt(thisWeek.count) || 0,
      trend,
      top_item: topItem?.item_name || 'N/A',
      top_amount: parseInt(topItem?.total) || 0,
      top_pct: topPct,
      best_day: bestDay?.day_name?.trim() || 'N/A',
      best_day_amount: parseInt(bestDay?.total) || 0,
      sabi_score: trader.sabi_score
    });
  } catch (error) {
    return res.status(500).json({ error: 'Report generation failed' });
  }
});

/**
 * GET /api/traders/:id/daily-stats
 * Get today's summary for a trader
 */
router.get('/:id/daily-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await knex('sales_logs')
      .where({ trader_id: req.params.id })
      .where('logged_at', '>=', today)
      .select(
        knex.raw('COALESCE(SUM(amount), 0) as total'),
        knex.raw('COUNT(*) as count')
      )
      .first();

    const trader = await knex('traders').where({ id: req.params.id }).first();

    return res.status(200).json({
      total: parseInt(stats.total) || 0,
      count: parseInt(stats.count) || 0,
      sabi_score: trader?.sabi_score || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get daily stats' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/traders.js
git commit -m "feat: add traders route (registration, sale logging, weekly report, daily stats)"
```

---

### Task 3: Seekers Route (Profiles + Apprenticeships)

**Files:**
- Create: `backend/src/routes/seekers.js`

- [ ] **Step 1: Create seekers route**

```javascript
// backend/src/routes/seekers.js
const { Router } = require('express');
const knex = require('../database/knex');
const redis = require('../utils/redis');
const { generatePathwayRecommendation } = require('../services/demand');

const router = Router();

/**
 * POST /api/seekers/register
 * Register a job seeker
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, area, location_lat, location_lng, interests } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }

    const existing = await knex('seekers').where({ phone }).first();
    if (existing) {
      return res.status(409).json({ error: 'Already registered', seeker_id: existing.id });
    }

    const [seeker] = await knex('seekers').insert({
      name,
      phone,
      area,
      location_lat,
      location_lng,
      interests: interests || []
    }).returning('*');

    return res.status(201).json({ success: true, seeker_id: seeker.id, name, area });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/seekers
 * Get seeker by phone
 */
router.get('/', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const seeker = await knex('seekers').where({ phone }).first();
    if (!seeker) return res.status(404).json(null);

    return res.status(200).json(seeker);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch seeker' });
  }
});

/**
 * GET /api/seekers/:id/pathway
 * Get pathway recommendation for a seeker
 */
router.get('/:id/pathway', async (req, res) => {
  try {
    const seeker = await knex('seekers').where({ id: req.params.id }).first();
    if (!seeker) return res.status(404).json({ error: 'Seeker not found' });

    const pathway = await generatePathwayRecommendation(
      seeker.location_lat ? parseFloat(seeker.location_lat) : null,
      seeker.location_lng ? parseFloat(seeker.location_lng) : null,
      seeker.area
    );

    return res.status(200).json(pathway);
  } catch (error) {
    return res.status(500).json({ error: 'Pathway generation failed' });
  }
});

/**
 * POST /api/seekers/:id/apply
 * Apply for an apprenticeship
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const { master_worker_id, trade } = req.body;
    const seekerId = req.params.id;

    if (!master_worker_id || !trade) {
      return res.status(400).json({ error: 'Missing master_worker_id or trade' });
    }

    // Verify master worker accepts apprentices
    const master = await knex('workers').where({ id: master_worker_id }).first();
    if (!master || !master.accepts_apprentices || master.apprentice_slots <= 0) {
      return res.status(400).json({ error: 'Worker not accepting apprentices' });
    }

    // Check for existing active apprenticeship
    const existing = await knex('apprenticeships')
      .where({ apprentice_id: seekerId, status: 'active' })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'Already in an active apprenticeship' });
    }

    // Create apprenticeship
    const [apprenticeship] = await knex('apprenticeships').insert({
      master_worker_id,
      apprentice_id: seekerId,
      trade,
      duration_weeks: 12,
      weekly_stipend: 3000,
      status: 'active',
      milestones_completed: 0,
      total_milestones: 8
    }).returning('*');

    // Decrement master's open slots
    await knex('workers')
      .where({ id: master_worker_id })
      .update({ apprentice_slots: knex.raw('apprentice_slots - 1') });

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'apprenticeship_started',
      trade,
      area: master.service_areas?.[0],
      master_name: master.name,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      apprenticeship_id: apprenticeship.id,
      master_name: master.name,
      trade,
      duration_weeks: 12
    });
  } catch (error) {
    return res.status(500).json({ error: 'Application failed' });
  }
});

/**
 * GET /api/seekers/:id/apprenticeship
 * Get active apprenticeship status
 */
router.get('/:id/apprenticeship', async (req, res) => {
  try {
    const apprenticeship = await knex('apprenticeships')
      .where({ apprentice_id: req.params.id, status: 'active' })
      .join('workers', 'apprenticeships.master_worker_id', 'workers.id')
      .select(
        'apprenticeships.*',
        'workers.name as master_name',
        'workers.trust_score as master_trust'
      )
      .first();

    if (!apprenticeship) {
      return res.status(200).json(null);
    }

    return res.status(200).json(apprenticeship);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch apprenticeship' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/seekers.js
git commit -m "feat: add seekers route (registration, pathway, apprenticeship application)"
```

---

### Task 4: Intelligence Route (Dashboard Data Endpoints)

**Files:**
- Create: `backend/src/routes/intelligence.js`

- [ ] **Step 1: Create intelligence route**

```javascript
// backend/src/routes/intelligence.js
const { Router } = require('express');
const knex = require('../database/knex');
const { getDemandByArea, getDemandNearPoint, getDemandHeatData, getCoverageGaps } = require('../services/demand');

const router = Router();

/**
 * GET /api/intelligence/stats
 * Dashboard top-level stats
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [volumeToday, jobsToday, workersPaid, tradersActive, sabiDistribution] = await Promise.all([
      // Total payment volume today
      knex('jobs')
        .where('paid_at', '>=', today)
        .sum('agreed_amount as total')
        .first(),

      // Jobs completed or paid today
      knex('jobs')
        .where('paid_at', '>=', today)
        .count('id as count')
        .first(),

      // Distinct workers who received payouts today
      knex('jobs')
        .where('completed_at', '>=', today)
        .where('payout_status', 'success')
        .countDistinct('worker_id as count')
        .first(),

      // Traders who logged sales today
      knex('sales_logs')
        .where('logged_at', '>=', today)
        .countDistinct('trader_id as count')
        .first(),

      // SabiScore distribution (workers + traders)
      knex.raw(`
        SELECT
          CASE
            WHEN score < 30 THEN '0-29'
            WHEN score < 50 THEN '30-49'
            WHEN score < 70 THEN '50-69'
            ELSE '70+'
          END as bucket,
          COUNT(*) as count
        FROM (
          SELECT sabi_score as score FROM workers WHERE sabi_score > 0
          UNION ALL
          SELECT sabi_score as score FROM traders WHERE sabi_score > 0
        ) scores
        GROUP BY bucket
        ORDER BY bucket
      `)
    ]);

    return res.status(200).json({
      volume_today: parseInt(volumeToday.total) || 0,
      jobs_today: parseInt(jobsToday.count) || 0,
      workers_paid: parseInt(workersPaid.count) || 0,
      traders_active: parseInt(tradersActive.count) || 0,
      sabi_score_distribution: sabiDistribution.rows || []
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/intelligence/gaps
 * Skills gap analysis for dashboard
 */
router.get('/gaps', async (req, res) => {
  try {
    const { trade } = req.query;
    const gaps = await getCoverageGaps(trade || null);
    return res.status(200).json(gaps);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch gaps' });
  }
});

/**
 * GET /api/intelligence/demand-heat
 * Heat map data for map overlay
 */
router.get('/demand-heat', async (req, res) => {
  try {
    const { north, south, east, west, trade, days } = req.query;

    if (!north || !south || !east || !west) {
      return res.status(400).json({ error: 'Bounds required: north, south, east, west' });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    const data = await getDemandHeatData(bounds, trade || null, parseInt(days) || 30);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch heat map data' });
  }
});

/**
 * GET /api/intelligence/channels
 * Payment channel breakdown
 */
router.get('/channels', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const channels = await knex('jobs')
      .where('paid_at', '>=', thirtyDaysAgo)
      .whereNotNull('payment_channel')
      .select('payment_channel')
      .count('* as count')
      .groupBy('payment_channel')
      .orderByRaw('COUNT(*) DESC');

    const total = channels.reduce((sum, c) => sum + parseInt(c.count), 0);

    const result = channels.map(c => ({
      channel: c.payment_channel,
      count: parseInt(c.count),
      percentage: total > 0 ? Math.round((parseInt(c.count) / total) * 100) : 0
    }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

/**
 * GET /api/intelligence/forecast
 * Simple demand forecast for a trade/area
 */
router.get('/forecast', async (req, res) => {
  try {
    const { trade, area, weeks = 4 } = req.query;

    if (!trade || !area) {
      return res.status(400).json({ error: 'trade and area required' });
    }

    // Get weekly demand for past 12 weeks
    const weeklyDemand = await knex('demand_signals')
      .where({ trade_category: trade, area })
      .where('recorded_at', '>=', knex.raw("NOW() - INTERVAL '12 weeks'"))
      .select(knex.raw("DATE_TRUNC('week', recorded_at) as week"))
      .count('* as requests')
      .groupByRaw("DATE_TRUNC('week', recorded_at)")
      .orderBy('week', 'asc');

    if (weeklyDemand.length < 2) {
      return res.status(200).json({ message: 'Not enough data for forecast', data: [] });
    }

    const values = weeklyDemand.map(w => parseInt(w.requests));
    const avgWeekly = values.reduce((a, b) => a + b, 0) / values.length;

    // Simple linear trend
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = avgWeekly;
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const trendPct = avgWeekly > 0 ? Math.round((slope / avgWeekly) * 100) : 0;

    const trendDirection = trendPct > 5 ? 'growing' : trendPct < -5 ? 'declining' : 'stable';

    // Forecast next N weeks
    const forecast = [];
    for (let i = 1; i <= parseInt(weeks); i++) {
      forecast.push(Math.round(avgWeekly + slope * (n + i - 1 - xMean)));
    }

    return res.status(200).json({
      trade,
      area,
      current_weekly_avg: Math.round(avgWeekly),
      trend_direction: trendDirection,
      trend_pct: trendPct,
      forecast_weekly: forecast,
      historical: weeklyDemand
    });
  } catch (error) {
    return res.status(500).json({ error: 'Forecast failed' });
  }
});

/**
 * GET /api/intelligence/financial-inclusion
 * Financial inclusion metrics
 */
router.get('/financial-inclusion', async (req, res) => {
  try {
    const [score30Plus, loanEligible, withVA] = await Promise.all([
      knex.raw(`
        SELECT COUNT(*) as count FROM (
          SELECT sabi_score FROM workers WHERE sabi_score >= 30
          UNION ALL
          SELECT sabi_score FROM traders WHERE sabi_score >= 30
        ) t
      `),
      knex.raw(`
        SELECT COUNT(*) as count FROM (
          SELECT sabi_score FROM workers WHERE sabi_score >= 50
          UNION ALL
          SELECT sabi_score FROM traders WHERE sabi_score >= 50
        ) t
      `),
      knex.raw(`
        SELECT COUNT(*) as count FROM (
          SELECT virtual_account_number FROM workers WHERE virtual_account_number IS NOT NULL
          UNION ALL
          SELECT virtual_account_number FROM traders WHERE virtual_account_number IS NOT NULL
        ) t
      `)
    ]);

    return res.status(200).json({
      score_30_plus: parseInt(score30Plus.rows[0].count) || 0,
      loan_eligible: parseInt(loanEligible.rows[0].count) || 0,
      with_virtual_account: parseInt(withVA.rows[0].count) || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch inclusion metrics' });
  }
});

/**
 * GET /api/intelligence/pathway
 * Pathway data for job seekers (called by chat + PWA)
 */
router.get('/pathway', async (req, res) => {
  try {
    const { lat, lng, area } = req.query;
    const { generatePathwayRecommendation } = require('../services/demand');

    const pathway = await generatePathwayRecommendation(
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
      area
    );

    return res.status(200).json(pathway);
  } catch (error) {
    return res.status(500).json({ error: 'Pathway generation failed' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/intelligence.js
git commit -m "feat: add intelligence route (stats, gaps, heat map, channels, forecast, inclusion)"
```

---

### Task 5: Mount All Routes + Final index.js

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Update index.js with all route mounts**

Replace `backend/src/index.js` with:

```javascript
// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const config = require('./config');
const { initWebSocket, getClientCount } = require('./utils/websocket');

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
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/traders', require('./routes/traders'));
app.use('/api/seekers', require('./routes/seekers'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/intelligence', require('./routes/intelligence'));

// Route index
app.get('/api', (req, res) => {
  res.json({
    message: 'SabiWork API v1.0',
    routes: [
      'POST   /api/chat',
      'POST   /api/payments/initiate',
      'GET    /api/payments/verify/:ref',
      'POST   /api/payments/payout',
      'POST   /api/webhooks/squad',
      'POST   /api/workers/onboard',
      'GET    /api/workers',
      'GET    /api/workers/:id',
      'PATCH  /api/workers/:id/availability',
      'PATCH  /api/workers/:id/location',
      'POST   /api/traders/register',
      'POST   /api/traders/log-sale',
      'GET    /api/traders/report',
      'POST   /api/seekers/register',
      'GET    /api/seekers',
      'GET    /api/seekers/:id/pathway',
      'POST   /api/seekers/:id/apply',
      'POST   /api/jobs/:id/complete',
      'GET    /api/jobs/:id',
      'GET    /api/intelligence/stats',
      'GET    /api/intelligence/gaps',
      'GET    /api/intelligence/demand-heat',
      'GET    /api/intelligence/channels',
      'GET    /api/intelligence/forecast',
      'GET    /api/intelligence/financial-inclusion',
      'GET    /api/intelligence/pathway',
      'WS     /dashboard/feed'
    ]
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`SabiWork backend running on port ${config.port}`);
  console.log(`WebSocket feed available at ws://localhost:${config.port}/dashboard/feed`);
  console.log(`API index at http://localhost:${config.port}/api`);
});

module.exports = { app, server };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: mount all API routes — backend complete"
```

---

### Task 6: Verify All Routes

- [ ] **Step 1: Rebuild and start**

```bash
docker-compose up --build
```

- [ ] **Step 2: Check API index**

```bash
curl http://localhost:3000/api | python3 -m json.tool
# Expected: All 27 routes listed
```

- [ ] **Step 3: Test worker onboarding**

```bash
curl -X POST http://localhost:3000/api/workers/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emeka Adeyemi",
    "phone": "2348011111111",
    "primary_trade": "plumbing",
    "service_areas": ["Yaba", "Surulere"],
    "bank_name": "Kuda",
    "account_number": "2012345678",
    "location_lat": 6.5095,
    "location_lng": 3.3711,
    "onboarding_channel": "field_agent"
  }'
# Expected: 201 with worker_id, virtual_account_number (if Squad keys configured)
```

- [ ] **Step 4: Test intelligence stats**

```bash
curl http://localhost:3000/api/intelligence/stats
# Expected: JSON with volume_today, jobs_today, etc. (all zeros before seeding)
```

- [ ] **Step 5: Test financial inclusion**

```bash
curl http://localhost:3000/api/intelligence/financial-inclusion
# Expected: JSON with score_30_plus, loan_eligible, with_virtual_account
```

---

### Task 5: Jobs Route (CRUD + Rating)

**Files:**
- Create: `backend/src/routes/jobs.js`

- [ ] **Step 1: Create jobs route**

```javascript
// backend/src/routes/jobs.js
const { Router } = require('express');
const knex = require('../database/knex');
const { applyTrustEvent } = require('../services/trust');
const redis = require('../utils/redis');

const router = Router();

/**
 * GET /api/jobs/:id
 * Get job details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await knex('jobs')
      .where({ id: req.params.id })
      .first();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Attach worker info
    if (job.worker_id) {
      const worker = await knex('workers')
        .where({ id: job.worker_id })
        .select('id', 'name', 'phone', 'primary_trade', 'trust_score')
        .first();
      job.worker = worker;
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs
 * Create a new job (buyer books a worker)
 */
router.post('/', async (req, res) => {
  try {
    const { buyer_id, worker_id, service_category, description, area, location_lat, location_lng, agreed_amount } = req.body;

    const [job] = await knex('jobs').insert({
      buyer_id,
      worker_id,
      service_category,
      description,
      area,
      location_lat,
      location_lng,
      agreed_amount,
      status: 'created',
      created_at: new Date()
    }).returning('*');

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/jobs/:id/status
 * Update job status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const [updated] = await knex('jobs')
      .where({ id: req.params.id })
      .update({ status, ...(status === 'completed' ? { completed_at: new Date() } : {}) })
      .returning('*');

    if (!updated) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/rate
 * Rate a completed job (buyer rates worker)
 */
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    const job = await knex('jobs').where({ id: req.params.id }).first();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update job with rating
    await knex('jobs').where({ id: job.id }).update({ buyer_rating: rating });

    // Apply trust event for rating
    const delta = rating > 3 ? (rating - 3) * 0.01 : (rating - 3) * 0.02;
    const trustResult = await applyTrustEvent(job.worker_id, 'rating_received', delta, job.id);

    // Broadcast to dashboard
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'rating_received',
      worker_id: job.worker_id,
      rating,
      trust_score: trustResult.newScore,
      timestamp: new Date().toISOString()
    }));

    res.json({
      message: 'Rating submitted',
      trust_update: {
        new_score: trustResult.newScore,
        delta,
        sabi_score: trustResult.sabiScore
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Mount in index.js**

Add to `backend/src/index.js` route mounting section:

```javascript
app.use('/api/jobs', require('./routes/jobs'));
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/jobs.js backend/src/index.js
git commit -m "feat: add jobs route (CRUD, status updates, rating with trust events)"
```

---

## Summary

After completing this plan you have:
- Worker onboarding with Squad bank verification + virtual account creation
- Worker CRUD (list, get, availability toggle, location update)
- Trader registration with virtual account
- Trader sale logging via API (NLP-parsed)
- Trader weekly reports and daily stats
- Job seeker registration, pathway recommendations, apprenticeship applications
- Job CRUD, status updates, and rating with trust score integration
- Full Economic Intelligence API (stats, gaps, heat map, channels, forecast, financial inclusion)
- All routes mounted and working
- Ready for Plan 6 (seed data)
