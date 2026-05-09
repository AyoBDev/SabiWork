# Plan 4: AI/Groq Integration (Intent Classification, Matching, Trade Parsing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AI layer that powers natural language understanding across the platform — intent classification (buyer requests), worker matching (ranked results with reasoning), trade/sales classification (trader messages), and pathway recommendations (job seeker career guidance). All via Groq SDK (Llama models).

**Architecture:** Three service files handle distinct AI tasks. Each uses structured JSON prompts with system instructions. Hybrid matching: SQL filters first (trade, distance, availability), then AI ranks the shortlist. Fallback to keyword/regex if Groq is unavailable or slow (>3s timeout).

**Tech Stack:** groq-sdk, Knex (for candidate queries), shared constants

**Depends on:** Plan 1 (database + workers table), Plan 3 (trust score service for matching context)

---

## File Structure

```
backend/src/
├── services/
│   ├── matching.js           # Intent classification + worker matching + response generation
│   ├── nlp.js                # Trade/sales classification (trader messages)
│   └── demand.js             # Demand signal aggregation + pathway recommendations
└── routes/
    └── chat.js               # POST /api/chat — unified AI chat endpoint
```

---

### Task 1: Groq Client Setup + Intent Classification

**Files:**
- Create: `backend/src/services/matching.js`

- [ ] **Step 1: Create matching service with intent classification**

```javascript
// backend/src/services/matching.js
const Groq = require('groq-sdk');
const knex = require('../database/knex');
const config = require('../config');
const { TRADES, LAGOS_AREAS } = require('../../shared/constants');
const { getTier } = require('./trust');

const groq = new Groq({ apiKey: config.groqApiKey });

const MODELS = {
  fast: 'llama-3.1-8b-instant',
  smart: 'llama-3.3-70b-versatile'
};

const GROQ_TIMEOUT = 3000; // 3 second timeout

/**
 * Classify user intent from natural language message
 * @param {string} message - User's raw message
 * @returns {Object} { type, trade_category, location, urgency, description, confidence }
 */
async function classifyIntent(message) {
  const tradeList = TRADES.join(', ');
  const areaList = LAGOS_AREAS.map(a => a.name).join(', ');

  const systemPrompt = `You are a Nigerian service marketplace classifier for SabiWork.
Your job is to understand what a user needs from their message.

Possible intent types:
- "buyer_request" — user needs a service worker (plumber, electrician, etc.)
- "job_seeker" — user wants to find work, learn a trade, or explore apprenticeships
- "sale_log" — user is logging a sale (they are a trader)
- "status_check" — user asking about their score, points, or job status
- "greeting" — hello, hi, etc.
- "unknown" — cannot determine intent

Supported trades: ${tradeList}
Known areas in Lagos: ${areaList}

The user may write in Pidgin English, Nigerian English, or mix.
Examples:
- "I need plumber for Yaba" → buyer_request, plumbing, Yaba
- "my gen no dey work" → buyer_request, electrical
- "I wan learn trade" → job_seeker
- "wetin dey happen for my area" → job_seeker
- "sold 3 bags rice 75000" → sale_log
- "my tap dey leak" → buyer_request, plumbing

Respond ONLY with a JSON object. No markdown, no explanation.`;

  const userPrompt = `Classify this message: "${message}"

Return JSON:
{
  "type": "buyer_request|job_seeker|sale_log|status_check|greeting|unknown",
  "trade_category": "trade name or null",
  "location": "area name or null",
  "urgency": "low|medium|high",
  "description": "brief description of what they need",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await Promise.race([
      groq.chat.completions.create({
        model: MODELS.fast,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), GROQ_TIMEOUT))
    ]);

    const content = response.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Intent classification failed, using fallback:', error.message);
    return fallbackClassify(message);
  }
}

/**
 * Fallback classification using keyword matching (no AI)
 */
function fallbackClassify(message) {
  const lower = message.toLowerCase();

  // Check for sale log pattern
  if (/^sold?\s+.+\s+\d+/i.test(lower)) {
    return { type: 'sale_log', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.8 };
  }

  // Check for job seeker keywords
  const seekerKeywords = ['learn', 'trade', 'apprentice', 'work', 'job', 'skill', 'demand', 'pathway'];
  if (seekerKeywords.some(kw => lower.includes(kw)) && !lower.includes('need') && !lower.includes('fix')) {
    return { type: 'job_seeker', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.6 };
  }

  // Check for trade keywords (buyer request)
  const tradeKeywords = {
    'plumb': 'plumbing', 'pipe': 'plumbing', 'tap': 'plumbing', 'toilet': 'plumbing', 'water': 'plumbing',
    'electric': 'electrical', 'wire': 'electrical', 'socket': 'electrical', 'light': 'electrical', 'nepa': 'electrical', 'gen': 'electrical', 'generator': 'electrical', 'ac': 'electrical',
    'tailor': 'tailoring', 'sew': 'tailoring', 'cloth': 'tailoring', 'fashion': 'tailoring',
    'tile': 'tiling', 'tiling': 'tiling', 'floor': 'tiling',
    'carpenter': 'carpentry', 'wood': 'carpentry', 'door': 'carpentry', 'furniture': 'carpentry',
    'paint': 'painting', 'wall': 'painting',
    'weld': 'welding', 'iron': 'welding', 'metal': 'welding',
    'clean': 'cleaning', 'wash': 'cleaning', 'laundry': 'cleaning', 'fumigat': 'cleaning',
    'hair': 'hairdressing', 'barb': 'hairdressing', 'salon': 'hairdressing', 'braid': 'hairdressing',
    'cook': 'catering', 'food': 'catering', 'cater': 'catering', 'event': 'catering'
  };

  let trade = null;
  for (const [keyword, tradeCategory] of Object.entries(tradeKeywords)) {
    if (lower.includes(keyword)) {
      trade = tradeCategory;
      break;
    }
  }

  // Check for area names
  let location = null;
  for (const area of LAGOS_AREAS) {
    if (lower.includes(area.name.toLowerCase())) {
      location = area.name;
      break;
    }
  }

  if (trade) {
    return { type: 'buyer_request', trade_category: trade, location, urgency: 'medium', description: message, confidence: 0.7 };
  }

  // Greeting
  if (['hi', 'hello', 'hey', 'good morning', 'good afternoon'].some(g => lower.startsWith(g))) {
    return { type: 'greeting', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.9 };
  }

  return { type: 'unknown', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.3 };
}

