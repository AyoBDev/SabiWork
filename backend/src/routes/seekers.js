// backend/src/routes/seekers.js
const { Router } = require('express');
const knex = require('../database/knex');
const redis = require('../utils/redis');
const { generatePathwayRecommendation } = require('../services/demand');

const router = Router();

/**
 * POST /api/seekers/register
 * Register a job seeker
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, area, location_lat, location_lng, interests } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }

    const existing = await knex('seekers').where({ phone }).first();
    if (existing) {
      return res.status(409).json({ error: 'Already registered', seeker_id: existing.id });
    }

    const [seeker] = await knex('seekers').insert({
      name,
      phone,
      area,
      location_lat,
      location_lng,
      interests: interests || []
    }).returning('*');

    return res.status(201).json({ success: true, seeker_id: seeker.id, name, area });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/seekers
 * Get seeker by phone
 */
router.get('/', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const seeker = await knex('seekers').where({ phone }).first();
    if (!seeker) return res.status(404).json(null);

    return res.status(200).json(seeker);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch seeker' });
  }
});

/**
 * GET /api/seekers/:id/pathway
 * Get pathway recommendation for a seeker
 */
router.get('/:id/pathway', async (req, res) => {
  try {
    const seeker = await knex('seekers').where({ id: req.params.id }).first();
    if (!seeker) return res.status(404).json({ error: 'Seeker not found' });

    const pathway = await generatePathwayRecommendation(
      seeker.location_lat ? parseFloat(seeker.location_lat) : null,
      seeker.location_lng ? parseFloat(seeker.location_lng) : null,
      seeker.area
    );

    return res.status(200).json(pathway);
  } catch (error) {
    return res.status(500).json({ error: 'Pathway generation failed' });
  }
});

/**
 * POST /api/seekers/:id/apply
 * Apply for an apprenticeship
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const { master_worker_id, trade } = req.body;
    const seekerId = req.params.id;

    if (!master_worker_id || !trade) {
      return res.status(400).json({ error: 'Missing master_worker_id or trade' });
    }

    // Verify master worker accepts apprentices
    const master = await knex('workers').where({ id: master_worker_id }).first();
    if (!master || !master.accepts_apprentices || master.apprentice_slots <= 0) {
      return res.status(400).json({ error: 'Worker not accepting apprentices' });
    }

    // Check for existing active apprenticeship
    const existing = await knex('apprenticeships')
      .where({ apprentice_id: seekerId, status: 'active' })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'Already in an active apprenticeship' });
    }

    // Create apprenticeship
    const [apprenticeship] = await knex('apprenticeships').insert({
      master_worker_id,
      apprentice_id: seekerId,
      trade,
      duration_weeks: 12,
      weekly_stipend: 3000,
      status: 'active',
      milestones_completed: 0,
      total_milestones: 8
    }).returning('*');

    // Decrement master's open slots
    await knex('workers')
      .where({ id: master_worker_id })
      .update({ apprentice_slots: knex.raw('apprentice_slots - 1') });

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'apprenticeship_started',
      trade,
      area: master.service_areas?.[0],
      master_name: master.name,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      apprenticeship_id: apprenticeship.id,
      master_name: master.name,
      trade,
      duration_weeks: 12
    });
  } catch (error) {
    return res.status(500).json({ error: 'Application failed' });
  }
});

/**
 * GET /api/seekers/:id/apprenticeship
 * Get active apprenticeship status
 */
router.get('/:id/apprenticeship', async (req, res) => {
  try {
    const apprenticeship = await knex('apprenticeships')
      .where({ apprentice_id: req.params.id, status: 'active' })
      .join('workers', 'apprenticeships.master_worker_id', 'workers.id')
      .select(
        'apprenticeships.*',
        'workers.name as master_name',
        'workers.trust_score as master_trust'
      )
      .first();

    if (!apprenticeship) {
      return res.status(200).json(null);
    }

    return res.status(200).json(apprenticeship);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch apprenticeship' });
  }
});

module.exports = router;
