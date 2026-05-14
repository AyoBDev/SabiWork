// backend/src/routes/chat.js
const { Router } = require('express');
const knex = require('../database/knex');
const redis = require('../utils/redis');
const eventBus = require('../utils/eventBus');
const { classifyIntent, findNearbyWorkers, rankWorkers, generateMatchResponse } = require('../services/matching');
const { classifySale } = require('../services/nlp');
const { generatePathwayRecommendation } = require('../services/demand');
const sabiScoreService = require('../services/sabiScore');

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { message, user_id, user_type, user_lat, user_lng } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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
  await knex('demand_signals').insert({
    trade_category: intent.trade_category || 'unknown',
    area: intent.location,
    location_lat: user_lat || null,
    location_lng: user_lng || null,
    request_type: 'buyer_request',
    matched: false,
    recorded_at: new Date()
  });

  const candidates = await findNearbyWorkers(intent, user_lat, user_lng);

  if (candidates.length === 0) {
    eventBus.emit('unmatched_demand', {
      actor: 'AI Engine',
      description: `Unmatched request: ${(intent.trade_category || 'worker').replace('_', ' ')} in ${intent.location || 'unknown area'} — no workers available`,
      metadata: { trade: intent.trade_category, area: intent.location, channel: 'pwa' }
    });

    return res.status(200).json({
      type: 'text',
      message: `No ${(intent.trade_category || 'worker').replace('_', ' ')} available near ${intent.location || 'you'} right now. We've logged your request and will notify you when one becomes available.`,
      intent,
      matched: false
    });
  }

  const { topMatch, reasoning, allCandidates } = await rankWorkers(intent, candidates);
  const matchResponse = await generateMatchResponse(intent, topMatch, reasoning);

  await knex('demand_signals')
    .where({ trade_category: intent.trade_category, area: intent.location })
    .orderBy('recorded_at', 'desc')
    .limit(1)
    .update({ matched: true });

  // Broadcast match to dashboard
  eventBus.emit('job_matched', {
    actor: 'AI Engine',
    description: `Matched buyer with ${topMatch.name} (${intent.trade_category}, SabiScore ${topMatch.sabi_score || 'N/A'}, ${topMatch.distance_km ? Math.round(topMatch.distance_km * 10) / 10 + 'km' : intent.location || 'Lagos'})`,
    metadata: { worker_name: topMatch.name, service: intent.trade_category, area: intent.location, channel: 'pwa' }
  });

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
  let trader = null;
  if (userId) {
    // Try phone lookup first (most common from WhatsApp), then UUID
    trader = await knex('traders').where({ phone: userId }).first();
    if (!trader) {
      try {
        trader = await knex('traders').where({ id: userId }).first();
      } catch (_) { /* userId is not a valid UUID, ignore */ }
    }
  }

  if (!trader) {
    return res.status(200).json({
      type: 'text',
      message: "You're not registered as a trader yet. Send \"register trader\" to get started.",
      intent: { type: 'sale_log' }
    });
  }

  const sale = await classifySale(message);
  if (!sale) {
    return res.status(200).json({
      type: 'text',
      message: "I couldn't understand that sale. Try: \"sold 3 bags rice 75000\"",
      intent: { type: 'sale_log' }
    });
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

  await knex('traders')
    .where({ id: trader.id })
    .update({
      total_logged_sales: knex.raw('total_logged_sales + 1'),
      total_logged_revenue: knex.raw('total_logged_revenue + ?', [sale.amount])
    });

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

  const sabiResult = await sabiScoreService.calculateTraderSabiScore(trader.id);
  const previousScore = trader.sabi_score;
  const weeksToLoan = sabiResult.score >= 50 ? 0 : Math.ceil((50 - sabiResult.score) / 2);

  // Broadcast to dashboard
  eventBus.emit('sale_logged', {
    actor: trader.name,
    description: `Sale logged: ${sale.quantity}x ${sale.item_name} for ₦${sale.amount.toLocaleString()} — SabiScore: ${sabiResult.score}`,
    metadata: { amount: sale.amount, trader_name: trader.name, area: trader.area, category: sale.category, sabi_score: sabiResult.score, channel: 'whatsapp' }
  });

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
  if (!userId) {
    return res.status(200).json({ type: 'text', message: "I couldn't find your profile. Please register first." });
  }

  if (userType === 'worker' || !userType) {
    let worker = await knex('workers').where({ phone: userId }).first();
    if (!worker) {
      try { worker = await knex('workers').where({ id: userId }).first(); } catch (_) {}
    }
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
    let trader = await knex('traders').where({ phone: userId }).first();
    if (!trader) {
      try { trader = await knex('traders').where({ id: userId }).first(); } catch (_) {}
    }
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
