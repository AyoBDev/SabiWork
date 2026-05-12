// backend/src/routes/demo.js
const { Router } = require('express');
const eventBus = require('../utils/eventBus');

const router = Router();

// POST /api/demo/run — triggers a demo scenario
router.post('/run', async (req, res) => {
  const { scenario = 'buyer-worker' } = req.body;
  res.json({ success: true, message: `Demo scenario "${scenario}" started` });

  if (scenario === 'buyer-worker') {
    runBuyerWorkerCycle();
  } else if (scenario === 'market-day') {
    runMarketDay();
  } else if (scenario === 'ghost') {
    fireGhostMessages();
  } else if (scenario === 'story') {
    runStory();
  } else if (scenario === 'full') {
    runFull();
  }
});

// POST /api/demo/ghost — fire ghost messages (audience fallback)
router.post('/ghost', async (req, res) => {
  res.json({ success: true, message: 'Ghost messages fired' });
  fireGhostMessages();
});

// POST /api/demo/event — emit a custom event from external services
router.post('/event', (req, res) => {
  const { type, actor, description, metadata } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: 'type and description required' });
  }
  eventBus.emit(type, { actor: actor || 'WhatsApp Bot', description, metadata: metadata || {} });
  res.json({ success: true });
});

// =============================================================================
// SCENARIO: buyer-worker (original)
// =============================================================================

async function runBuyerWorkerCycle() {
  const steps = [
    {
      delay: 500,
      type: 'message_parsed',
      actor: 'Buyer (Chidi)',
      description: 'Received request: "I need a plumber in Ikeja urgently"',
      metadata: { channel: 'pwa', area: 'Ikeja' }
    },
    {
      delay: 2000,
      type: 'job_matched',
      actor: 'AI Engine',
      description: 'Matched Chidi with Emeka (Plumber, 4.8 rating, SabiScore 67)',
      metadata: { worker_name: 'Emeka', service: 'plumbing', area: 'Ikeja' }
    },
    {
      delay: 2000,
      type: 'payment_received',
      actor: 'Squad API',
      description: 'Payment initiated: ₦15,000 via card (ref: SBW-7842)',
      metadata: { amount: 1500000, method: 'card', reference: 'SBW-7842' }
    },
    {
      delay: 2000,
      type: 'payment_received',
      actor: 'Squad Webhook',
      description: 'Payment confirmed — holding for job completion',
      metadata: { amount: 1500000, status: 'confirmed' }
    },
    {
      delay: 2500,
      type: 'job_completed',
      actor: 'Emeka (Plumber)',
      description: 'Job completed — buyer rated 5/5. Releasing payout.',
      metadata: { worker_name: 'Emeka', rating: 5, service: 'plumbing' }
    },
    {
      delay: 2000,
      type: 'payout_sent',
      actor: 'Squad API',
      description: 'Payout ₦14,250 sent to Emeka (GTBank ****4521)',
      metadata: { amount: 1425000, worker_name: 'Emeka', bank: 'GTBank' }
    },
    {
      delay: 1500,
      type: 'score_updated',
      actor: 'Trust Engine',
      description: 'Emeka SabiScore updated: 67 → 71 (+4) — Tier: Verified',
      metadata: { worker_name: 'Emeka', old_score: 67, new_score: 71, tier: 'Verified' }
    }
  ];

  for (const step of steps) {
    await sleep(step.delay);
    eventBus.emit(step.type, {
      actor: step.actor,
      description: step.description,
      metadata: step.metadata
    });
  }
}

// =============================================================================
// SCENARIO: market-day (original)
// =============================================================================