module.exports = {
  classifyIntent,
  fallbackClassify,
  MODELS,
  GROQ_TIMEOUT
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/matching.js
git commit -m "feat: add intent classification with Groq + keyword fallback"
```

---

### Task 2: Worker Matching (SQL + AI Ranking)

**Files:**
- Modify: `backend/src/services/matching.js`

- [ ] **Step 1: Add findNearbyWorkers and rankWorkers functions**

Append the following to `backend/src/services/matching.js` (before `module.exports`):

```javascript
/**
 * Find workers matching the intent using GIS distance query
 * @param {Object} intent - Classified intent { trade_category, location }
 * @param {number} buyerLat - Buyer's latitude
 * @param {number} buyerLng - Buyer's longitude
 * @param {number} radiusKm - Search radius in km (default 5)
 * @returns {Array} Workers sorted by distance
 */
async function findNearbyWorkers(intent, buyerLat, buyerLng, radiusKm = 5) {
  let query = knex('workers')
    .where({ is_available: true })
    .where('last_active_at', '>=', knex.raw("NOW() - INTERVAL '24 hours'"));

  // Filter by trade
  if (intent.trade_category) {
    query = query.where(function() {
      this.where('primary_trade', intent.trade_category)
        .orWhereRaw('? = ANY(secondary_trades)', [intent.trade_category]);
    });
  }

  // If we have GPS coordinates, calculate distance
  if (buyerLat && buyerLng) {
    query = query.select(
      '*',
      knex.raw(`
        (6371 * acos(
          LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
          cos(radians(location_lng) - radians(?)) +
          sin(radians(?)) * sin(radians(location_lat)))
        )) AS distance_km
      `, [buyerLat, buyerLng, buyerLat])
    )
    .havingRaw('(6371 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) * cos(radians(location_lng) - radians(?)) + sin(radians(?)) * sin(radians(location_lat))))) <= ?', [buyerLat, buyerLng, buyerLat, radiusKm])
    .orderByRaw('distance_km ASC, trust_score DESC');
  } else {
    // Fallback: filter by area name
    if (intent.location) {
      query = query.whereRaw('? = ANY(service_areas)', [intent.location]);
    }
    query = query.orderBy('trust_score', 'desc');
  }

  const workers = await query.limit(10);

  // If no workers found, expand radius
  if (workers.length === 0 && buyerLat && buyerLng && radiusKm < 15) {
    return findNearbyWorkers(intent, buyerLat, buyerLng, radiusKm * 2);
  }

  return workers;
}

/**
 * Use AI to rank candidates and pick the best match
 * @param {Object} intent - Classified intent
 * @param {Array} candidates - Workers from findNearbyWorkers
 * @returns {Object} { topMatch, reasoning, allCandidates }
 */
async function rankWorkers(intent, candidates) {
  if (candidates.length === 0) {
    return { topMatch: null, reasoning: 'No workers available', allCandidates: [] };
  }

  if (candidates.length === 1) {
    return {
      topMatch: candidates[0],
      reasoning: 'Only available worker in the area',
      allCandidates: candidates
    };
  }

  // Prepare candidate summary for AI
  const candidateSummary = candidates.slice(0, 5).map((w, i) => ({
    index: i,
    name: w.name,
    trade: w.primary_trade,
    trust_score: parseFloat(w.trust_score),
    tier: getTier(parseFloat(w.trust_score)).label,
    total_jobs: w.total_jobs,
    distance_km: w.distance_km ? Math.round(w.distance_km * 10) / 10 : 'unknown'
  }));

  const systemPrompt = `You are a matching algorithm for SabiWork, a Nigerian service marketplace.
Rank these workers for the buyer's request. Consider:
1. Distance (closer is better, but not if trust is very low)
2. Trust score (higher means more reliable)
3. Experience (total_jobs indicates experience)
4. Speciality match to the specific problem described

Respond ONLY with JSON.`;

  const userPrompt = `Buyer needs: "${intent.description}"
Trade: ${intent.trade_category}
Urgency: ${intent.urgency}

Candidates:
${JSON.stringify(candidateSummary, null, 2)}

Return JSON:
{
  "ranked_indices": [0, 2, 1, ...],
  "top_pick_reason": "one sentence why this worker is the best fit"
}`;

  try {
    const response = await Promise.race([
      groq.chat.completions.create({
        model: MODELS.smart,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), GROQ_TIMEOUT))
    ]);

    const content = response.choices[0]?.message?.content;
    const result = JSON.parse(content);

    const rankedCandidates = result.ranked_indices.map(i => candidates[i]).filter(Boolean);
    return {
      topMatch: rankedCandidates[0] || candidates[0],
      reasoning: result.top_pick_reason || 'Best match by distance and trust',
      allCandidates: rankedCandidates.length > 0 ? rankedCandidates : candidates
    };
  } catch (error) {
    console.error('AI ranking failed, using default sort:', error.message);
    // Fallback: trust score * 0.6 + distance factor * 0.4
    const sorted = [...candidates].sort((a, b) => {
      const aScore = parseFloat(a.trust_score) * 0.6 + (1 / (a.distance_km || 10)) * 0.4;
      const bScore = parseFloat(b.trust_score) * 0.6 + (1 / (b.distance_km || 10)) * 0.4;
      return bScore - aScore;
    });
    return {
      topMatch: sorted[0],
      reasoning: 'Best match by trust score and proximity',
      allCandidates: sorted
    };
  }
}

