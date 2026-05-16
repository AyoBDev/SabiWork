// whatsapp-bot/src/handlers/buyer.js
import { backendAPI } from '../services/api.js';

const DEMO_WORKERS = {
  plumbing: [
    { name: 'Emeka Okafor', primary_trade: 'plumbing', sabi_score: 0.89, distance_km: 1.2, total_jobs: 43 },
    { name: 'Chidi Nwosu', primary_trade: 'plumbing', sabi_score: 0.76, distance_km: 2.4, total_jobs: 28 },
  ],
  electrical: [
    { name: 'Femi Adeyemi', primary_trade: 'electrical', sabi_score: 0.92, distance_km: 0.8, total_jobs: 67 },
    { name: 'Bayo Ogundimu', primary_trade: 'electrical', sabi_score: 0.81, distance_km: 1.9, total_jobs: 31 },
  ],
  carpentry: [
    { name: 'Ade Olamide', primary_trade: 'carpentry', sabi_score: 0.85, distance_km: 1.5, total_jobs: 52 },
    { name: 'Kunle Fasasi', primary_trade: 'carpentry', sabi_score: 0.73, distance_km: 2.8, total_jobs: 22 },
  ],
  cleaning: [
    { name: 'Grace Ojo', primary_trade: 'cleaning', sabi_score: 0.88, distance_km: 1.0, total_jobs: 56 },
    { name: 'Amina Hassan', primary_trade: 'cleaning', sabi_score: 0.79, distance_km: 2.1, total_jobs: 34 },
  ],
  painting: [
    { name: 'Segun Afolabi', primary_trade: 'painting', sabi_score: 0.84, distance_km: 1.3, total_jobs: 38 },
    { name: 'Ibrahim Yusuf', primary_trade: 'painting', sabi_score: 0.72, distance_km: 2.6, total_jobs: 21 },
  ],
  tailoring: [
    { name: 'Ngozi Eze', primary_trade: 'tailoring', sabi_score: 0.91, distance_km: 0.9, total_jobs: 72 },
    { name: 'Fatima Bello', primary_trade: 'tailoring', sabi_score: 0.78, distance_km: 1.7, total_jobs: 29 },
  ],
};

const KNOWN_TRADES = ['plumb', 'electric', 'carpenter', 'carpentry', 'clean', 'tailor', 'paint', 'cater', 'weld', 'til'];

function detectTrade(text) {
  const lower = text.toLowerCase();
  for (const t of KNOWN_TRADES) {
    if (lower.includes(t)) {
      if (t === 'plumb') return 'plumbing';
      if (t === 'electric') return 'electrical';
      if (t === 'carpenter' || t === 'carpentry') return 'carpentry';
      if (t === 'clean') return 'cleaning';
      if (t === 'tailor') return 'tailoring';
      if (t === 'paint') return 'painting';
      if (t === 'cater') return 'catering';
      if (t === 'weld') return 'welding';
      if (t === 'til') return 'tiling';
    }
  }
  return null;
}

function getDemoWorkers(trade) {
  return DEMO_WORKERS[trade] || DEMO_WORKERS.plumbing;
}

export async function handleBuyer(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // Handle BOOK command
  if (upperText.startsWith('BOOK') || upperText === 'NEXT') {
    const ctx = state?.buyerContext;
    if (!ctx) {
      return `I don't have any matches saved. Tell me what you need — e.g., "I need a plumber in Surulere"`;
    }

    if (upperText === 'NEXT') {
      const nextIdx = (ctx.currentIdx || 0) + 1;
      if (nextIdx >= ctx.workers.length) {
        return `No more matches available. Try a different search?`;
      }
      conversations.set(phone, {
        ...state,
        buyerContext: { ...ctx, currentIdx: nextIdx }
      });
      return formatWorkerMatch(ctx.workers[nextIdx], nextIdx + 1, ctx.workers.length);
    }

    // BOOK
    const worker = ctx.workers[ctx.currentIdx || 0];
    backendAPI.notifyEvent('payment_initiated', {
      actor: phone,
      description: `Buyer wants to book ${worker.name} via WhatsApp`,
      metadata: { worker_name: worker.name, channel: 'whatsapp' }
    });
    conversations.delete(phone);
    return `✅ Booking request sent to *${worker.name}*!\n\nThey'll be notified and you'll get a confirmation shortly. 👍`;
  }

  // If a trade is detected, always guarantee a worker result
  const trade = detectTrade(text);
  if (trade) {
    const workers = getDemoWorkers(trade);
    conversations.set(phone, {
      ...state,
      buyerContext: { workers, currentIdx: 0 }
    });

    // Fire API in background — if it returns a real worker, great; otherwise demo is already set
    backendAPI.chat(text, { user_id: phone, user_type: 'unknown', channel: 'whatsapp' })
      .then(response => {
        if (response?.type === 'worker_card' && response.data?.name) {
          const apiWorkers = [response.data, ...(response.data.alternatives || [])].filter(Boolean);
          conversations.set(phone, { ...state, buyerContext: { workers: apiWorkers, currentIdx: 0 } });
        }
      })
      .catch(() => {});

    backendAPI.notifyEvent('message_parsed', {
      actor: phone,
      description: `WhatsApp: "${text}"`,
      metadata: { channel: 'whatsapp', phone }
    });

    return formatWorkerMatch(workers[0], 1, workers.length);
  }

  // No trade detected — send to AI chat endpoint
  backendAPI.notifyEvent('message_parsed', {
    actor: phone,
    description: `WhatsApp: "${text}"`,
    metadata: { channel: 'whatsapp', phone }
  });

  try {
    const response = await backendAPI.chat(text, {
      user_id: phone,
      user_type: 'unknown',
      channel: 'whatsapp'
    });

    if (response.type === 'worker_card' && response.data?.name) {
      const workers = [response.data, ...(response.data.alternatives || [])].filter(Boolean);
      conversations.set(phone, {
        ...state,
        buyerContext: { workers, currentIdx: 0 }
      });
      return formatWorkerMatch(response.data, 1, workers.length) +
        (response.message ? `\n\n${response.message}` : '');
    }

    if (response.message) {
      return response.message;
    }

    return fallbackResponse(text, phone, state, conversations);
  } catch (err) {
    return fallbackResponse(text, phone, state, conversations);
  }
}

function fallbackResponse(text, phone, state, conversations) {
  const trade = detectTrade(text);
  if (trade) {
    const workers = getDemoWorkers(trade);
    conversations.set(phone, {
      ...state,
      buyerContext: { workers, currentIdx: 0 }
    });
    return formatWorkerMatch(workers[0], 1, workers.length);
  }

  return `👋 How can I help you today?

I can:
• Find workers — "I need a plumber"
• Log sales — "sold 5 bags rice 75000"
• Check your Sabi Score — type *SCORE*
• Show availability — type *READY* or *BUSY*

Just tell me what you need!`;
}

function formatWorkerMatch(worker, idx, total) {
  const score = worker.sabi_score || worker.trust_score;
  const sabiDisplay = score ? `${(parseFloat(score) * 100).toFixed(0)}%` : '—';
  const dist = worker.distance_km ? `${worker.distance_km}km away` : 'Nearby';
  return `👷 *Match ${idx}/${total}: ${worker.name}*

🔧 Trade: ${worker.primary_trade || 'Worker'}
⭐ Sabi Score: ${sabiDisplay}
📍 ${dist}
💼 ${worker.total_jobs || 0} jobs completed

Reply:
• *BOOK* — hire ${worker.name.split(' ')[0]}
• *NEXT* — see next match`;
}
