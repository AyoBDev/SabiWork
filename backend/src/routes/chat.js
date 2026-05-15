const { Router } = require('express');
const knex = require('../database/knex');
const eventBus = require('../utils/eventBus');
const memory = require('../services/memory');
const { transcribeAudio, isVoiceSupported } = require('../services/voice');
const { classifyIntent, findNearbyWorkers, rankWorkers, generateMatchResponse, estimatePriceRange } = require('../services/matching');
const { classifySale } = require('../services/nlp');
const { generatePathwayRecommendation } = require('../services/demand');
const { generateResponse, generateSuggestions, generateSteps } = require('../services/responseGen');
const sabiScoreService = require('../services/sabiScore');
const { handleComplaint } = require('../handlers/complaint');
const { handleFeedback } = require('../handlers/feedback');
const { handleReferral } = require('../handlers/referral');
const { handleReschedule } = require('../handlers/reschedule');

const router = Router();

router.post('/', async (req, res) => {
  try {
    let { message, audio_base64, user_id, user_type, user_lat, user_lng } = req.body;

    // Voice transcription if audio provided
    if (audio_base64 && !message) {
      if (!isVoiceSupported()) {
        return res.status(400).json({ error: 'Voice not supported — GROQ_API_KEY not configured' });
      }
      try {
        const audioBuffer = Buffer.from(audio_base64, 'base64');
        message = await transcribeAudio(audioBuffer, 'audio/ogg');
      } catch (err) {
        return res.status(200).json({
          type: 'text',
          message: "I couldn't understand that voice note. Try sending a text message instead.",
          steps: [],
          suggestions: ['Type your message', 'Try again']
        });
      }
    }

    if (!message) {
      return res.status(400).json({ error: 'Message or audio_base64 is required' });
    }

    // Load conversation history
    const conversationHistory = user_id ? await memory.getHistoryForPrompt(user_id, 3) : '';
    const session = user_id ? await memory.getSession(user_id) : { context: {} };

    // Save user message to memory
    if (user_id) {
      await memory.addMessage(user_id, 'user', message, { user_type });
    }

    // Classify intent with conversation context
    const intent = await classifyIntent(message, conversationHistory);
    const steps = generateSteps(intent);

    // Route to handler
    let handlerResult;
    switch (intent.type) {
      case 'buyer_request':
        handlerResult = await handleBuyerRequest(intent, { user_id, user_lat, user_lng });
        break;
      case 'sale_log':
        handlerResult = await handleSaleLog(message, user_id);
        break;
      case 'job_seeker':
        handlerResult = await handleJobSeeker(intent, { user_id, user_lat, user_lng });
        break;
      case 'greeting':
        handlerResult = { type: 'text', message: getGreeting(user_type || session.user_type) };
        break;
      case 'status_check':
        handlerResult = await handleStatusCheck(user_id, user_type || session.user_type);
        break;
      case 'complaint':
        handlerResult = await handleComplaint(intent, { user_id });
        break;
      case 'feedback':
        handlerResult = await handleFeedback(intent, { user_id });
        break;
      case 'referral':
        handlerResult = await handleReferral(intent, { user_id });
        break;
      case 'reschedule':
        handlerResult = await handleReschedule(intent, { user_id });
        break;
      case 'price_inquiry':
        handlerResult = handlePriceInquiry(intent);
        break;
      case 're_engage':
        handlerResult = await handleReEngage(user_id, user_type || session.user_type);
        break;
      case 'help':
        handlerResult = { type: 'help', message: getHelpMessage(user_type || session.user_type) };
        break;
      default:
        handlerResult = { type: 'text', message: null };
        break;
    }

    // Generate natural response via 70B
    const naturalMessage = await generateResponse({
      handlerResult,
      intent,
      conversationHistory,
      userType: user_type || session.user_type
    });

    const suggestions = generateSuggestions(intent, handlerResult);

    // Update memory with context
    if (user_id) {
      await memory.addMessage(user_id, 'assistant', naturalMessage);
      await memory.updateContext(user_id, {
        last_intent: intent.type,
        last_worker_match: handlerResult.data?.id || handlerResult.data?.worker_id || session.context.last_worker_match,
        pending_action: null
      });
    }

    const responseData = handlerResult.data || null;
    if (responseData && handlerResult.alternatives) {
      responseData.alternatives = handlerResult.alternatives;
    }

    return res.status(200).json({
      type: handlerResult.type || 'text',
      message: naturalMessage,
      data: responseData,
      steps,
      suggestions,
      intent,
      transcribed_text: audio_base64 ? message : undefined
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Chat processing failed', details: error.message });
  }
});

async function handleBuyerRequest(intent, { user_id, user_lat, user_lng }) {
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
      description: `Unmatched request: ${(intent.trade_category || 'worker').replace('_', ' ')} in ${intent.location || 'unknown area'}`,
      metadata: { trade: intent.trade_category, area: intent.location, channel: 'chat' }
    });

    return {
      type: 'text',
      message: `No ${(intent.trade_category || 'worker').replace('_', ' ')} available near ${intent.location || 'you'} right now. Request logged.`,
      data: null
    };
  }

  const { topMatch, reasoning, allCandidates } = await rankWorkers(intent, candidates);
  const matchResponse = await generateMatchResponse(intent, topMatch, reasoning);

  await knex('demand_signals')
    .where({ trade_category: intent.trade_category, area: intent.location })
    .orderBy('recorded_at', 'desc')
    .limit(1)
    .update({ matched: true });

  eventBus.emit('job_matched', {
    actor: 'AI Engine',
    description: `Matched buyer with ${topMatch.name} (${intent.trade_category})`,
    metadata: { worker_name: topMatch.name, service: intent.trade_category, area: intent.location, channel: 'chat' }
  });

  return {
    type: 'worker_card',
    message: matchResponse.message,
    data: matchResponse.worker_card,
    alternatives: allCandidates.slice(1, 4).map(w => ({
      id: w.id,
      name: w.name,
      trust_score: parseFloat(w.trust_score),
      distance_km: w.distance_km ? Math.round(w.distance_km * 10) / 10 : null
    }))
  };
}