async function runMarketDay() {
  const traders = [
    { name: 'Mama Ngozi', item: 'bags of rice', qty: 10, amount: 450000, area: 'Mile 12' },
    { name: 'Alhaji Musa', item: 'cement', qty: 20, amount: 1200000, area: 'Trade Fair' },
    { name: 'Sister Amaka', item: 'ankara fabric', qty: 15, amount: 375000, area: 'Balogun' }
  ];

  for (const trader of traders) {
    await sleep(3000);
    eventBus.emit('message_parsed', {
      actor: trader.name,
      description: `WhatsApp: "sold ${trader.qty} ${trader.item} ${trader.amount}"`,
      metadata: { channel: 'whatsapp', area: trader.area }
    });

    await sleep(1500);
    eventBus.emit('sale_logged', {
      actor: trader.name,
      description: `Logged sale: ${trader.qty}x ${trader.item} for ₦${trader.amount.toLocaleString()}`,
      metadata: { trader_name: trader.name, item: trader.item, amount: trader.amount, area: trader.area }
    });

    await sleep(1000);
    eventBus.emit('score_updated', {
      actor: 'SabiScore Engine',
      description: `${trader.name} SabiScore updated: +3 points`,
      metadata: { trader_name: trader.name }
    });
  }
}

// =============================================================================
// SCENARIO: ghost (audience fallback messages)
// =============================================================================

function fireGhostMessages() {
  const ghosts = [
    { delay: 0, name: 'Audience Member 1', msg: 'sold 3 cartons malt 27000', area: 'Surulere' },
    { delay: 4000, name: 'Audience Member 2', msg: 'I need an electrician in Lekki', area: 'Lekki' },
    { delay: 8000, name: 'Audience Member 3', msg: 'sold 50 plates rice 75000', area: 'Oshodi' }
  ];

  ghosts.forEach(async (ghost) => {
    await sleep(ghost.delay);
    eventBus.emit('message_parsed', {
      actor: ghost.name,
      description: `WhatsApp: "${ghost.msg}"`,
      metadata: { channel: 'whatsapp', area: ghost.area }
    });

    await sleep(1500);
    if (ghost.msg.startsWith('sold')) {
      eventBus.emit('sale_logged', {
        actor: ghost.name,
        description: 'Sale logged from audience participant',
        metadata: { area: ghost.area }
      });
    } else {
      eventBus.emit('job_matched', {
        actor: 'AI Engine',
        description: `Matching ${ghost.name} with available worker in ${ghost.area}`,
        metadata: { area: ghost.area }
      });
    }

    await sleep(1000);
    eventBus.emit('score_updated', {
      actor: 'SabiScore Engine',
      description: `New SabiScore created for ${ghost.name}: 12/100`,
      metadata: { score: 12 }
    });
  });
}

// =============================================================================
// SCENARIO: story — "Mama Chioma's Day" (narrated 3-minute story arc)
// =============================================================================

