// backend/src/services/nlp.js
const Groq = require('groq-sdk');
const config = require('../config');

const groq = new Groq({ apiKey: config.groqApiKey });

const GROQ_TIMEOUT = 3000;

async function classifySale(message) {
  const systemPrompt = `You are a sales log parser for Nigerian market traders on SabiWork.
Extract sale details from informal messages. Traders write in Nigerian English or Pidgin.

Categories: provisions, electronics, clothing, food, household, building_materials, cosmetics, beverages, other

Examples:
- "sold 3 bags rice 75000" → rice, 3, bags, 75000, provisions
- "2 carton indomie 18500" → Indomie, 2, cartons, 18500, provisions
- "sold provisions today 94500" → Provisions (bulk), 1, lot, 94500, provisions
- "cement 5 bags 32k" → Cement, 5, bags, 32000, building_materials
- "phone charger 3 pieces 4500" → Phone Charger, 3, pieces, 4500, electronics
- "sold crate of egg 3800" → Eggs, 1, crate, 3800, food
- "2 bag of pure water 1200" → Pure Water, 2, bags, 1200, beverages

Notes:
- "k" means thousand (32k = 32000)
- Amount is always in Naira
- Quantity defaults to 1 if not specified
- Capitalize item names properly

Respond ONLY with JSON. No markdown, no explanation.`;

  const userPrompt = `Parse this sale: "${message}"

Return JSON:
{
  "item_name": "item name capitalized",
  "quantity": number,
  "unit": "bags|cartons|pieces|crates|lots|kg|other",
  "amount": number_in_naira,
  "category": "category_from_list"
}`;

  try {
    const response = await Promise.race([
      groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), GROQ_TIMEOUT))
    ]);

    const content = response.choices[0]?.message?.content;
    const result = JSON.parse(content);

    if (!result.amount || result.amount <= 0) {
      throw new Error('Invalid amount');
    }

    return {
      item_name: result.item_name || 'Unknown Item',
      quantity: result.quantity || 1,
      unit: result.unit || 'pieces',
      amount: parseInt(result.amount),
      category: result.category || 'other'
    };
  } catch (error) {
    console.error('Sale classification failed, using fallback:', error.message);
    return fallbackParseSale(message);
  }
}

function fallbackParseSale(message) {
  const lower = message.toLowerCase().replace(/,/g, '');

  let amount = null;
  const amountMatch = lower.match(/(\d+)k\b/) || lower.match(/(\d{4,})/);
  if (amountMatch) {
    amount = amountMatch[1].length <= 3
      ? parseInt(amountMatch[1]) * 1000
      : parseInt(amountMatch[1]);
  }

  let quantity = 1;
  const qtyMatch = lower.match(/(\d{1,2})\s*(bag|carton|piece|crate|kg|dozen)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1]);
  }

  let item = 'Unknown Item';
  const cleanedMsg = lower.replace(/^sold?\s*/i, '').replace(/\d+k?/g, '').trim();
  const words = cleanedMsg.split(/\s+/).filter(w => !['bag', 'bags', 'carton', 'cartons', 'pieces', 'of'].includes(w));
  if (words.length > 0) {
    item = words.slice(0, 3).join(' ');
    item = item.charAt(0).toUpperCase() + item.slice(1);
  }

  if (!amount) {
    return null;
  }

  return {
    item_name: item,
    quantity,
    unit: 'pieces',
    amount,
    category: 'other'
  };
}

function formatSaleResponse(sale, traderStats) {
  const scoreChange = traderStats.sabi_score_after > traderStats.sabi_score_before;
  const scoreLine = scoreChange
    ? `SabiScore: ${traderStats.sabi_score_before} → ${traderStats.sabi_score_after} 📈`
    : `SabiScore: ${traderStats.sabi_score_after}`;

  let loanLine = '';
  if (traderStats.weeks_to_loan > 0) {
    loanLine = `${traderStats.weeks_to_loan} more weeks to unlock loan.`;
  } else {
    loanLine = `✅ You qualify for an inventory loan! Reply *LOAN*.`;
  }

  return {
    text: `📦 *Sale Logged!*\n\n${sale.quantity} × ${sale.item_name} — ₦${sale.amount.toLocaleString()}\n\n📊 Today: ₦${traderStats.today_total.toLocaleString()} (${traderStats.today_count} sales)\n📊 This week: ₦${traderStats.week_total.toLocaleString()}\n\n${scoreLine}\n${loanLine}\n\nReply *REPORT* for weekly summary.`,
    sale
  };
}

module.exports = {
  classifySale,
  fallbackParseSale,
  formatSaleResponse
};
