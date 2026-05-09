// whatsapp-bot/src/handlers/seeker.js
import { backendAPI } from '../services/api.js';

export async function handleSeeker(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // APPLY for apprenticeship
  if (upperText === 'APPLY') {
    const ctx = state?.seekerContext;
    if (!ctx || !ctx.apprenticeship) {
      return `No apprenticeship selected. Tell me what trade you want to learn — e.g., "I want to learn tiling"`;
    }

    try {
      const response = await backendAPI.chat(`APPLY ${ctx.apprenticeship.id}`, {
        action: 'apply_apprenticeship',
        phone,
        apprenticeship_id: ctx.apprenticeship.id
      });
      conversations.delete(phone);
      return response.messages?.[0]?.text || `✅ Application sent! You'll hear back from ${ctx.apprenticeship.master_name} soon.`;
    } catch (err) {
      return `⚠️ Application failed: ${err.message}`;
    }
  }

  // Get pathway recommendation
  try {
    const response = await backendAPI.chat(text, { phone, channel: 'whatsapp', context: 'seeker' });
    const messages = response.messages || [response];
    let reply = '';

    for (const msg of messages) {
      if (msg.type === 'text') {
        reply += msg.text + '\n\n';
      } else if (msg.type === 'demand_card' || msg.type === 'apprenticeship_card') {
        // Store context for APPLY
        if (msg.data?.apprenticeship) {
          conversations.set(phone, {
            ...state,
            seekerContext: { apprenticeship: msg.data.apprenticeship }
          });
        }
        reply += formatPathway(msg.data);
      }
    }

    return reply.trim() || `I can help you find work or an apprenticeship. What trade interests you?

Try: "I want to learn tiling" or "What jobs are available near me?"`;
  } catch (err) {
    return `I can help you find a career path! Tell me:\n• What trade interests you?\n• What area are you in?\n\nExample: "I want to learn plumbing in Surulere"`;
  }
}

function formatPathway(data) {
  if (!data) return '';

  let reply = `🎯 *Pathway: ${data.trade || 'Recommended'}*\n\n`;

  if (data.demand_info) {
    reply += `📊 *Demand:* ${data.demand_info}\n`;
  }

  if (data.apprenticeship) {
    reply += `\n📚 *Apprenticeship Available:*\n`;
    reply += `👷 Master: ${data.apprenticeship.master_name}\n`;
    reply += `⏱️ Duration: ${data.apprenticeship.duration_weeks} weeks\n`;
    reply += `💰 Stipend: ₦${(data.apprenticeship.weekly_stipend || 0).toLocaleString()}/week\n\n`;
    reply += `Reply *APPLY* to apply!`;
  }

  return reply;
}