async function runStory() {
  const steps = [
    // Step 1: Mama Chioma logs a sale via WhatsApp
    {
      delay: 2000,
      type: 'message_parsed',
      actor: 'Mama Chioma',
      description: 'WhatsApp: "sold 3 bundles ankara fabric 45000"',
      metadata: { channel: 'whatsapp', area: 'Balogun Market', item: 'ankara fabric', qty: 3, amount: 4500000 }
    },
    // Step 2: Agent parses and confirms, updates SabiScore
    {
      delay: 3000,
      type: 'sale_logged',
      actor: 'SabiWork Agent',
      description: 'Sale confirmed: 3x ankara fabric for ₦45,000. Revenue today: ₦128,000.',
      metadata: { trader_name: 'Mama Chioma', item: 'ankara fabric', qty: 3, amount: 4500000, area: 'Balogun Market' }
    },
    {
      delay: 2000,
      type: 'score_updated',
      actor: 'SabiScore Engine',
      description: 'Mama Chioma SabiScore updated: 54 → 58 (+4) — consistent daily logging streak',
      metadata: { trader_name: 'Mama Chioma', old_score: 54, new_score: 58, area: 'Balogun Market' }
    },
    // Step 3: Supplier Emeka gets auto-matched for restocking
    {
      delay: 3500,
      type: 'supplier_matched',
      actor: 'Supply Chain Engine',
      description: 'Auto-restock triggered: Mama Chioma\'s ankara stock low. Matched supplier Emeka (Oshodi).',
      metadata: { trader_name: 'Mama Chioma', supplier_name: 'Emeka', item: 'ankara fabric', area: 'Oshodi' }
    },
    // Step 4: Payment flows from Mama Chioma to Emeka
    {
      delay: 3000,
      type: 'payment_received',
      actor: 'Squad API',
      description: 'Payment initiated: ₦32,000 from Mama Chioma to Emeka (restock order #RST-2291)',
      metadata: { amount: 3200000, from: 'Mama Chioma', to: 'Emeka', reference: 'RST-2291', area: 'Oshodi' }
    },
    {
      delay: 2500,
      type: 'payment_received',
      actor: 'Squad Webhook',
      description: 'Payment confirmed: ₦32,000 received by Emeka. Delivery scheduled.',
      metadata: { amount: 3200000, status: 'confirmed', supplier_name: 'Emeka', area: 'Oshodi' }
    },
    // Step 5: Emeka's SabiScore unlocks investment round
    {
      delay: 3000,
      type: 'score_updated',
      actor: 'SabiScore Engine',
      description: 'Emeka SabiScore updated: 72 → 76 (+4) — Tier unlocked: INVESTOR-READY',
      metadata: { trader_name: 'Emeka', old_score: 72, new_score: 76, tier: 'Investor-Ready', area: 'Oshodi' }
    },
    {
      delay: 2000,
      type: 'investment_round_opened',
      actor: 'SabiInvest Engine',
      description: 'Investment round opened for Emeka (Textile Supplier, Oshodi). Target: ₦500,000. SabiScore: 76.',
      metadata: { trader_name: 'Emeka', target: 50000000, score: 76, area: 'Oshodi' }
    },
    // Step 6: Two investors join
    {
      delay: 3500,
      type: 'investment_received',
      actor: 'Investor: Ade (Lagos Angel)',
      description: 'Investment: ₦100,000 into Emeka\'s round. "Strong supply chain activity."',
      metadata: { investor: 'Ade', amount: 10000000, trader_name: 'Emeka', area: 'Victoria Island' }
    },
    {
      delay: 2500,
      type: 'investment_received',
      actor: 'Investor: Fatima (Diaspora)',
      description: 'Investment: ₦100,000 into Emeka\'s round. "Love the SabiScore transparency."',
      metadata: { investor: 'Fatima', amount: 10000000, trader_name: 'Emeka', area: 'Abuja' }
    },
    // Step 7: Meanwhile, Adamu gets matched to a job
    {
      delay: 4000,
      type: 'message_parsed',
      actor: 'Customer (Bisi)',
      description: 'PWA: "I need a plumber in Ikeja — kitchen pipe burst"',
      metadata: { channel: 'pwa', area: 'Ikeja', service: 'plumbing' }
    },
    {
      delay: 2500,
      type: 'job_matched',
      actor: 'AI Engine',
      description: 'Matched Bisi with Adamu (Plumber, SabiScore 61, 4.7 rating, 2.3km away)',
      metadata: { worker_name: 'Adamu', service: 'plumbing', score: 61, area: 'Ikeja' }
    },
    // Step 8: Customer pays, job completes, payout sent
    {
      delay: 3000,
      type: 'payment_received',
      actor: 'Squad API',
      description: 'Payment initiated: ₦15,000 from Bisi (ref: SBW-9103)',
      metadata: { amount: 1500000, method: 'transfer', reference: 'SBW-9103', area: 'Ikeja' }
    },
    {
      delay: 2500,
      type: 'job_completed',
      actor: 'Adamu (Plumber)',
      description: 'Job completed in 47 minutes — Bisi rated 5/5: "Fast and professional!"',
      metadata: { worker_name: 'Adamu', rating: 5, duration_mins: 47, service: 'plumbing', area: 'Ikeja' }
    },
    {
      delay: 2000,
      type: 'payout_sent',
      actor: 'Squad API',
      description: 'Payout ₦14,250 sent to Adamu (Access Bank ****7733)',
      metadata: { amount: 1425000, worker_name: 'Adamu', bank: 'Access Bank', area: 'Ikeja' }
    },
    // Step 9: Adamu's score updates, gets verified
    {
      delay: 2500,
      type: 'score_updated',
      actor: 'SabiScore Engine',
      description: 'Adamu SabiScore updated: 61 → 66 (+5) — Tier: VERIFIED',
      metadata: { worker_name: 'Adamu', old_score: 61, new_score: 66, tier: 'Verified', area: 'Ikeja' }
    },
    {
      delay: 2000,
      type: 'verification_granted',
      actor: 'Trust Engine',
      description: 'Adamu verified! Badge unlocked. Now eligible for premium jobs and microloans.',
      metadata: { worker_name: 'Adamu', badge: 'verified', area: 'Ikeja' }
    },
    // Step 10: Platform summary
    {
      delay: 3500,
      type: 'platform_summary',
      actor: 'SabiWork Platform',
      description: '3-min recap: 7 transactions processed, ₦307,000 moved, 4 SabiScores updated, 1 investment round funded, 1 worker verified.',
      metadata: {
        transactions: 7,
        volume: 30700000,
        scores_updated: 4,
        investment_rounds: 1,
        verifications: 1,
        area: 'Lagos'
      }
    }
  ];

  for (const step of steps) {
    await sleep(step.delay);
    eventBus.emit(step.type, {
      actor: step.actor,
      description: step.description,
      metadata: step.metadata
    });
  }
}