/**
 * Generate a conversational response for the match result
 * @param {Object} intent - Classified intent
 * @param {Object} worker - Matched worker
 * @param {string} reasoning - Why this worker was picked
 * @returns {string} Friendly message to show buyer
 */
async function generateMatchResponse(intent, worker, reasoning) {
  const distanceText = worker.distance_km
    ? `${Math.round(worker.distance_km * 10) / 10}km away`
    : 'nearby';

  const etaMin = worker.distance_km
    ? Math.round(worker.distance_km * 4.5) // ~4.5 min per km in Lagos (keke/walking mix)
    : 15;

  const tier = getTier(parseFloat(worker.trust_score));

  // Price estimation (simple: base on trade averages)
  const priceRange = estimatePriceRange(worker.primary_trade);

  return {
    message: `Found the best ${worker.primary_trade.replace('_', ' ')} near you:`,
    worker_card: {
      id: worker.id,
      name: worker.name,
      trade: worker.primary_trade,
      rating: Math.round((parseFloat(worker.trust_score) * 5) * 10) / 10, // Convert trust to 5-star
      trust_tier: tier.label,
      trust_emoji: tier.emoji,
      trust_score: parseFloat(worker.trust_score),
      distance_km: worker.distance_km ? Math.round(worker.distance_km * 10) / 10 : null,
      eta_min: etaMin,
      price_range: priceRange,
      total_jobs: worker.total_jobs,
      area: worker.service_areas?.[0] || 'Lagos',
      suggested_price: priceRange.mid
    },
    reasoning
  };
}

/**
 * Estimate price range for a trade (Lagos averages)
 */
function estimatePriceRange(trade) {
  const ranges = {
    plumbing: { min: 3000, max: 15000, mid: 5000 },
    electrical: { min: 3000, max: 20000, mid: 8000 },
    tailoring: { min: 2000, max: 25000, mid: 5000 },
    tiling: { min: 5000, max: 30000, mid: 15000 },
    carpentry: { min: 5000, max: 40000, mid: 12000 },
    painting: { min: 5000, max: 30000, mid: 10000 },
    welding: { min: 3000, max: 20000, mid: 8000 },
    cleaning: { min: 3000, max: 15000, mid: 5000 },
    hairdressing: { min: 2000, max: 20000, mid: 5000 },
    catering: { min: 5000, max: 50000, mid: 15000 }
  };
  return ranges[trade] || { min: 3000, max: 15000, mid: 5000 };
}
```

Update `module.exports` at the bottom of the file:

```javascript
module.exports = {
  classifyIntent,
  fallbackClassify,
  findNearbyWorkers,
  rankWorkers,
  generateMatchResponse,
  estimatePriceRange,
  MODELS,
  GROQ_TIMEOUT
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/matching.js
git commit -m "feat: add worker matching (GIS distance query + AI ranking + fallback)"
```

---

### Task 3: Trade/Sales Classification (NLP Service)

**Files:**
- Create: `backend/src/services/nlp.js`

- [ ] **Step 1: Create NLP service for trader message parsing**

```javascript
// backend/src/services/nlp.js
const Groq = require('groq-sdk');
const config = require('../config');

const groq = new Groq({ apiKey: config.groqApiKey });

const GROQ_TIMEOUT = 3000;

/**
 * Parse a trader's sales message into structured data
 * @param {string} message - Raw message like "sold 3 bags rice 75000"
 * @returns {Object} { item_name, quantity, unit, amount, category }
 */
async function classifySale(message) {
  const systemPrompt = `You are a sales log parser for Nigerian market traders on SabiWork.
Extract sale details from informal messages. Traders write in Nigerian English or Pidgin.

Categories: provisions, electronics, clothing, food, household, building_materials, cosmetics, beverages, other

Examples:
- "sold 3 bags rice 75000" → rice, 3, bags, 75000, provisions
- "2 carton indomie 18500" → Indomie, 2, cartons, 18500, provisions
- "sold provisions today 94500" → Provisions (bulk), 1, lot, 94500, provisions
- "cement 5 bags 32k" → Cement, 5, bags, 32000, building_materials
- "phone charger 3 pieces 4500" → Phone Charger, 3, pieces, 4500, electronics
- "sold crate of egg 3800" → Eggs, 1, crate, 3800, food
- "2 bag of pure water 1200" → Pure Water, 2, bags, 1200, beverages

Notes:
- "k" means thousand (32k = 32000)
- Amount is always in Naira
- Quantity defaults to 1 if not specified
- Capitalize item names properly

Respond ONLY with JSON. No markdown, no explanation.`;

  const userPrompt = `Parse this sale: "${message}"

Return JSON:
{
  "item_name": "item name capitalized",
  "quantity": number,
  "unit": "bags|cartons|pieces|crates|lots|kg|other",
  "amount": number_in_naira,
  "category": "category_from_list"
}`;

  try {
    const response = await Promise.race([
      groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), GROQ_TIMEOUT))
    ]);

    const content = response.choices[0]?.message?.content;
    const result = JSON.parse(content);

    // Validate required fields
    if (!result.amount || result.amount <= 0) {
      throw new Error('Invalid amount');
    }

    return {
      item_name: result.item_name || 'Unknown Item',
      quantity: result.quantity || 1,
      unit: result.unit || 'pieces',
      amount: parseInt(result.amount),
      category: result.category || 'other'
    };
  } catch (error) {
    console.error('Sale classification failed, using fallback:', error.message);
    return fallbackParseSale(message);
  }
}

