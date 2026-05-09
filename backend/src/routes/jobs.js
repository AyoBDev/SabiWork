// backend/src/routes/jobs.js
const { Router } = require('express');
const knex = require('../database/knex');
const redis = require('../utils/redis');
const trustService = require('../services/trust');
const sabiScoreService = require('../services/sabiScore');

const router = Router();

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

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'job_completed',
      worker_name: worker.name,
      area: job.area,
      trade: job.service_category,
      rating,
      trust_score: trustResult.newScore,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));

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