async function handleSaleLog(message, userId) {
  let trader = null;
  if (userId) {
    trader = await knex('traders').where({ phone: userId }).first();
    if (!trader) {
      try { trader = await knex('traders').where({ id: userId }).first(); } catch (_) {}
    }
  }

  if (!trader && userId) {
    // Auto-register trader on first sale
    const [newTrader] = await knex('traders').insert({
      phone: userId,
      name: 'Trader',
      area: 'lagos',
      business_type: 'retail',
      sabi_score: 0,
      total_logged_sales: 0,
      total_logged_revenue: 0,
      created_at: new Date()
    }).returning('*');
    trader = newTrader;
  }

  if (!trader) {
    return { type: 'text', message: "I couldn't identify your account. Please try again." };
  }

  const sale = await classifySale(message);
  if (!sale) {
    return { type: 'text', message: "I couldn't understand that sale. Try: \"sold 3 bags rice 75000\"" };
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
    .select(knex.raw('COALESCE(SUM(amount), 0) as total'), knex.raw('COUNT(*) as count'))
    .first();

  const weekStats = await knex('sales_logs')
    .where({ trader_id: trader.id })
    .where('logged_at', '>=', weekStart)
    .sum('amount as total')
    .first();

  const sabiResult = await sabiScoreService.calculateTraderSabiScore(trader.id);
  const weeksToLoan = sabiResult.score >= 50 ? 0 : Math.ceil((50 - sabiResult.score) / 2);

  eventBus.emit('sale_logged', {
    actor: trader.name,
    description: `Sale logged: ${sale.quantity}x ${sale.item_name} for ₦${sale.amount.toLocaleString()}`,
    metadata: { amount: sale.amount, trader_name: trader.name, sabi_score: sabiResult.score, channel: 'chat' }
  });

  return {
    type: 'sale_logged',
    message: `Sale logged: ${sale.quantity}x ${sale.item_name} — ₦${sale.amount.toLocaleString()}`,
    data: {
      sale,
      today_total: parseInt(todayStats.total) || 0,
      today_count: parseInt(todayStats.count) || 0,
      week_total: parseInt(weekStats.total) || 0,
      sabi_score_before: trader.sabi_score,
      sabi_score_after: sabiResult.score,
      weeks_to_loan: weeksToLoan
    }
  };
}

async function handleJobSeeker(intent, { user_id, user_lat, user_lng }) {
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

  return {
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
    }
  };
}

