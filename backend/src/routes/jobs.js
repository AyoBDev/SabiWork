// backend/src/routes/jobs.js
const { Router } = require('express');
const knex = require('../database/knex');
const eventBus = require('../utils/eventBus');
const trustService = require('../services/trust');
const sabiScoreService = require('../services/sabiScore');

const router = Router();

/**
 * POST /api/jobs
 * Create a new job (buyer books a worker)
 */
router.post('/', async (req, res) => {
  try {
    const { buyer_id, worker_id, service_category, description, area, location_lat, location_lng, agreed_amount } = req.body;

    const [job] = await knex('jobs').insert({
      buyer_id,
      worker_id,
      service_category,
      description,
      area,
      location_lat,
      location_lng,
      agreed_amount,
      status: 'created',
      created_at: new Date()
    }).returning('*');

    // Get worker name for dashboard
    const worker = await knex('workers').where({ id: worker_id }).first();
    eventBus.emit('job_created', {
      actor: 'Buyer',
      description: `New job created: ${service_category} in ${area || 'Lagos'} — ₦${(agreed_amount || 0).toLocaleString()}`,
      metadata: { worker_name: worker?.name, service: service_category, area, amount: agreed_amount, channel: 'pwa' }
    });

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/jobs/:id/status
 * Update job status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const [updated] = await knex('jobs')
      .where({ id: req.params.id })
      .update({ status, ...(status === 'completed' ? { completed_at: new Date() } : {}) })
      .returning('*');

    if (!updated) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Broadcast status change to dashboard
    const jobWorker = await knex('workers').where({ id: updated.worker_id }).first();
    eventBus.emit('job_status_changed', {
      actor: jobWorker?.name || 'System',
      description: `Job status → ${status}: ${updated.service_category} in ${updated.area || 'Lagos'}`,
      metadata: { worker_name: jobWorker?.name, service: updated.service_category, area: updated.area, status }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/rate
 * Rate a completed job (buyer rates worker)
 */
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    const job = await knex('jobs').where({ id: req.params.id }).first();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update job with rating
    await knex('jobs').where({ id: job.id }).update({ buyer_rating: rating });

    // Apply trust event for rating
    const delta = rating > 3 ? (rating - 3) * 0.01 : (rating - 3) * 0.02;
    const trustResult = await trustService.applyTrustEvent(job.worker_id, 'rating_received', delta, job.id);

    // Broadcast to dashboard
    eventBus.emit('rating_received', {
      actor: 'Buyer',
      description: `Job rated ${rating}/5 — trust score updated`,
      metadata: { worker_id: job.worker_id, rating, trust_score: trustResult.newScore }
    });

    res.json({
      message: 'Rating submitted',
      trust_update: {
        new_score: trustResult.newScore,
        delta,
        sabi_score: trustResult.sabiScore
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/complete
 * Complete a job with rating (original endpoint)
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const job = await knex('jobs').where({ id }).first();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'paid' && job.status !== 'in_progress') {
      return res.status(400).json({ error: 'Job must be paid or in_progress to complete' });
    }

    await knex('jobs')
      .where({ id })
      .update({
        status: 'completed',
        buyer_rating: rating,
        completed_at: new Date()
      });

    const trustResult = await trustService.applyTrustEvent(job.worker_id, 'rating', {
      jobId: id,
      rating
    });

    const sabiResult = await sabiScoreService.calculateWorkerSabiScore(job.worker_id);

    const worker = await knex('workers').where({ id: job.worker_id }).first();

    eventBus.emit('job_completed', {
      actor: worker.name,
      description: `Job completed: ${job.service_category}. Rated ${rating}/5. SabiScore: ${sabiResult.score}`,
      metadata: { worker_name: worker.name, service: job.service_category, area: job.area, rating, trust_score: trustResult.newScore, sabi_score: sabiResult.score }
    });

    return res.status(200).json({
      success: true,
      job_id: id,
      rating,
      trust: {
        previous: trustResult.previousScore,
        current: trustResult.newScore,
        delta: trustResult.delta,
        tier: trustResult.tier
      },
      sabi_score: sabiResult.score,
      sabi_tier: sabiResult.tier
    });
  } catch (error) {
    console.error('Job completion error:', error);
    return res.status(500).json({ error: 'Failed to complete job', details: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await knex('jobs').where({ id }).first();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(job);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
});

module.exports = router;
