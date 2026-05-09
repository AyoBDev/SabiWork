// backend/src/services/demand.js
const Groq = require('groq-sdk');
const knex = require('../database/knex');
const config = require('../config');
const { TRADES } = require('../../shared/constants');

const groq = new Groq({ apiKey: config.groqApiKey });

const GROQ_TIMEOUT = 3000;

async function getDemandByArea(area, days = 30) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  const demand = await knex('demand_signals')
    .where('area', area)
    .where('recorded_at', '>=', windowStart)
    .select('trade_category')
    .count('* as total_requests')
    .sum(knex.raw("CASE WHEN NOT matched THEN 1 ELSE 0 END as unmatched"))
    .avg('amount as avg_price')
    .groupBy('trade_category')
    .orderByRaw('SUM(CASE WHEN NOT matched THEN 1 ELSE 0 END) DESC');

  const supply = await knex('workers')
    .whereRaw('? = ANY(service_areas)', [area])
    .where('is_available', true)
    .select('primary_trade')
    .count('* as worker_count')
    .groupBy('primary_trade');

  const supplyMap = {};
  supply.forEach(s => { supplyMap[s.primary_trade] = parseInt(s.worker_count); });

  return demand.map(d => {
    const workers = supplyMap[d.trade_category] || 0;
    const unmatched = parseInt(d.unmatched) || 0;
    const totalRequests = parseInt(d.total_requests) || 0;
    const unmatchedRate = totalRequests > 0 ? unmatched / totalRequests : 0;

    let gapLevel = 'low';
    if (workers <= 2 && unmatched > 20) gapLevel = 'high';
    else if (workers <= 5 && unmatched > 10) gapLevel = 'medium';

    return {
      trade: d.trade_category,
      requests: totalRequests,
      unmatched,
      workers,
      gap_level: gapLevel,
      avg_price: Math.round(parseFloat(d.avg_price) || 0),
      unmatched_rate: Math.round(unmatchedRate * 100)
    };
  });
}

async function getDemandNearPoint(lat, lng, radiusKm = 3, days = 30) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  const demand = await knex('demand_signals')
    .where('recorded_at', '>=', windowStart)
    .whereNotNull('location_lat')
    .whereRaw(`
      (6371 * acos(
        LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
        cos(radians(location_lng) - radians(?)) +
        sin(radians(?)) * sin(radians(location_lat)))
      )) <= ?
    `, [lat, lng, lat, radiusKm])
    .select('trade_category')
    .count('* as total_requests')
    .sum(knex.raw("CASE WHEN NOT matched THEN 1 ELSE 0 END as unmatched"))
    .avg('amount as avg_price')
    .groupBy('trade_category')
    .orderByRaw('SUM(CASE WHEN NOT matched THEN 1 ELSE 0 END) DESC');

  const supply = await knex('workers')
    .where('is_available', true)
    .whereNotNull('location_lat')
    .whereRaw(`
      (6371 * acos(
        LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
        cos(radians(location_lng) - radians(?)) +
        sin(radians(?)) * sin(radians(location_lat)))
      )) <= ?
    `, [lat, lng, lat, radiusKm])
    .select('primary_trade')
    .count('* as worker_count')
    .groupBy('primary_trade');

  const supplyMap = {};
  supply.forEach(s => { supplyMap[s.primary_trade] = parseInt(s.worker_count); });

  return demand.map(d => {
    const workers = supplyMap[d.trade_category] || 0;
    const unmatched = parseInt(d.unmatched) || 0;
    const totalRequests = parseInt(d.total_requests) || 0;

    let gapLevel = 'low';
    if (workers <= 2 && unmatched > 20) gapLevel = 'high';
    else if (workers <= 5 && unmatched > 10) gapLevel = 'medium';

    return {
      trade: d.trade_category,
      requests: totalRequests,
      unmatched,
      workers,
      gap_level: gapLevel,
      avg_price: Math.round(parseFloat(d.avg_price) || 0)
    };
  });
}