async function handleStatusCheck(userId, userType) {
  if (!userId) {
    return { type: 'text', message: "I couldn't find your profile. Please register first." };
  }

  if (userType === 'worker' || !userType) {
    let worker = await knex('workers').where({ phone: userId }).first();
    if (!worker) {
      try { worker = await knex('workers').where({ id: userId }).first(); } catch (_) {}
    }
    if (worker) {
      const { getTier } = require('../services/trust');
      return {
        type: 'status',
        message: `Your trust score is ${parseFloat(worker.trust_score).toFixed(2)} — ${getTier(parseFloat(worker.trust_score)).label} tier.`,
        data: {
          trust_score: parseFloat(worker.trust_score),
          sabi_score: worker.sabi_score,
          total_jobs: worker.total_jobs,
          total_income: worker.total_income,
          tier: getTier(parseFloat(worker.trust_score))
        }
      };
    }
  }

  if (userType === 'trader') {
    let trader = await knex('traders').where({ phone: userId }).first();
    if (!trader) {
      try { trader = await knex('traders').where({ id: userId }).first(); } catch (_) {}
    }
    if (trader) {
      return {
        type: 'status',
        message: `Sabi Score: ${trader.sabi_score}. Total sales: ${trader.total_logged_sales}.`,
        data: {
          sabi_score: trader.sabi_score,
          total_sales: trader.total_logged_sales,
          total_revenue: trader.total_logged_revenue
        }
      };
    }
  }

  return { type: 'text', message: "I couldn't find your profile. Please register first." };
}

function handlePriceInquiry(intent) {
  const priceRange = estimatePriceRange(intent.trade_category || 'plumbing');
  const tradeName = (intent.trade_category || 'service').replace('_', ' ');

  return {
    type: 'price_inquiry',
    message: `${tradeName} typically costs ₦${priceRange.min.toLocaleString()} – ₦${priceRange.max.toLocaleString()}.`,
    data: { trade: intent.trade_category, ...priceRange }
  };
}

async function handleReEngage(userId, userType) {
  let summary = 'Welcome back!';
  if (userId && userType === 'trader') {
    const trader = await knex('traders').where({ phone: userId }).orWhere({ id: userId }).first();
    if (trader) {
      summary = `Welcome back! Your Sabi Score is ${trader.sabi_score}. You've logged ${trader.total_logged_sales} sales total.`;
    }
  } else if (userId && (userType === 'worker' || !userType)) {
    const worker = await knex('workers').where({ phone: userId }).orWhere({ id: userId }).first();
    if (worker) {
      summary = `Welcome back! You've completed ${worker.total_jobs} jobs. Trust score: ${parseFloat(worker.trust_score).toFixed(2)}.`;
    }
  }

  return { type: 're_engage', message: summary, data: null };
}

function getGreeting(userType) {
  switch (userType) {
    case 'worker': return "Hi! You have new job requests nearby. What can I help with?";
    case 'trader': return "Hello! Ready to log today's sales? Just tell me what you sold.";
    case 'seeker': return "Hey! Want to see what trades are in demand near you today?";
    default: return "Welcome to SabiWork! What do you need help with?";
  }
}

function getHelpMessage(userType) {
  const base = "I can help you with:\n• Find workers nearby\n• Log sales\n• Check your Sabi Score\n• Create investment rounds\n• Check wallet balance";
  const extras = {
    trader: "\n• Get weekly sales reports\n• Track your path to microloans",
    worker: "\n• Update availability\n• See your trust score\n• Find jobs",
    seeker: "\n• See in-demand trades\n• Find apprenticeships"
  };
  return base + (extras[userType] || '');
}

module.exports = router;
