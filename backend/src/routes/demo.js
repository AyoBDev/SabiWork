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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