async function generatePathwayRecommendation(lat, lng, area) {
  let demandData;
  if (lat && lng) {
    demandData = await getDemandNearPoint(lat, lng, 3);
  } else {
    demandData = await getDemandByArea(area);
  }

  const apprenticeships = await knex('apprenticeships')
    .join('workers', 'apprenticeships.master_worker_id', 'workers.id')
    .where('apprenticeships.status', 'active')
    .where('workers.apprentice_slots', '>', 0)
    .where('workers.trust_score', '>=', 0.6)
    .select(
      'apprenticeships.*',
      'workers.name as master_name',
      'workers.trust_score as master_trust',
      'workers.total_jobs as master_jobs',
      'workers.service_areas as master_areas',
      'workers.location_lat as master_lat',
      'workers.location_lng as master_lng'
    )
    .limit(5);

  const apprenticeshipsWithDistance = apprenticeships.map(a => {
    let distance = null;
    if (lat && lng && a.master_lat && a.master_lng) {
      distance = haversineDistance(lat, lng, parseFloat(a.master_lat), parseFloat(a.master_lng));
    }
    return { ...a, distance_km: distance ? Math.round(distance * 10) / 10 : null };
  });

  const emojis = {
    plumbing: '🔧', electrical: '⚡', tailoring: '🧵', tiling: '🧱',
    carpentry: '🪚', painting: '🎨', welding: '🔥', cleaning: '🧹',
    hairdressing: '💇', catering: '🍽️'
  };

  const topTrades = demandData.slice(0, 3).map(d => ({
    ...d,
    emoji: emojis[d.trade] || '💼',
    name: d.trade.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  return {
    trades: topTrades,
    apprenticeships: apprenticeshipsWithDistance,
    area: area || 'your area'
  };
}

async function getDemandHeatData(bounds, trade = null, days = 30) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  let query = knex('demand_signals')
    .where('recorded_at', '>=', windowStart)
    .whereNotNull('location_lat')
    .whereBetween('location_lat', [bounds.south, bounds.north])
    .whereBetween('location_lng', [bounds.west, bounds.east])
    .select(
      knex.raw('ROUND(location_lat::numeric, 3) as lat'),
      knex.raw('ROUND(location_lng::numeric, 3) as lng'),
      knex.raw('COUNT(*) as intensity'),
      knex.raw("COUNT(*) FILTER (WHERE NOT matched) as unmet")
    )
    .groupByRaw('ROUND(location_lat::numeric, 3), ROUND(location_lng::numeric, 3)');

  if (trade) {
    query = query.where('trade_category', trade);
  }

  const results = await query;

  return results.map(r => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lng),
    intensity: parseInt(r.intensity),
    unmet: parseInt(r.unmet)
  }));
}

async function getCoverageGaps(trade = null, radiusKm = 3) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 30);

  let query = knex('demand_signals')
    .where('matched', false)
    .where('recorded_at', '>=', windowStart)
    .whereNotNull('location_lat')
    .select(
      'area',
      knex.raw('AVG(location_lat) as center_lat'),
      knex.raw('AVG(location_lng) as center_lng'),
      knex.raw('COUNT(*) as unmet_requests'),
      knex.raw('AVG(amount) as avg_price')
    )
    .groupBy('area')
    .orderByRaw('COUNT(*) DESC')
    .limit(10);

  if (trade) {
    query = query.where('trade_category', trade);
  }

  const gaps = await query;

  const enrichedGaps = [];
  for (const gap of gaps) {
    const centerLat = parseFloat(gap.center_lat);
    const centerLng = parseFloat(gap.center_lng);

    let workerQuery = knex('workers')
      .where('is_available', true)
      .whereNotNull('location_lat');

    if (trade) {
      workerQuery = workerQuery.where('primary_trade', trade);
    }

    const nearbyWorkers = await workerQuery
      .whereRaw(`
        (6371 * acos(
          LEAST(1.0, cos(radians(?)) * cos(radians(location_lat)) *
          cos(radians(location_lng) - radians(?)) +
          sin(radians(?)) * sin(radians(location_lat)))
        )) <= ?
      `, [centerLat, centerLng, centerLat, radiusKm])
      .count('* as count')
      .first();

    const workerCount = parseInt(nearbyWorkers.count) || 0;

    let gapLevel = 'healthy';
    if (workerCount === 0) gapLevel = 'critical';
    else if (workerCount <= 2) gapLevel = 'moderate';

    enrichedGaps.push({
      area: gap.area,
      center_lat: centerLat,
      center_lng: centerLng,
      unmet_requests: parseInt(gap.unmet_requests),
      avg_price: Math.round(parseFloat(gap.avg_price) || 0),
      worker_count: workerCount,
      gap_level: gapLevel
    });
  }

  return enrichedGaps.filter(g => g.gap_level !== 'healthy');
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  getDemandByArea,
  getDemandNearPoint,
  generatePathwayRecommendation,
  getDemandHeatData,
  getCoverageGaps,
  haversineDistance
};
