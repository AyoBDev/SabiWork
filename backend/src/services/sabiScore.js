// backend/src/services/sabiScore.js
const knex = require('../database/knex');

const WEIGHTS = {
  TRANSACTION_CONSISTENCY: 25,
  INCOME_GROWTH: 15,
  TRUST_SCORE: 20,
  CUSTOMER_DIVERSITY: 15,
  DIGITAL_ENGAGEMENT: 10,
  LOCATION_CONSISTENCY: 10,
  REPAYMENT_HISTORY: 5
};

const WINDOW_DAYS = 90;

async function calculateWorkerSabiScore(workerId) {
  const worker = await knex('workers').where({ id: workerId }).first();
  if (!worker) return { score: 0, breakdown: {}, tier: getTier(0) };

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  const weeklyJobs = await knex('jobs')
    .where({ worker_id: workerId })
    .where('paid_at', '>=', windowStart)
    .whereIn('status', ['completed', 'payout_sent'])
    .select(knex.raw("DATE_TRUNC('week', paid_at) as week"))
    .count('id as count')
    .groupByRaw("DATE_TRUNC('week', paid_at)");

  const totalWeeks = Math.ceil(WINDOW_DAYS / 7);
  const activeWeeks = weeklyJobs.length;
  const transactionConsistency = Math.min(100, Math.round((activeWeeks / totalWeeks) * 100));

  const monthlyIncome = await knex('jobs')
    .where({ worker_id: workerId })
    .where('paid_at', '>=', windowStart)
    .whereIn('status', ['completed', 'payout_sent'])
    .select(knex.raw("DATE_TRUNC('month', paid_at) as month"))
    .sum('payout_amount as total')
    .groupByRaw("DATE_TRUNC('month', paid_at)")
    .orderBy('month', 'asc');

  let incomeGrowth = 50;
  if (monthlyIncome.length >= 2) {
    const last = parseInt(monthlyIncome[monthlyIncome.length - 1].total) || 0;
    const prev = parseInt(monthlyIncome[monthlyIncome.length - 2].total) || 1;
    const growthRate = (last - prev) / prev;
    incomeGrowth = Math.min(100, Math.max(0, Math.round(50 + growthRate * 50)));
  }

  const trustScore = Math.round(parseFloat(worker.trust_score) * 100);

  const uniqueBuyers = await knex('jobs')
    .where({ worker_id: workerId })
    .where('paid_at', '>=', windowStart)
    .whereIn('status', ['completed', 'payout_sent'])
    .countDistinct('buyer_id as count')
    .first();

  const buyerCount = parseInt(uniqueBuyers.count) || 0;
  const customerDiversity = Math.min(100, buyerCount * 10);

  const totalJobs = await knex('jobs')
    .where({ worker_id: workerId })
    .where('created_at', '>=', windowStart)
    .count('id as count')
    .first();

  const jobCount = parseInt(totalJobs.count) || 0;
  const engagement = Math.min(100, jobCount * 5);

  let locationScore = 50;
  if (worker.gps_verified) {
    const jobLocations = await knex('jobs')
      .where({ worker_id: workerId })
      .whereIn('status', ['completed', 'payout_sent'])
      .whereNotNull('location_lat')
      .where('completed_at', '>=', windowStart)
      .select('location_lat', 'location_lng');

    if (jobLocations.length >= 3) {
      const lats = jobLocations.map(j => parseFloat(j.location_lat));
      const lngs = jobLocations.map(j => parseFloat(j.location_lng));
      const latStd = standardDeviation(lats);
      const lngStd = standardDeviation(lngs);
      const avgSpread = (latStd + lngStd) / 2;

      if (avgSpread < 0.01) locationScore = 100;
      else if (avgSpread < 0.03) locationScore = 75;
      else if (avgSpread < 0.05) locationScore = 50;
      else locationScore = 25;
    }
  }

  const repaymentHistory = 50;

  const score = Math.round(
    (transactionConsistency * WEIGHTS.TRANSACTION_CONSISTENCY +
     incomeGrowth * WEIGHTS.INCOME_GROWTH +
     trustScore * WEIGHTS.TRUST_SCORE +
     customerDiversity * WEIGHTS.CUSTOMER_DIVERSITY +
     engagement * WEIGHTS.DIGITAL_ENGAGEMENT +
     locationScore * WEIGHTS.LOCATION_CONSISTENCY +
     repaymentHistory * WEIGHTS.REPAYMENT_HISTORY) / 100
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  await knex('workers')
    .where({ id: workerId })
    .update({ sabi_score: clampedScore });

  return {
    score: clampedScore,
    breakdown: {
      transaction_consistency: transactionConsistency,
      income_growth: incomeGrowth,
      trust_score: trustScore,
      customer_diversity: customerDiversity,
      digital_engagement: engagement,
      location_consistency: locationScore,
      repayment_history: repaymentHistory
    },
    tier: getTier(clampedScore)
  };
}

async function calculateTraderSabiScore(traderId) {
  const trader = await knex('traders').where({ id: traderId }).first();
  if (!trader) return { score: 0, breakdown: {}, tier: getTier(0) };

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  const weeklySales = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .select(knex.raw("DATE_TRUNC('week', logged_at) as week"))
    .count('id as count')
    .groupByRaw("DATE_TRUNC('week', logged_at)");

  const totalWeeks = Math.ceil(WINDOW_DAYS / 7);
  const activeWeeks = weeklySales.length;
  const transactionConsistency = Math.min(100, Math.round((activeWeeks / totalWeeks) * 100));

  const monthlyRevenue = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .select(knex.raw("DATE_TRUNC('month', logged_at) as month"))
    .sum('amount as total')
    .groupByRaw("DATE_TRUNC('month', logged_at)")
    .orderBy('month', 'asc');

  let incomeGrowth = 50;
  if (monthlyRevenue.length >= 2) {
    const last = parseInt(monthlyRevenue[monthlyRevenue.length - 1].total) || 0;
    const prev = parseInt(monthlyRevenue[monthlyRevenue.length - 2].total) || 1;
    const growthRate = (last - prev) / prev;
    incomeGrowth = Math.min(100, Math.max(0, Math.round(50 + growthRate * 50)));
  }

  const totalSales = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .count('id as count')
    .first();

  const salesCount = parseInt(totalSales.count) || 0;
  const trustEquivalent = Math.min(100, salesCount * 2);

  const categories = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .countDistinct('category as count')
    .first();

  const catCount = parseInt(categories.count) || 0;
  const revenueDiversity = Math.min(100, catCount * 20);

  const squadSales = await knex('sales_logs')
    .where({ trader_id: traderId })
    .where('logged_at', '>=', windowStart)
    .where('payment_method', 'squad')
    .count('id as count')
    .first();

  const squadCount = parseInt(squadSales.count) || 0;
  const digitalRatio = salesCount > 0 ? squadCount / salesCount : 0;
  const digitalEngagement = Math.min(100, Math.round(digitalRatio * 100 + 30));

  const locationScore = trader.location_lat ? 75 : 30;
  const repaymentHistory = 50;

  const score = Math.round(
    (transactionConsistency * WEIGHTS.TRANSACTION_CONSISTENCY +
     incomeGrowth * WEIGHTS.INCOME_GROWTH +
     trustEquivalent * WEIGHTS.TRUST_SCORE +
     revenueDiversity * WEIGHTS.CUSTOMER_DIVERSITY +
     digitalEngagement * WEIGHTS.DIGITAL_ENGAGEMENT +
     locationScore * WEIGHTS.LOCATION_CONSISTENCY +
     repaymentHistory * WEIGHTS.REPAYMENT_HISTORY) / 100
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  await knex('traders')
    .where({ id: traderId })
    .update({ sabi_score: clampedScore });

  return {
    score: clampedScore,
    breakdown: {
      transaction_consistency: transactionConsistency,
      income_growth: incomeGrowth,
      trust_equivalent: trustEquivalent,
      revenue_diversity: revenueDiversity,
      digital_engagement: digitalEngagement,
      location_consistency: locationScore,
      repayment_history: repaymentHistory
    },
    tier: getTier(clampedScore)
  };
}

function getTier(score) {
  if (score >= 70) return { label: 'Full Financial Suite', unlocks: 'full' };
  if (score >= 50) return { label: 'Microloan Eligible', unlocks: 'microloan' };
  if (score >= 30) return { label: 'Savings Unlocked', unlocks: 'savings' };
  return { label: 'Keep Logging', unlocks: 'none' };
}

function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

module.exports = {
  calculateWorkerSabiScore,
  calculateTraderSabiScore,
  getTier,
  WEIGHTS
};
