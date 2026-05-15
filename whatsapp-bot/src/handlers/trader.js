// whatsapp-bot/src/handlers/trader.js
import { backendAPI } from '../services/api.js';

const SALE_PATTERN = /sold\s+(\d+)?\s*(bags?|pieces?|cartons?|rolls?|plates?|packs?)?\s*(?:of\s+)?(.+?)\s+(\d[\d,]*)/i;

export function isTraderMessage(text) {
  return SALE_PATTERN.test(text) || /^sold\s/i.test(text);
}

export async function handleTrader(phone, text, state, conversations, pushName = '') {
  backendAPI.notifyEvent('message_parsed', {
    actor: pushName || phone,
    description: `WhatsApp: "${text}"`,
    metadata: { channel: 'whatsapp', phone, pushName }
  });

  const upperText = text.toUpperCase().trim();

  // REPORT command
  if (upperText === 'REPORT') {
    try {
      const report = await backendAPI.getTraderReport(phone);
      return formatReport(report);
    } catch (err) {
      return `⚠️ Could not get your report. Log some sales first!\n\nTry: "sold 3 bags rice 75000"`;
    }
  }

  // Log sale — send raw message to backend for NLP parsing
  try {
    const result = await backendAPI.logSale(phone, text);

    if (!result.success) {
      return `⚠️ ${result.error || "Couldn't parse that sale."}\n\nTry: "sold 3 bags rice 75000"`;
    }

    const sale = result.sale;
    const stats = result.trader_stats || {};

    backendAPI.notifyEvent('sale_logged', {
      actor: pushName || phone,
      description: `Sale logged via WhatsApp: ${sale.quantity}x ${sale.item_name} — ₦${Number(sale.amount).toLocaleString()}`,
      metadata: { amount: sale.amount, item: sale.item_name, channel: 'whatsapp' }
    });

    return `✅ *Sale Logged!*

📦 ${sale.quantity}x ${sale.item_name}
💰 ₦${Number(sale.amount).toLocaleString()}

📊 *Today:* ${stats.today_count || 1} sales, ₦${(stats.today_total || sale.amount).toLocaleString()}
📈 *SabiScore:* ${stats.sabi_score_after || '—'}/100${stats.weeks_to_loan === 0 ? '\n🎉 You qualify for a microloan!' : stats.weeks_to_loan ? `\n📍 ${stats.weeks_to_loan} weeks to loan eligibility` : ''}

Keep logging to build your credit score! 💪`;
  } catch (err) {
    // Fallback: try parsing locally for a nice error
    const match = text.match(SALE_PATTERN);
    if (match) {
      return `⚠️ Sale logging is temporarily unavailable. We got: ${match[1] || 1}x ${match[3]} — ₦${match[4]}\n\nPlease try again in a moment.`;
    }
    return `⚠️ Couldn't log that sale.\n\nTry format: "sold 3 bags rice 75000"`;
  }
}

function formatReport(report) {
  if (!report) return 'No sales data found. Log some sales first!';

  return `📊 *Weekly Sales Report*
${report.business_name ? `\n🏪 ${report.business_name}` : ''}
🗓️ Period: Last 7 days

💰 *Revenue:* ₦${(report.week_revenue || 0).toLocaleString()}
📦 *Sales:* ${report.week_count || 0}
📈 *Trend:* ${report.trend || '—'}

🏆 *Top Item:* ${report.top_item || 'N/A'}${report.top_amount ? ` — ₦${report.top_amount.toLocaleString()} (${report.top_pct}%)` : ''}
📅 *Best Day:* ${report.best_day || 'N/A'}${report.best_day_amount ? ` — ₦${report.best_day_amount.toLocaleString()}` : ''}

📊 *SabiScore:* ${report.sabi_score || 0}/100
${(report.sabi_score || 0) >= 50 ? '🎉 You qualify for a microloan!' : `📍 ${50 - (report.sabi_score || 0)} points to loan eligibility`}

Keep logging every sale! 🚀`;
}