/**
 * Fallback sale parser using regex patterns
 */
function fallbackParseSale(message) {
  const lower = message.toLowerCase().replace(/,/g, '');

  // Pattern: "sold? [quantity] [unit]? [item] [amount]"
  // Or: "[item] [quantity] [unit]? [amount]"

  // Extract amount (last number, or number followed by k)
  let amount = null;
  const amountMatch = lower.match(/(\d+)k\b/) || lower.match(/(\d{4,})/);
  if (amountMatch) {
    amount = amountMatch[1].length <= 3
      ? parseInt(amountMatch[1]) * 1000
      : parseInt(amountMatch[1]);
  }

  // Extract quantity (first small number, usually 1-99)
  let quantity = 1;
  const qtyMatch = lower.match(/(\d{1,2})\s*(bag|carton|piece|crate|kg|dozen)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1]);
  }

  // Extract item (words between quantity/sold and amount)
  let item = 'Unknown Item';
  const cleanedMsg = lower.replace(/^sold?\s*/i, '').replace(/\d+k?/g, '').trim();
  const words = cleanedMsg.split(/\s+/).filter(w => !['bag', 'bags', 'carton', 'cartons', 'pieces', 'of'].includes(w));
  if (words.length > 0) {
    item = words.slice(0, 3).join(' ');
    item = item.charAt(0).toUpperCase() + item.slice(1);
  }

  if (!amount) {
    return null; // Can't parse without an amount
  }

  return {
    item_name: item,
    quantity,
    unit: 'pieces',
    amount,
    category: 'other'
  };
}

/**
 * Generate a WhatsApp-friendly response for a logged sale
 * @param {Object} sale - Parsed sale data
 * @param {Object} traderStats - { today_total, today_count, week_total, sabi_score }
 * @returns {string} Formatted message
 */
function formatSaleResponse(sale, traderStats) {
  const scoreChange = traderStats.sabi_score_after > traderStats.sabi_score_before;
  const scoreLine = scoreChange
    ? `SabiScore: ${traderStats.sabi_score_before} → ${traderStats.sabi_score_after} 📈`
    : `SabiScore: ${traderStats.sabi_score_after}`;

  let loanLine = '';
  if (traderStats.weeks_to_loan > 0) {
    loanLine = `${traderStats.weeks_to_loan} more weeks to unlock loan.`;
  } else {
    loanLine = `✅ You qualify for an inventory loan! Reply *LOAN*.`;
  }

  return {
    text: `📦 *Sale Logged!*\n\n${sale.quantity} × ${sale.item_name} — ₦${sale.amount.toLocaleString()}\n\n📊 Today: ₦${traderStats.today_total.toLocaleString()} (${traderStats.today_count} sales)\n📊 This week: ₦${traderStats.week_total.toLocaleString()}\n\n${scoreLine}\n${loanLine}\n\nReply *REPORT* for weekly summary.`,
    sale
  };
}

module.exports = {
  classifySale,
  fallbackParseSale,
  formatSaleResponse
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/nlp.js
git commit -m "feat: add NLP service for trader sales classification with Groq + regex fallback"
```

---

### Task 4: Demand Signal Aggregation + Pathway Recommendations

**Files:**
- Create: `backend/src/services/demand.js`

- [ ] **Step 1: Create demand service**

```javascript
// backend/src/services/demand.js
const Groq = require('groq-sdk');
const knex = require('../database/knex');
const config = require('../config');
const { TRADES } = require('../../shared/constants');

const groq = new Groq({ apiKey: config.groqApiKey });

const GROQ_TIMEOUT = 3000;

/**
 * Get demand vs supply data for an area (used by dashboard + pathway)
 * @param {string} area - Neighbourhood name
 * @param {number} days - Lookback window (default 30)
 * @returns {Array} [{ trade, requests, unmatched, workers, gap_level, avg_price }]
 */
async function getDemandByArea(area, days = 30) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  // Demand signals for this area
  const demand = await knex('demand_signals')
    .where('area', area)
    .where('recorded_at', '>=', windowStart)
    .select('trade_category')
    .count('* as total_requests')
    .sum(knex.raw("CASE WHEN NOT matched THEN 1 ELSE 0 END as unmatched"))
    .avg('amount as avg_price')
    .groupBy('trade_category')
    .orderByRaw('SUM(CASE WHEN NOT matched THEN 1 ELSE 0 END) DESC');

  // Worker supply for this area
  const supply = await knex('workers')
    .whereRaw('? = ANY(service_areas)', [area])
    .where('is_available', true)
    .select('primary_trade')
    .count('* as worker_count')
    .groupBy('primary_trade');

  const supplyMap = {};
  supply.forEach(s => { supplyMap[s.primary_trade] = parseInt(s.worker_count); });

  // Combine demand + supply into gap analysis
  return demand.map(d => {
    const workers = supplyMap[d.trade_category] || 0;
    const unmatched = parseInt(d.unmatched) || 0;
    const totalRequests = parseInt(d.total_requests) || 0;
    const unmatchedRate = totalRequests > 0 ? unmatched / totalRequests : 0;

    let gapLevel = 'low';
    if (workers <= 2 && unmatched > 20) gapLevel = 'high';
    else if (workers <= 5 && unmatched > 10) gapLevel = 'medium';

    return {
      trade: d.trade_category,
      requests: totalRequests,
      unmatched,
      workers,
      gap_level: gapLevel,
      avg_price: Math.round(parseFloat(d.avg_price) || 0),
      unmatched_rate: Math.round(unmatchedRate * 100)
    };
  });
}

