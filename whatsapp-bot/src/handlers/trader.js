// whatsapp-bot/src/handlers/trader.js
import { backendAPI } from '../services/api.js';

const SALE_PATTERN = /sold\s+(\d+)?\s*(bags?|pieces?|cartons?|rolls?|plates?|packs?|kg|units?|bowls?|crates?|baskets?)?\s*(?:of\s+)?(.+?)\s+(?:for\s+)?(\d[\d,]*)/i;
const SIMPLE_SALE = /sold\s+(.+?)\s+(?:for\s+)?(\d[\d,]*)/i;

export function isTraderMessage(text) {
  const lower = text.toLowerCase().trim();
  return SALE_PATTERN.test(text) || SIMPLE_SALE.test(text) || /^sold\s/i.test(lower);
}

function parseSaleLocally(text) {
  let match = text.match(SALE_PATTERN);
  if (match) {
    return {
      quantity: parseInt(match[1]) || 1,
      item_name: match[3].trim(),
      amount: parseInt(match[4].replace(/,/g, ''))
    };
  }

  match = text.match(SIMPLE_SALE);
  if (match) {
    return {
      quantity: 1,
      item_name: match[1].trim(),
      amount: parseInt(match[2].replace(/,/g, ''))
    };
  }

  // Last resort: find any number as amount
  const numMatch = text.match(/(\d[\d,]+)/);
  const words = text.replace(/sold|for|at|\d+/gi, '').trim().split(/\s+/).filter(w => w.length > 2);
  return {
    quantity: 1,
    item_name: words.slice(0, 3).join(' ') || 'items',
    amount: numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : 5000
  };
}

// Demo stats tracker (accumulates across messages in same session)
const demoStats = new Map();

function getDemoStats(phone, amount) {
  const existing = demoStats.get(phone) || { total: 0, count: 0, score: 28 };
  existing.total += amount;
  existing.count += 1;
  existing.score = Math.min(100, existing.score + 2);
  demoStats.set(phone, existing);
  return existing;
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
      // Demo fallback report
      const stats = demoStats.get(phone);
      if (stats && stats.count > 0) {
        return formatDemoReport(pushName || 'Trader', stats);
      }
      return `📊 *Weekly Sales Report*

No sales logged yet this week.

Start logging: "sold 3 bags rice 75000"
The more you log, the higher your SabiScore! 🚀`;
    }
  }

  // Log sale — try backend first, fall back to local
  try {
    const result = await backendAPI.logSale(phone, text);

    if (!result.success) {
      // Backend parsed but rejected — fall back to local
      return logSaleLocally(phone, text, pushName);
    }

    const sale = result.sale;
    const stats = result.trader_stats || {};

    backendAPI.notifyEvent('sale_logged', {
      actor: pushName || phone,
      description: `Sale logged via WhatsApp: ${sale.quantity}x ${sale.item_name} — ₦${Number(sale.amount).toLocaleString()}`,
      metadata: { amount: sale.amount, item: sale.item_name, channel: 'whatsapp' }
    });

    return formatSaleResponse(sale, stats);
  } catch (err) {
    // Backend down — parse and respond locally
    return logSaleLocally(phone, text, pushName);
  }
}

function logSaleLocally(phone, text, pushName) {
  const sale = parseSaleLocally(text);
  const stats = getDemoStats(phone, sale.amount);

  backendAPI.notifyEvent('sale_logged', {
    actor: pushName || phone,
    description: `Sale logged (offline): ${sale.quantity}x ${sale.item_name} — ₦${Number(sale.amount).toLocaleString()}`,
    metadata: { amount: sale.amount, item: sale.item_name, channel: 'whatsapp' }
  });

  return formatSaleResponse(sale, {
    today_count: stats.count,
    today_total: stats.total,
    sabi_score_after: stats.score,
    weeks_to_loan: stats.score >= 50 ? 0 : Math.ceil((50 - stats.score) / 2)
  });
}

function formatSaleResponse(sale, stats) {
  const weeksMsg = stats.weeks_to_loan === 0
    ? '\n🎉 You qualify for a microloan!'
    : stats.weeks_to_loan
      ? `\n📍 ${stats.weeks_to_loan} weeks to loan eligibility`
      : '';

  return `✅ *Sale Logged!*

📦 ${sale.quantity}x ${sale.item_name}
💰 ₦${Number(sale.amount).toLocaleString()}

📊 *Today:* ${stats.today_count || 1} sales, ₦${(stats.today_total || sale.amount).toLocaleString()}
📈 *SabiScore:* ${stats.sabi_score_after || 30}/100${weeksMsg}

Keep logging to build your credit score! 💪`;
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

function formatDemoReport(name, stats) {
  return `📊 *Weekly Sales Report*

🏪 ${name}
🗓️ Period: This session

💰 *Revenue:* ₦${stats.total.toLocaleString()}
📦 *Sales:* ${stats.count}
📈 *SabiScore:* ${stats.score}/100
${stats.score >= 50 ? '🎉 You qualify for a microloan!' : `📍 ${50 - stats.score} points to loan eligibility`}

Keep logging every sale! 🚀`;
}
