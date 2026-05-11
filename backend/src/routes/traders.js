// backend/src/routes/traders.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const redis = require('../utils/redis');
const { classifySale } = require('../services/nlp');
const { calculateTraderSabiScore } = require('../services/sabiScore');
const { processSaleSplit } = require('../services/investSplit');

const router = Router();

/**
 * POST /api/traders/register
 * Register a new trader
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, business_type, area, location_lat, location_lng } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }

    const existing = await knex('traders').where({ phone }).first();
    if (existing) {
      return res.status(409).json({ error: 'Trader already registered', trader_id: existing.id });
    }

    const [trader] = await knex('traders').insert({
      name,
      phone,
      business_type: business_type || 'other',
      area: area || 'Lagos',
      location_lat,
      location_lng
    }).returning('*');

    // Create virtual account for trader
    let virtualAccountNumber = null;
    try {
      const nameParts = name.split(' ');
      const va = await squadService.createVirtualAccount({
        customerId: trader.id,
        firstName: nameParts[0] || name,
        lastName: nameParts.slice(1).join(' ') || name,
        phone,
        email: `trader_${trader.id}@sabiwork.ng`
      });
      virtualAccountNumber = va.accountNumber;

      await knex('traders')
        .where({ id: trader.id })
        .update({ virtual_account_number: virtualAccountNumber });
    } catch (vaError) {
      console.error('Trader VA creation failed:', vaError.message);
    }

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'trader_registered',
      trader_name: name,
      area,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      trader_id: trader.id,
      name,
      phone,
      business_type,
      virtual_account_number: virtualAccountNumber
    });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

/**
 * POST /api/traders/log-sale
 * Log a sale from WhatsApp message (parsed by NLP)
 */
router.post('/log-sale', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Missing phone or message' });
    }

    const trader = await knex('traders').where({ phone }).first();
    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    // Parse sale via NLP
    const sale = await classifySale(message);
    if (!sale) {
      return res.status(400).json({ error: 'Could not parse sale message' });
    }

    // Insert sale log
    await knex('sales_logs').insert({
      trader_id: trader.id,
      amount: sale.amount,
      item_name: sale.item_name,
      quantity: sale.quantity,
      category: sale.category,
      payment_method: 'cash',
      logged_at: new Date()
    });

    // Update trader totals
    await knex('traders')
      .where({ id: trader.id })
      .update({
        total_logged_sales: knex.raw('total_logged_sales + 1'),
        total_logged_revenue: knex.raw('total_logged_revenue + ?', [sale.amount])
      });

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const todayStats = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', today)
      .select(knex.raw('COALESCE(SUM(amount), 0) as total'), knex.raw('COUNT(*) as count'))
      .first();

    const weekTotal = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .sum('amount as total')
      .first();

    // Recalculate SabiScore
    const previousScore = trader.sabi_score;
    const sabiResult = await calculateTraderSabiScore(trader.id);
    const weeksToLoan = sabiResult.score >= 50 ? 0 : Math.ceil((50 - sabiResult.score) / 2);

    // Trigger investment auto-split if trader has active round
    try {
      await processSaleSplit(trader.id, null, sale.amount * 100);
    } catch (splitErr) {
      console.error('Investment split error:', splitErr.message);
    }

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'sale_logged',
      amount: sale.amount,
      trader_name: trader.name,
      area: trader.area,
      category: sale.category,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));

    return res.status(200).json({
      success: true,
      sale,
      trader_stats: {
        today_total: parseInt(todayStats.total) || 0,
        today_count: parseInt(todayStats.count) || 0,
        week_total: parseInt(weekTotal.total) || 0,
        sabi_score_before: previousScore,
        sabi_score_after: sabiResult.score,
        weeks_to_loan: weeksToLoan
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sale logging failed', details: error.message });
  }
});

/**
 * GET /api/traders/report
 * Get weekly report for a trader
 */
router.get('/report', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const trader = await knex('traders').where({ phone }).first();
    if (!trader) return res.status(404).json({ error: 'Trader not found' });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const prevWeekStart = new Date();
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);

    // This week
    const thisWeek = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .select(
        knex.raw('COALESCE(SUM(amount), 0) as revenue'),
        knex.raw('COUNT(*) as count')
      )
      .first();

    // Previous week (for trend)
    const prevWeek = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .whereBetween('logged_at', [prevWeekStart, weekStart])
      .sum('amount as revenue')
      .first();

    const thisRevenue = parseInt(thisWeek.revenue) || 0;
    const prevRevenue = parseInt(prevWeek.revenue) || 1;
    const trendPct = Math.round(((thisRevenue - prevRevenue) / prevRevenue) * 100);
    const trend = trendPct >= 0 ? `↑${trendPct}%` : `↓${Math.abs(trendPct)}%`;

    // Top item
    const topItem = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .select('item_name', 'category')
      .sum('amount as total')
      .groupBy('item_name', 'category')
      .orderByRaw('SUM(amount) DESC')
      .first();

    // Best day
    const bestDay = await knex('sales_logs')
      .where({ trader_id: trader.id })
      .where('logged_at', '>=', weekStart)
      .select(knex.raw("TO_CHAR(logged_at, 'Day') as day_name"))
      .sum('amount as total')
      .groupByRaw("TO_CHAR(logged_at, 'Day')")
      .orderByRaw('SUM(amount) DESC')
      .first();

    const topPct = thisRevenue > 0 && topItem
      ? Math.round((parseInt(topItem.total) / thisRevenue) * 100)
      : 0;

    return res.status(200).json({
      business_name: `${trader.name} ${trader.business_type || ''}`.trim(),
      week_revenue: thisRevenue,
      week_count: parseInt(thisWeek.count) || 0,
      trend,
      top_item: topItem?.item_name || 'N/A',
      top_amount: parseInt(topItem?.total) || 0,
      top_pct: topPct,
      best_day: bestDay?.day_name?.trim() || 'N/A',
      best_day_amount: parseInt(bestDay?.total) || 0,
      sabi_score: trader.sabi_score
    });
  } catch (error) {
    return res.status(500).json({ error: 'Report generation failed' });
  }
});

/**
 * GET /api/traders/:id/daily-stats
 * Get today's summary for a trader
 */
router.get('/:id/daily-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await knex('sales_logs')
      .where({ trader_id: req.params.id })
      .where('logged_at', '>=', today)
      .select(
        knex.raw('COALESCE(SUM(amount), 0) as total'),
        knex.raw('COUNT(*) as count')
      )
      .first();

    const trader = await knex('traders').where({ id: req.params.id }).first();

    return res.status(200).json({
      total: parseInt(stats.total) || 0,
      count: parseInt(stats.count) || 0,
      sabi_score: trader?.sabi_score || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get daily stats' });
  }
});

module.exports = router;