/**
 * Get demand near a specific GPS point (for job seekers + matching)
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm - Default 3km
 * @param {number} days - Lookback window
 * @returns {Array} Same format as getDemandByArea but filtered by radius
 */
async function getDemandNearPoint(lat, lng, radiusKm = 3, days = 30) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  const demand = await knex('demand_signals')
    .where('recorded_at', '>=', windowStart)
    .whereNotNull('location_lat')
    .whereRaw(`
      (6371 * acos(
        LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
        cos(radians(location_lng) - radians(?)) +
        sin(radians(?)) * sin(radians(location_lat)))
      )) <= ?
    `, [lat, lng, lat, radiusKm])
    .select('trade_category')
    .count('* as total_requests')
    .sum(knex.raw("CASE WHEN NOT matched THEN 1 ELSE 0 END as unmatched"))
    .avg('amount as avg_price')
    .groupBy('trade_category')
    .orderByRaw('SUM(CASE WHEN NOT matched THEN 1 ELSE 0 END) DESC');

  // Worker supply within same radius
  const supply = await knex('workers')
    .where('is_available', true)
    .whereNotNull('location_lat')
    .whereRaw(`
      (6371 * acos(
        LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
        cos(radians(location_lng) - radians(?)) +
        sin(radians(?)) * sin(radians(location_lat)))
      )) <= ?
    `, [lat, lng, lat, radiusKm])
    .select('primary_trade')
    .count('* as worker_count')
    .groupBy('primary_trade');

  const supplyMap = {};
  supply.forEach(s => { supplyMap[s.primary_trade] = parseInt(s.worker_count); });

  return demand.map(d => {
    const workers = supplyMap[d.trade_category] || 0;
    const unmatched = parseInt(d.unmatched) || 0;
    const totalRequests = parseInt(d.total_requests) || 0;

    let gapLevel = 'low';
    if (workers <= 2 && unmatched > 20) gapLevel = 'high';
    else if (workers <= 5 && unmatched > 10) gapLevel = 'medium';

    return {
      trade: d.trade_category,
      requests: totalRequests,
      unmatched,
      workers,
      gap_level: gapLevel,
      avg_price: Math.round(parseFloat(d.avg_price) || 0)
    };
  });
}

/**
 * Generate pathway recommendation for a job seeker
 * @param {number} lat - Seeker's latitude
 * @param {number} lng - Seeker's longitude
 * @param {string} area - Seeker's area name
 * @returns {Object} { trades, apprenticeships, message }
 */
async function generatePathwayRecommendation(lat, lng, area) {
  // Get demand data
  let demandData;
  if (lat && lng) {
    demandData = await getDemandNearPoint(lat, lng, 3);
  } else {
    demandData = await getDemandByArea(area);
  }

  // Get available apprenticeships nearby
  const apprenticeships = await knex('apprenticeships')
    .join('workers', 'apprenticeships.master_worker_id', 'workers.id')
    .where('apprenticeships.status', 'active')
    .where('workers.apprentice_slots', '>', 0)
    .where('workers.trust_score', '>=', 0.6)
    .select(
      'apprenticeships.*',
      'workers.name as master_name',
      'workers.trust_score as master_trust',
      'workers.total_jobs as master_jobs',
      'workers.service_areas as master_areas',
      'workers.location_lat as master_lat',
      'workers.location_lng as master_lng'
    )
    .limit(5);

  // Add distance if we have GPS
  const apprenticeshipsWithDistance = apprenticeships.map(a => {
    let distance = null;
    if (lat && lng && a.master_lat && a.master_lng) {
      distance = haversineDistance(lat, lng, parseFloat(a.master_lat), parseFloat(a.master_lng));
    }
    return { ...a, distance_km: distance ? Math.round(distance * 10) / 10 : null };
  });

  // Trade emoji map
  const emojis = {
    plumbing: '🔧', electrical: '⚡', tailoring: '🧵', tiling: '🧱',
    carpentry: '🪚', painting: '🎨', welding: '🔥', cleaning: '🧹',
    hairdressing: '💇', catering: '🍽️'
  };

  // Format top 3 trades
  const topTrades = demandData.slice(0, 3).map(d => ({
    ...d,
    emoji: emojis[d.trade] || '💼',
    name: d.trade.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  return {
    trades: topTrades,
    apprenticeships: apprenticeshipsWithDistance,
    area: area || 'your area'
  };
}

/**
 * Get demand heat map data for a map bounding box
 * @param {Object} bounds - { north, south, east, west }
 * @param {string} trade - Optional trade filter
 * @param {number} days - Lookback window
 * @returns {Array} [{ lat, lng, intensity, unmet }]
 */
async function getDemandHeatData(bounds, trade = null, days = 30) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  let query = knex('demand_signals')
    .where('recorded_at', '>=', windowStart)
    .whereNotNull('location_lat')
    .whereBetween('location_lat', [bounds.south, bounds.north])
    .whereBetween('location_lng', [bounds.west, bounds.east])
    .select(
      knex.raw('ROUND(location_lat::numeric, 3) as lat'),
      knex.raw('ROUND(location_lng::numeric, 3) as lng'),
      knex.raw('COUNT(*) as intensity'),
      knex.raw("COUNT(*) FILTER (WHERE NOT matched) as unmet")
    )
    .groupByRaw('ROUND(location_lat::numeric, 3), ROUND(location_lng::numeric, 3)');

  if (trade) {
    query = query.where('trade_category', trade);
  }

  const results = await query;

  return results.map(r => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lng),
    intensity: parseInt(r.intensity),
    unmet: parseInt(r.unmet)
  }));
}

