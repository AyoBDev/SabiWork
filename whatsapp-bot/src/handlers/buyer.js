// whatsapp-bot/src/handlers/buyer.js
import { backendAPI } from '../services/api.js';

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
      const worker = ctx.workers[nextIdx];
      return formatWorkerMatch(worker, nextIdx + 1, ctx.workers.length);
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

  // Default: Send to AI chat endpoint
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

    // Chat endpoint returns { type, message, data, steps, suggestions }
    if (response.type === 'worker_card' && response.data) {
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

    return 'I can help you find workers nearby. Try: "I need a plumber in Surulere"';
  } catch (err) {
    return `Sorry, I couldn't process that right now. Try again in a moment.\n\nTip: Tell me what you need like "I need a plumber in Surulere"`;
  }
}

function formatWorkerMatch(worker, idx, total) {
  const trust = worker.trust_score ? `${(parseFloat(worker.trust_score) * 100).toFixed(0)}%` : '—';
  const dist = worker.distance_km ? `${worker.distance_km}km away` : 'Nearby';
  return `👷 *Match ${idx}/${total}: ${worker.name}*

🔧 Trade: ${worker.primary_trade || 'Worker'}
🛡️ Trust: ${trust}
📍 ${dist}
💼 ${worker.total_jobs || 0} jobs completed

Reply:
• *BOOK* — hire ${worker.name.split(' ')[0]}
• *NEXT* — see next match`;
}
