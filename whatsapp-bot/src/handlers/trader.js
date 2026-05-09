// whatsapp-bot/src/handlers/trader.js
import { backendAPI } from '../services/api.js';

// Pattern: "sold 3 bags rice 75000" or "sold rice 5000"
const SALE_PATTERN = /sold\s+(\d+)?\s*(bags?|pieces?|cartons?|rolls?|plates?|packs?)?\s*(?:of\s+)?(.+?)\s+(\d[\d,]*)/i;

export function isTraderMessage(text) {
  return SALE_PATTERN.test(text) || text.toUpperCase().trim() === 'REPORT';
}

export async function handleTrader(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // REPORT command
  if (upperText === 'REPORT') {
    try {
      const report = await backendAPI.getTraderReport(phone);
      return formatReport(report);
    } catch (err) {
      return `⚠️ Could not get your report. Make sure you're registered as a trader.`;
    }
  }

  // Parse sale
  const match = text.match(SALE_PATTERN);
  if (!match) {
    // Try sending to AI for NLP parsing
    try {
      const response = await backendAPI.chat(text, { phone, channel: 'whatsapp', context: 'trader' });
      return response.messages?.[0]?.text || 'I couldn\'t parse that sale. Try: "sold 3 bags rice 75000"';
    } catch {
      return `I couldn't understand that. Try format:\n*sold [qty] [item] [amount]*\n\nExample: "sold 3 bags rice 75000"`;
    }
  }

  const quantity = parseInt(match[1]) || 1;
  const item = match[3].trim();
  const amount = parseInt(match[4].replace(/,/g, ''));

  try {
    const result = await backendAPI.logSale({
      phone,
      item_name: item,
      quantity,
      amount,
      payment_method: 'cash' // default, can be specified
    });

    return `✅ *Sale Logged!*

📦 ${quantity}x ${item}
💰 ₦${amount.toLocaleString()}

📊 *Today:* ${result.today_count || '—'} sales, ₦${(result.today_total || amount).toLocaleString()}
📈 *SabiScore:* ${result.sabi_score || '—'}/100

Keep logging to build your credit score! 💪`;
  } catch (err) {
    return `⚠️ Failed to log sale: ${err.message}\n\nMake sure you're registered. Send "register" to start.`;
  }
}

function formatReport(report) {
  if (!report) return 'No sales data found.';

  return `📊 *Weekly Sales Report*

🗓️ Period: Last 7 days

💰 *Revenue:* ₦${(report.weekly_revenue || 0).toLocaleString()}
📦 *Sales:* ${report.weekly_count || 0}
📈 *vs Last Week:* ${report.growth_pct > 0 ? '↑' : '↓'} ${Math.abs(report.growth_pct || 0)}%

🏆 *Top Items:*
${(report.top_items || []).map((i, idx) => `  ${idx + 1}. ${i.name} — ₦${i.total.toLocaleString()}`).join('\n')}

📊 *SabiScore:* ${report.sabi_score || 0}/100
${report.sabi_score >= 50 ? '🎉 You qualify for a microloan!' : `📍 ${50 - (report.sabi_score || 0)} points to loan eligibility`}

Keep logging every sale! 🚀`;
}