/**
 * Get coverage gaps — areas with demand but no worker within radius
 * @param {string} trade - Trade category
 * @param {number} radiusKm - Service radius to check
 * @returns {Array} [{ area, center_lat, center_lng, unmet_requests, avg_price }]
 */
async function getCoverageGaps(trade = null, radiusKm = 3) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 30);

  let query = knex('demand_signals')
    .where('matched', false)
    .where('recorded_at', '>=', windowStart)
    .whereNotNull('location_lat')
    .select(
      'area',
      knex.raw('AVG(location_lat) as center_lat'),
      knex.raw('AVG(location_lng) as center_lng'),
      knex.raw('COUNT(*) as unmet_requests'),
      knex.raw('AVG(amount) as avg_price')
    )
    .groupBy('area')
    .orderByRaw('COUNT(*) DESC')
    .limit(10);

  if (trade) {
    query = query.where('trade_category', trade);
  }

  const gaps = await query;

  // For each gap area, check if there's any worker within radius
  const enrichedGaps = [];
  for (const gap of gaps) {
    const centerLat = parseFloat(gap.center_lat);
    const centerLng = parseFloat(gap.center_lng);

    let workerQuery = knex('workers')
      .where('is_available', true)
      .whereNotNull('location_lat');

    if (trade) {
      workerQuery = workerQuery.where('primary_trade', trade);
    }

    const nearbyWorkers = await workerQuery
      .whereRaw(`
        (6371 * acos(
          LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
          cos(radians(location_lng) - radians(?)) +
          sin(radians(?)) * sin(radians(location_lat)))
        )) <= ?
      `, [centerLat, centerLng, centerLat, radiusKm])
      .count('* as count')
      .first();

    const workerCount = parseInt(nearbyWorkers.count) || 0;

    let gapLevel = 'healthy';
    if (workerCount === 0) gapLevel = 'critical';
    else if (workerCount <= 2) gapLevel = 'moderate';

    enrichedGaps.push({
      area: gap.area,
      center_lat: centerLat,
      center_lng: centerLng,
      unmet_requests: parseInt(gap.unmet_requests),
      avg_price: Math.round(parseFloat(gap.avg_price) || 0),
      worker_count: workerCount,
      gap_level: gapLevel
    });
  }

  return enrichedGaps.filter(g => g.gap_level !== 'healthy');
}

/**
 * Haversine distance between two GPS points
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  getDemandByArea,
  getDemandNearPoint,
  generatePathwayRecommendation,
  getDemandHeatData,
  getCoverageGaps,
  haversineDistance
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/demand.js
git commit -m "feat: add demand service (area gaps, heat map data, pathway recs, GIS queries)"
```

---

### Task 5: Chat Route (Unified AI Endpoint)

**Files:**
- Create: `backend/src/routes/chat.js`

- [ ] **Step 1: Create chat route**

```javascript
// backend/src/routes/chat.js
const { Router } = require('express');
const knex = require('../database/knex');
const redis = require('../utils/redis');
const { classifyIntent, findNearbyWorkers, rankWorkers, generateMatchResponse } = require('../services/matching');
const { classifySale } = require('../services/nlp');
const { generatePathwayRecommendation } = require('../services/demand');
const sabiScoreService = require('../services/sabiScore');

const router = Router();

/**
 * POST /api/chat
 * Unified AI chat endpoint — classifies intent and routes to appropriate handler
 *
 * Body: { message, user_id, user_type, user_lat, user_lng }
 *
 * Returns different response shapes based on intent:
 * - buyer_request → { type: 'worker_card', data: {...}, message }
 * - sale_log → { type: 'sale_logged', data: {...}, message }
 * - job_seeker → { type: 'demand_card', data: {...}, message }
 * - greeting → { type: 'text', message }
 */
