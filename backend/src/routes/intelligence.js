// backend/src/routes/intelligence.js
const { Router } = require('express');
const knex = require('../database/knex');
const { getDemandByArea, getDemandNearPoint, getDemandHeatData, getCoverageGaps } = require('../services/demand');

const router = Router();

/**
 * GET /api/intelligence/stats
 * Dashboard top-level stats
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [volumeToday, jobsToday, workersPaid, tradersActive, sabiDistribution] = await Promise.all([
      // Total payment volume today
      knex('jobs')
        .where('paid_at', '>=', today)
        .sum('agreed_amount as total')
        .first(),

      // Jobs completed or paid today
      knex('jobs')
        .where('paid_at', '>=', today)
        .count('id as count')
        .first(),

      // Distinct workers who received payouts today
      knex('jobs')
        .where('completed_at', '>=', today)
        .where('payout_status', 'success')
        .countDistinct('worker_id as count')
        .first(),

      // Traders who logged sales today
      knex('sales_logs')
        .where('logged_at', '>=', today)
        .countDistinct('trader_id as count')
        .first(),

      // SabiScore distribution (workers + traders)
      knex.raw(`
        SELECT
          CASE
            WHEN score < 30 THEN '0-29'
            WHEN score < 50 THEN '30-49'
            WHEN score < 70 THEN '50-69'
            ELSE '70+'
          END as bucket,
          COUNT(*) as count
        FROM (
          SELECT sabi_score as score FROM workers WHERE sabi_score > 0
          UNION ALL
          SELECT sabi_score as score FROM traders WHERE sabi_score > 0
        ) scores
        GROUP BY bucket
        ORDER BY bucket
      `)
    ]);

    return res.status(200).json({
      volume_today: parseInt(volumeToday.total) || 0,
      jobs_today: parseInt(jobsToday.count) || 0,
      workers_paid: parseInt(workersPaid.count) || 0,
      traders_active: parseInt(tradersActive.count) || 0,
      sabi_score_distribution: sabiDistribution.rows || []
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/intelligence/gaps
 * Skills gap analysis for dashboard
 */
router.get('/gaps', async (req, res) => {
  try {
    const { trade } = req.query;
    const gaps = await getCoverageGaps(trade || null);
    return res.status(200).json(gaps);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch gaps' });
  }
});

/**
 * GET /api/intelligence/demand-heat
 * Heat map data for map overlay
 */
router.get('/demand-heat', async (req, res) => {
  try {
    const { north, south, east, west, trade, days } = req.query;

    if (!north || !south || !east || !west) {
      return res.status(400).json({ error: 'Bounds required: north, south, east, west' });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    const data = await getDemandHeatData(bounds, trade || null, parseInt(days) || 30);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch heat map data' });
  }
});

/**
 * GET /api/intelligence/channels
 * Payment channel breakdown
 */
router.get('/channels', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const channels = await knex('jobs')
      .where('paid_at', '>=', thirtyDaysAgo)
      .whereNotNull('payment_channel')
      .select('payment_channel')
      .count('* as count')
      .groupBy('payment_channel')
      .orderByRaw('COUNT(*) DESC');

    const total = channels.reduce((sum, c) => sum + parseInt(c.count), 0);

    const result = channels.map(c => ({
      channel: c.payment_channel,
      count: parseInt(c.count),
      percentage: total > 0 ? Math.round((parseInt(c.count) / total) * 100) : 0
    }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

/**
 * GET /api/intelligence/forecast
 * Simple demand forecast for a trade/area
 */
router.get('/forecast', async (req, res) => {
  try {
    const { trade, area, weeks = 4 } = req.query;

    if (!trade || !area) {
      return res.status(400).json({ error: 'trade and area required' });
    }

    // Get weekly demand for past 12 weeks
    const weeklyDemand = await knex('demand_signals')
      .where({ trade_category: trade, area })
      .where('recorded_at', '>=', knex.raw("NOW() - INTERVAL '12 weeks'"))
      .select(knex.raw("DATE_TRUNC('week', recorded_at) as week"))
      .count('* as requests')
      .groupByRaw("DATE_TRUNC('week', recorded_at)")
      .orderBy('week', 'asc');

    if (weeklyDemand.length < 2) {
      return res.status(200).json({ message: 'Not enough data for forecast', data: [] });
    }

    const values = weeklyDemand.map(w => parseInt(w.requests));
    const avgWeekly = values.reduce((a, b) => a + b, 0) / values.length;

    // Simple linear trend
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = avgWeekly;
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const trendPct = avgWeekly > 0 ? Math.round((slope / avgWeekly) * 100) : 0;

    const trendDirection = trendPct > 5 ? 'growing' : trendPct < -5 ? 'declining' : 'stable';

    // Forecast next N weeks
    const forecast = [];
    for (let i = 1; i <= parseInt(weeks); i++) {
      forecast.push(Math.round(avgWeekly + slope * (n + i - 1 - xMean)));
    }

    return res.status(200).json({
      trade,
      area,
      current_weekly_avg: Math.round(avgWeekly),
      trend_direction: trendDirection,
      trend_pct: trendPct,
      forecast_weekly: forecast,
      historical: weeklyDemand
    });
  } catch (error) {
    return res.status(500).json({ error: 'Forecast failed' });
  }
});

/**
 * GET /api/intelligence/financial-inclusion
 * Financial inclusion metrics
 */
router.get('/financial-inclusion', async (req, res) => {
  try {
    const [score30Plus, loanEligible, withVA] = await Promise.all([
      knex.raw(`
        SELECT COUNT(*) as count FROM (
          SELECT sabi_score FROM workers WHERE sabi_score >= 30
          UNION ALL
          SELECT sabi_score FROM traders WHERE sabi_score >= 30
        ) t
      `),
      knex.raw(`
        SELECT COUNT(*) as count FROM (
          SELECT sabi_score FROM workers WHERE sabi_score >= 50
          UNION ALL
          SELECT sabi_score FROM traders WHERE sabi_score >= 50
        ) t
      `),
      knex.raw(`
        SELECT COUNT(*) as count FROM (
          SELECT virtual_account_number FROM workers WHERE virtual_account_number IS NOT NULL
          UNION ALL
          SELECT virtual_account_number FROM traders WHERE virtual_account_number IS NOT NULL
        ) t
      `)
    ]);

    return res.status(200).json({
      score_30_plus: parseInt(score30Plus.rows[0].count) || 0,
      loan_eligible: parseInt(loanEligible.rows[0].count) || 0,
      with_virtual_account: parseInt(withVA.rows[0].count) || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch inclusion metrics' });
  }
});

/**
 * GET /api/intelligence/pathway
 * Pathway data for job seekers (called by chat + PWA)
 */
router.get('/pathway', async (req, res) => {
  try {
    const { lat, lng, area } = req.query;
    const { generatePathwayRecommendation } = require('../services/demand');

    const pathway = await generatePathwayRecommendation(
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
      area
    );

    return res.status(200).json(pathway);
  } catch (error) {
    return res.status(500).json({ error: 'Pathway generation failed' });
  }
});

module.exports = router;