// =============================================================================
// SCENARIO: full — story + interleaved ghost messages for maximum visual density
// =============================================================================

async function runFull() {
  // Run story and ghost messages in parallel for visual density
  const storyPromise = runStory();
  const ghostPromise = runFullGhosts();
  await Promise.all([storyPromise, ghostPromise]);
}

async function runFullGhosts() {
  // Interleaved audience ghost messages — delays are gaps between each ghost
  const ghosts = [
    { gap: 5000, name: 'Tunde (Audience)', msg: 'sold 12 bags cement 84000', area: 'Ajah' },
    { gap: 5000, name: 'Grace (Audience)', msg: 'I need a tailor in Surulere', area: 'Surulere' },
    { gap: 8000, name: 'Chinedu (Audience)', msg: 'sold 5 crates tomato 35000', area: 'Mile 12' },
    { gap: 7000, name: 'Kemi (Audience)', msg: 'sold 20 yards lace 120000', area: 'Oshodi' },
    { gap: 7000, name: 'Yusuf (Audience)', msg: 'I need a generator repairer in Yaba', area: 'Yaba' },
    { gap: 7000, name: 'Blessing (Audience)', msg: 'sold 8 cartons indomie 52000', area: 'Ikorodu' },
    { gap: 8000, name: 'Osas (Audience)', msg: 'sold 2 bales thrift 68000', area: 'Yaba' },
    { gap: 8000, name: 'Dayo (Audience)', msg: 'I need a painter in Lekki', area: 'Lekki' }
  ];

  for (const ghost of ghosts) {
    await sleep(ghost.gap);
    eventBus.emit('message_parsed', {
      actor: ghost.name,
      description: `WhatsApp: "${ghost.msg}"`,
      metadata: { channel: 'whatsapp', area: ghost.area, is_audience: true }
    });

    await sleep(1500);
    if (ghost.msg.startsWith('sold')) {
      eventBus.emit('sale_logged', {
        actor: ghost.name,
        description: `Sale logged from audience participant in ${ghost.area}`,
        metadata: { area: ghost.area, is_audience: true }
      });
    } else {
      eventBus.emit('job_matched', {
        actor: 'AI Engine',
        description: `Matching ${ghost.name} with available worker in ${ghost.area}`,
        metadata: { area: ghost.area, is_audience: true }
      });
    }

    await sleep(1000);
    eventBus.emit('score_updated', {
      actor: 'SabiScore Engine',
      description: `New SabiScore created for ${ghost.name}: 12/100`,
      metadata: { score: 12, area: ghost.area, is_audience: true }
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