router.post('/', async (req, res) => {
  try {
    const { message, user_id, user_type, user_lat, user_lng } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Classify intent
    const intent = await classifyIntent(message);

    switch (intent.type) {
      case 'buyer_request':
        return await handleBuyerRequest(req, res, intent, { user_id, user_lat, user_lng });

      case 'sale_log':
        return await handleSaleLog(req, res, message, user_id);

      case 'job_seeker':
        return await handleJobSeeker(req, res, intent, { user_id, user_lat, user_lng });

      case 'greeting':
        return res.status(200).json({
          type: 'text',
          message: getGreeting(user_type),
          intent
        });

      case 'status_check':
        return await handleStatusCheck(req, res, user_id, user_type);

      default:
        return res.status(200).json({
          type: 'text',
          message: "I'm not sure what you need. Try:\n• \"I need a plumber in Yaba\"\n• \"sold 3 bags rice 75000\"\n• \"what trades are in demand near me?\"",
          intent
        });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Chat processing failed', details: error.message });
  }
});

async function handleBuyerRequest(req, res, intent, { user_id, user_lat, user_lng }) {
  // Log demand signal (regardless of match outcome)
  await knex('demand_signals').insert({
    trade_category: intent.trade_category || 'unknown',
    area: intent.location,
    location_lat: user_lat || null,
    location_lng: user_lng || null,
    request_type: 'buyer_request',
    matched: false, // updated if match found
    recorded_at: new Date()
  });

  // Find candidates
  const candidates = await findNearbyWorkers(intent, user_lat, user_lng);

  if (candidates.length === 0) {
    // Broadcast unmatched demand
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'unmatched_demand',
      trade: intent.trade_category,
      area: intent.location,
      timestamp: new Date().toISOString()
    }));

    return res.status(200).json({
      type: 'text',
      message: `No ${(intent.trade_category || 'worker').replace('_', ' ')} available near ${intent.location || 'you'} right now. We've logged your request and will notify you when one becomes available.`,
      intent,
      matched: false
    });
  }

  // Rank candidates
  const { topMatch, reasoning, allCandidates } = await rankWorkers(intent, candidates);

  // Generate response
  const matchResponse = await generateMatchResponse(intent, topMatch, reasoning);

  // Update demand signal as matched
  await knex('demand_signals')
    .where({ trade_category: intent.trade_category, area: intent.location })
    .orderBy('recorded_at', 'desc')
    .limit(1)
    .update({ matched: true });

  return res.status(200).json({
    type: 'worker_card',
    message: matchResponse.message,
    data: matchResponse.worker_card,
    reasoning: matchResponse.reasoning,
    alternatives: allCandidates.slice(1, 4).map(w => ({
      id: w.id,
      name: w.name,
      trust_score: parseFloat(w.trust_score),
      distance_km: w.distance_km ? Math.round(w.distance_km * 10) / 10 : null
    })),
    intent
  });
}

async function handleSaleLog(req, res, message, userId) {
  // Find trader by user_id or phone (userId could be either)
  let trader = await knex('traders').where({ id: userId }).first();
  if (!trader) {
    trader = await knex('traders').where({ phone: userId }).first();
  }

  if (!trader) {
    return res.status(200).json({
      type: 'text',
      message: "You're not registered as a trader yet. Send \"register trader\" to get started.",
      intent: { type: 'sale_log' }
    });
  }

  // Parse the sale
  const sale = await classifySale(message);
  if (!sale) {
    return res.status(200).json({
      type: 'text',
      message: "I couldn't understand that sale. Try: \"sold 3 bags rice 75000\"",
      intent: { type: 'sale_log' }
    });
  }

  // Log the sale
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

  // Get today/week stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const todayStats = await knex('sales_logs')
    .where({ trader_id: trader.id })
    .where('logged_at', '>=', today)
    .select(
      knex.raw('COALESCE(SUM(amount), 0) as total'),
      knex.raw('COUNT(*) as count')
    )
    .first();

  const weekStats = await knex('sales_logs')
    .where({ trader_id: trader.id })
    .where('logged_at', '>=', weekStart)
    .sum('amount as total')
    .first();

  // Recalculate SabiScore
  const sabiResult = await sabiScoreService.calculateTraderSabiScore(trader.id);
  const previousScore = trader.sabi_score;

  // Calculate weeks to loan (score 50 needed)
  const weeksToLoan = sabiResult.score >= 50 ? 0 : Math.ceil((50 - sabiResult.score) / 2);

  // Broadcast to dashboard
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
    type: 'sale_logged',
    message: `📦 Sale Logged!`,
    data: {
      sale,
      today_total: parseInt(todayStats.total) || 0,
      today_count: parseInt(todayStats.count) || 0,
      week_total: parseInt(weekStats.total) || 0,
      sabi_score_before: previousScore,
      sabi_score_after: sabiResult.score,
      weeks_to_loan: weeksToLoan
    }
  });
}

async function handleJobSeeker(req, res, intent, { user_id, user_lat, user_lng }) {
  // Try to find seeker's area
  let area = intent.location;
  if (!area && user_id) {
    const seeker = await knex('seekers').where({ id: user_id }).orWhere({ phone: user_id }).first();
    if (seeker) {
      area = seeker.area;
      if (!user_lat && seeker.location_lat) {
        user_lat = parseFloat(seeker.location_lat);
        user_lng = parseFloat(seeker.location_lng);
      }
    }
  }

  const pathway = await generatePathwayRecommendation(user_lat, user_lng, area);

  return res.status(200).json({
    type: 'demand_card',
    message: `Here's what's in demand near ${pathway.area}:`,
    data: {
      trades: pathway.trades,
      apprenticeships: pathway.apprenticeships.map(a => ({
        id: a.id,
        master_name: a.master_name,
        trade: a.trade,
        master_trust: parseFloat(a.master_trust),
        duration_weeks: a.duration_weeks,
        weekly_stipend: a.weekly_stipend,
        distance_km: a.distance_km,
        slots: a.master_areas ? 1 : 0
      }))
    },
    intent
  });
}

async function handleStatusCheck(req, res, userId, userType) {
  if (userType === 'worker' || !userType) {
    const worker = await knex('workers').where({ id: userId }).orWhere({ phone: userId }).first();
    if (worker) {
      return res.status(200).json({
        type: 'status',
        data: {
          trust_score: parseFloat(worker.trust_score),
          sabi_score: worker.sabi_score,
          total_jobs: worker.total_jobs,
          total_income: worker.total_income,
          tier: require('../services/trust').getTier(parseFloat(worker.trust_score))
        }
      });
    }
  }

  if (userType === 'trader') {
    const trader = await knex('traders').where({ id: userId }).orWhere({ phone: userId }).first();
    if (trader) {
      return res.status(200).json({
        type: 'status',
        data: {
          sabi_score: trader.sabi_score,
          total_sales: trader.total_logged_sales,
          total_revenue: trader.total_logged_revenue
        }
      });
    }
  }

  return res.status(200).json({
    type: 'text',
    message: "I couldn't find your profile. Please register first."
  });
}

