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

const GROQ_TIMEOUT = 3000;

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

function fallbackClassify(message) {
  const lower = message.toLowerCase();

  if (/^sold?\s+.+\s+\d+/i.test(lower)) {
    return { type: 'sale_log', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.8 };
  }

  const seekerKeywords = ['learn', 'trade', 'apprentice', 'work', 'job', 'skill', 'demand', 'pathway'];
  if (seekerKeywords.some(kw => lower.includes(kw)) && !lower.includes('need') && !lower.includes('fix')) {
    return { type: 'job_seeker', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.6 };
  }

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

  if (['hi', 'hello', 'hey', 'good morning', 'good afternoon'].some(g => lower.startsWith(g))) {
    return { type: 'greeting', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.9 };
  }

  return { type: 'unknown', trade_category: null, location: null, urgency: 'low', description: message, confidence: 0.3 };
}

async function findNearbyWorkers(intent, buyerLat, buyerLng, radiusKm = 5) {
  let query = knex('workers')
    .where({ is_available: true })
    .where('last_active_at', '>=', knex.raw("NOW() - INTERVAL '24 hours'"));

  if (intent.trade_category) {
    query = query.where(function() {
      this.where('primary_trade', intent.trade_category)
        .orWhereRaw('? = ANY(secondary_trades)', [intent.trade_category]);
    });
  }

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
    if (intent.location) {
      query = query.whereRaw('? = ANY(service_areas)', [intent.location]);
    }
    query = query.orderBy('trust_score', 'desc');
  }

  const workers = await query.limit(10);

  if (workers.length === 0 && buyerLat && buyerLng && radiusKm < 15) {
    return findNearbyWorkers(intent, buyerLat, buyerLng, radiusKm * 2);
  }

  return workers;
}

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

async function generateMatchResponse(intent, worker, reasoning) {
  const distanceText = worker.distance_km
    ? `${Math.round(worker.distance_km * 10) / 10}km away`
    : 'nearby';

  const etaMin = worker.distance_km
    ? Math.round(worker.distance_km * 4.5)
    : 15;

  const tier = getTier(parseFloat(worker.trust_score));
  const priceRange = estimatePriceRange(worker.primary_trade);

  return {
    message: `Found the best ${worker.primary_trade.replace('_', ' ')} near you:`,
    worker_card: {
      id: worker.id,
      name: worker.name,
      trade: worker.primary_trade,
      rating: Math.round((parseFloat(worker.trust_score) * 5) * 10) / 10,
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
