// whatsapp-bot/src/handlers/buyer.js
import { backendAPI } from '../services/api.js';

export async function handleBuyer(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // Handle BOOK command (user wants to book a specific worker)
  if (upperText.startsWith('BOOK') || upperText === 'NEXT') {
    const ctx = state?.buyerContext;
    if (!ctx) {
      return `I don't have any matches saved. Tell me what you need — e.g., "I need a plumber in Surulere"`;
    }

    if (upperText === 'NEXT') {
      // Show next worker in list
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

    // BOOK — proceed to payment
    const worker = ctx.workers[ctx.currentIdx || 0];
    try {
      const response = await backendAPI.chat(`BOOK ${worker.id}`, {
        action: 'book',
        worker_id: worker.id,
        buyer_phone: phone
      });

      const paymentMsg = response.messages?.find((m) => m.type === 'payment_card');
      if (paymentMsg) {
        conversations.delete(phone);
        return `💳 *Payment for ${worker.name}*

Amount: *₦${Number(paymentMsg.data.amount).toLocaleString()}*
Service: ${paymentMsg.data.service_category}

Pay here: ${paymentMsg.data.checkout_url}

After payment, ${worker.name.split(' ')[0]} will be notified and you'll get a confirmation. 👍`;
      }

      return response.messages?.[0]?.text || 'Booking initiated! You\'ll receive payment instructions shortly.';
    } catch (err) {
      return `⚠️ Booking failed. Try again shortly.`;
    }
  }

  // Default: Send natural language to AI
  try {
    const response = await backendAPI.chat(text, { phone, channel: 'whatsapp' });

    // Process response messages
    const messages = response.messages || [response];
    let reply = '';

    for (const msg of messages) {
      if (msg.type === 'text') {
        reply += msg.text + '\n\n';
      } else if (msg.type === 'worker_card') {
        // Store context for BOOK/NEXT flow
        const workers = response.workers || [msg.data];
        conversations.set(phone, {
          ...state,
          buyerContext: { workers, currentIdx: 0 }
        });
        reply += formatWorkerMatch(msg.data, 1, workers.length);
      }
    }

    return reply.trim() || 'I couldn\'t understand that. Try telling me what service you need — e.g., "I need a plumber in Surulere"';
  } catch (err) {
    return `Sorry, I couldn't process that right now. Try again in a moment.\n\nTip: Tell me what you need like "I need a plumber in Surulere"`;
  }
}

function formatWorkerMatch(worker, idx, total) {
  const stars = '⭐'.repeat(Math.round(worker.trust_score * 5));
  return `👷 *Match ${idx}/${total}: ${worker.name}*

🔧 Trade: ${worker.primary_trade}
${stars} Trust: ${(worker.trust_score * 100).toFixed(0)}%
📍 ${worker.distance || 'Nearby'}
💼 ${worker.total_jobs} jobs completed

Reply:
• *BOOK* — hire ${worker.name.split(' ')[0]}
• *NEXT* — see next match`;
}
