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

    backendAPI.notifyEvent('apprenticeship_applied', {
      actor: phone,
      description: `Seeker applied for apprenticeship with ${ctx.apprenticeship.master_name}`,
      metadata: { trade: ctx.apprenticeship.trade, channel: 'whatsapp' }
    });
    conversations.delete(phone);
    return `✅ Application sent! You'll hear back from ${ctx.apprenticeship.master_name} soon.`;
  }

  // Get pathway recommendation via AI
  try {
    const response = await backendAPI.chat(text, {
      user_id: phone,
      user_type: 'seeker',
      channel: 'whatsapp'
    });

    if (response.type === 'demand_card' && response.data) {
      const data = response.data;
      let reply = `🎯 *In-Demand Trades Near You*\n\n`;

      if (data.trades && data.trades.length > 0) {
        data.trades.forEach((t, i) => {
          reply += `${i + 1}. ${t.trade || t.name} — ${t.demand || 'High demand'}\n`;
        });
      }

      if (data.apprenticeships && data.apprenticeships.length > 0) {
        const app = data.apprenticeships[0];
        reply += `\n📚 *Apprenticeship Available:*\n`;
        reply += `👷 Master: ${app.master_name}\n`;
        reply += `🔧 Trade: ${app.trade}\n`;
        reply += `⏱️ Duration: ${app.duration_weeks} weeks\n`;
        reply += `💰 Stipend: ₦${(app.weekly_stipend || 0).toLocaleString()}/week\n\n`;
        reply += `Reply *APPLY* to apply!`;

        conversations.set(phone, {
          ...state,
          seekerContext: { apprenticeship: app }
        });
      }

      return reply.trim();
    }

    if (response.message) {
      return response.message;
    }

    return `I can help you find a career path! Tell me:\n• What trade interests you?\n• What area are you in?\n\nExample: "I want to learn plumbing in Surulere"`;
  } catch (err) {
    return `I can help you find a career path! Tell me:\n• What trade interests you?\n• What area are you in?\n\nExample: "I want to learn plumbing in Surulere"`;
  }
}