function getGreeting(userType) {
  switch (userType) {
    case 'worker': return "Hi! You have new job requests nearby. What can I help with?";
    case 'trader': return "Hello! Ready to log today's sales? Just tell me what you sold.";
    case 'seeker': return "Hey! Want to see what trades are in demand near you today?";
    default: return "Welcome to SabiWork! What do you need help with?";
  }
}

module.exports = router;
```

- [ ] **Step 2: Mount chat route in index.js**

Add this line to `backend/src/index.js` after existing route mounts:

```javascript
app.use('/api/chat', require('./routes/chat'));
```

And add to the routes array:

```javascript
'POST /api/chat',
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/chat.js backend/src/index.js
git commit -m "feat: add unified AI chat route (buyer matching, sale logging, pathway recs)"
```

---

### Task 6: Test AI Integration

- [ ] **Step 1: Start services**

```bash
docker-compose up --build
```

- [ ] **Step 2: Insert test data for matching**

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "
INSERT INTO workers (name, phone, primary_trade, service_areas, location_lat, location_lng, trust_score, total_jobs, is_available, bank_code, account_number, account_name)
VALUES
  ('Emeka Adeyemi', '2348011111111', 'plumbing', '{Yaba,Surulere}', 6.5095, 3.3711, 0.76, 43, true, '090267', '2012345678', 'Emeka Adeyemi'),
  ('Chidi Okafor', '2348022222222', 'plumbing', '{Yaba,Ikeja}', 6.5120, 3.3750, 0.45, 12, true, '100004', '3012345678', 'Chidi Okafor'),
  ('Bola Tinubu', '2348033333333', 'electrical', '{Surulere,Mushin}', 6.4969, 3.3481, 0.82, 67, true, '058', '0012345678', 'Bola Tinubu');

INSERT INTO buyers (name, phone, email, area, location_lat, location_lng)
VALUES ('Funke Buyer', '2348099999999', 'funke@test.com', 'Yaba', 6.5100, 3.3720);

INSERT INTO traders (name, phone, business_type, area, location_lat, location_lng, sabi_score, total_logged_sales, total_logged_revenue)
VALUES ('Mama Ngozi', '2348044444444', 'provisions', 'Mushin', 6.5377, 3.3509, 43, 150, 5200000);

INSERT INTO demand_signals (trade_category, area, location_lat, location_lng, request_type, amount, matched, recorded_at)
VALUES
  ('tiling', 'Surulere', 6.4969, 3.3481, 'buyer_request', 15000, false, NOW() - INTERVAL '5 days'),
  ('tiling', 'Surulere', 6.4975, 3.3490, 'buyer_request', 12000, false, NOW() - INTERVAL '3 days'),
  ('tiling', 'Surulere', 6.4980, 3.3495, 'buyer_request', 18000, false, NOW() - INTERVAL '1 day'),
  ('plumbing', 'Yaba', 6.5095, 3.3711, 'buyer_request', 5000, true, NOW() - INTERVAL '2 days'),
  ('electrical', 'Surulere', 6.4969, 3.3481, 'buyer_request', 8000, false, NOW() - INTERVAL '4 days');
"
```

- [ ] **Step 3: Test buyer request (requires GROQ_API_KEY in .env)**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a plumber in Yaba, my tap is leaking",
    "user_id": "test",
    "user_lat": 6.5100,
    "user_lng": 3.3720
  }'
```

Expected: JSON with `type: "worker_card"`, showing Emeka (highest trust, closest to Yaba).

- [ ] **Step 4: Test sale logging**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "sold 3 bags rice 75000",
    "user_id": "2348044444444",
    "user_type": "trader"
  }'
```

Expected: JSON with `type: "sale_logged"`, showing parsed sale + stats.

- [ ] **Step 5: Test job seeker pathway**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what trades are in demand near Surulere",
    "user_id": "test",
    "user_lat": 6.4969,
    "user_lng": 3.3481
  }'
```

Expected: JSON with `type: "demand_card"`, showing tiling as high gap.

- [ ] **Step 6: Test fallback (without Groq key)**

Temporarily remove GROQ_API_KEY from .env and restart:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I need a plumber in Yaba"}'
```

Expected: Still returns a worker_card (fallback keyword matching kicks in).

- [ ] **Step 7: Clean up test data (optional — Plan 6 will reseed)**

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "
DELETE FROM demand_signals;
DELETE FROM sales_logs;
DELETE FROM jobs;
DELETE FROM traders;
DELETE FROM workers;
DELETE FROM buyers;
"
```

---

## Summary

After completing this plan you have:
- Intent classification via Groq (buyer request, sale log, job seeker, greeting, status check)
- Keyword/regex fallback when Groq is unavailable (demo never breaks)
- Worker matching: GIS distance query → AI ranking → conversational response
- Trade/sales NLP: parses "sold 3 bags rice 75000" into structured data
- Demand service: area gaps, GIS-based demand near point, heat map data, coverage gaps
- Pathway recommendations: demand + supply + apprenticeships near seeker
- Unified `/api/chat` endpoint that routes by intent type
- All events broadcast to dashboard via Redis pub/sub
- Ready for Plan 5 (remaining API routes) and Plan 7 (PWA scaffold)
