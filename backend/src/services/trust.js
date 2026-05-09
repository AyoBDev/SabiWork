// backend/src/services/trust.js
const knex = require('../database/knex');
const redis = require('../utils/redis');

// Trust score signal deltas
const SIGNALS = {
  PAYMENT_FAST: 0.02,
  PAYMENT_ANY: 0.005,
  REPEAT_BUYER: 0.03,
  DISPUTE: -0.08,
  DIGITAL_CHANNEL: 0.01,
  STREAK_BONUS: 0.015,
  RATING_ABOVE_3: 0.01,
  RATING_BELOW_3: -0.02,
  APPRENTICE_TRAINED: 0.05,
  AGENT_VERIFIED: 0.05
};

const DAMPENING_FACTOR = 0.7;
const SCORE_MIN = 0.0;
const SCORE_MAX = 1.0;
const CACHE_TTL = 300;

async function getTrustScore(workerId) {
  const cached = await redis.get(`trust:${workerId}`);
  if (cached !== null) {
    return parseFloat(cached);
  }

  const worker = await knex('workers').where({ id: workerId }).select('trust_score').first();
  const score = worker ? parseFloat(worker.trust_score) : 0.0;

  await redis.set(`trust:${workerId}`, score.toString(), 'EX', CACHE_TTL);
  return score;
}

async function applyTrustEvent(workerId, eventType, options = {}) {
  const currentScore = await getTrustScore(workerId);
  let delta = 0;

  switch (eventType) {
    case 'payment_received': {
      delta += SIGNALS.PAYMENT_ANY;

      if (options.paymentTimestamp && options.jobCreatedAt) {
        const diffMs = new Date(options.paymentTimestamp) - new Date(options.jobCreatedAt);
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours <= 2) {
          delta += SIGNALS.PAYMENT_FAST;
        }
      }

      if (options.paymentChannel && ['card', 'transfer', 'bank'].includes(options.paymentChannel)) {
        delta += SIGNALS.DIGITAL_CHANNEL;
      }

      if (options.buyerId) {
        const repeatCount = await knex('jobs')
          .where({ worker_id: workerId, buyer_id: options.buyerId, status: 'payout_sent' })
          .count('id as count')
          .first();
        if (parseInt(repeatCount.count) > 0) {
          delta += SIGNALS.REPEAT_BUYER;
        }
      }

      const recentJobs = await knex('jobs')
        .where({ worker_id: workerId })
        .whereIn('status', ['completed', 'payout_sent'])
        .orderBy('completed_at', 'desc')
        .limit(3)
        .select('buyer_rating');

      if (recentJobs.length >= 3 && recentJobs.every(j => j.buyer_rating >= 3)) {
        delta += SIGNALS.STREAK_BONUS;
      }
      break;
    }

    case 'rating': {
      const rating = options.rating || 3;
      if (rating > 3) {
        delta += SIGNALS.RATING_ABOVE_3 * (rating - 3);
      } else if (rating < 3) {
        delta += SIGNALS.RATING_BELOW_3 * (3 - rating);
      }
      break;
    }

    case 'dispute': {
      delta += SIGNALS.DISPUTE;
      break;
    }

    case 'apprentice_trained': {
      delta += SIGNALS.APPRENTICE_TRAINED;
      break;
    }

    case 'agent_verified': {
      delta += SIGNALS.AGENT_VERIFIED;
      break;
    }

    default:
      return { previousScore: currentScore, newScore: currentScore, delta: 0, tier: getTier(currentScore) };
  }

  delta = delta * DAMPENING_FACTOR;

  const newScore = Math.min(SCORE_MAX, Math.max(SCORE_MIN, currentScore + delta));
  const roundedScore = Math.round(newScore * 1000) / 1000;

  await knex('workers')
    .where({ id: workerId })
    .update({ trust_score: roundedScore });

  await knex('trust_events').insert({
    worker_id: workerId,
    event_type: eventType,
    score_delta: Math.round(delta * 10000) / 10000,
    score_after: roundedScore,
    job_id: options.jobId || null
  });

  await redis.set(`trust:${workerId}`, roundedScore.toString(), 'EX', CACHE_TTL);

  if (currentScore < 0.6 && roundedScore >= 0.6) {
    await knex('workers')
      .where({ id: workerId })
      .update({ accepts_apprentices: true });
  }

  return {
    previousScore: currentScore,
    newScore: roundedScore,
    delta: Math.round(delta * 10000) / 10000,
    tier: getTier(roundedScore)
  };
}

function getTier(score) {
  if (score >= 0.80) return { label: 'Elite', emoji: '⭐' };
  if (score >= 0.60) return { label: 'Verified', emoji: '🔵' };
  if (score >= 0.30) return { label: 'Trusted', emoji: '✅' };
  return { label: 'Emerging', emoji: '🌱' };
}

module.exports = {
  getTrustScore,
  applyTrustEvent,
  getTier,
  SIGNALS
};
