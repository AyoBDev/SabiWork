// backend/src/routes/workers.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const redis = require('../utils/redis');
const { applyTrustEvent } = require('../services/trust');
const { SUPPORTED_BANKS } = require('../../shared/constants');

const router = Router();

/**
 * POST /api/workers/onboard
 * Register a new worker — verifies bank, creates virtual account
 */
router.post('/onboard', async (req, res) => {
  try {
    const {
      name, phone, primary_trade, secondary_trades,
      service_areas, bank_name, account_number,
      location_lat, location_lng,
      onboarding_channel, onboarded_by
    } = req.body;

    if (!name || !phone || !primary_trade) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, primary_trade' });
    }

    // Check if already registered
    const existing = await knex('workers').where({ phone }).first();
    if (existing) {
      return res.status(409).json({ error: 'Worker already registered', worker_id: existing.id });
    }

    // Resolve bank code
    let bankCode = null;
    if (bank_name && account_number) {
      const bank = SUPPORTED_BANKS.find(b =>
        b.name.toLowerCase() === bank_name.toLowerCase()
      );
      if (!bank) {
        return res.status(400).json({ error: `Unsupported bank: ${bank_name}. Supported: ${SUPPORTED_BANKS.map(b => b.name).join(', ')}` });
      }
      bankCode = bank.code;
    }

    // Verify bank account via Squad
    let accountName = name;
    if (bankCode && account_number) {
      try {
        const lookup = await squadService.lookupAccount(bankCode, account_number);
        accountName = lookup.accountName;
      } catch (lookupError) {
        console.error('Bank lookup failed:', lookupError.message);
        // Continue with provided name — don't block onboarding
      }
    }

    // Insert worker
    const [worker] = await knex('workers').insert({
      name,
      phone,
      primary_trade,
      secondary_trades: secondary_trades || [],
      service_areas: service_areas || [],
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      bank_code: bankCode,
      account_number: account_number || null,
      account_name: accountName,
      trust_score: onboarding_channel === 'field_agent' ? 0.05 : 0.0,
      onboarding_channel: onboarding_channel || 'whatsapp',
      onboarded_by: onboarded_by || null,
      gps_verified: !!(location_lat && location_lng && onboarding_channel === 'field_agent')
    }).returning('*');

    // Create Squad virtual account
    let virtualAccountNumber = null;
    try {
      const nameParts = name.split(' ');
      const va = await squadService.createVirtualAccount({
        customerId: worker.id,
        firstName: nameParts[0] || name,
        lastName: nameParts.slice(1).join(' ') || name,
        phone,
        email: `${worker.id}@sabiwork.ng`
      });
      virtualAccountNumber = va.accountNumber;

      await knex('workers')
        .where({ id: worker.id })
        .update({ virtual_account_number: virtualAccountNumber });
    } catch (vaError) {
      console.error('Virtual account creation failed:', vaError.message);
      // Non-blocking — worker still registered
    }

    // Apply agent-verified trust bonus
    if (onboarding_channel === 'field_agent') {
      await applyTrustEvent(worker.id, 'agent_verified', {});
    }

    // Broadcast to dashboard
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'worker_onboarded',
      worker_name: name,
      trade: primary_trade,
      area: service_areas?.[0] || 'Lagos',
      channel: onboarding_channel || 'whatsapp',
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      worker_id: worker.id,
      name,
      phone,
      primary_trade,
      service_areas,
      bank_verified: !!bankCode,
      account_name: accountName,
      virtual_account_number: virtualAccountNumber,
      trust_score: onboarding_channel === 'field_agent' ? 0.05 : 0.0
    });
  } catch (error) {
    console.error('Worker onboarding error:', error);
    return res.status(500).json({ error: 'Onboarding failed', details: error.message });
  }
});

/**
 * GET /api/workers
 * List workers with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { trade, area, available, limit = 50 } = req.query;

    let query = knex('workers').orderBy('trust_score', 'desc').limit(parseInt(limit));

    if (trade) query = query.where('primary_trade', trade);
    if (area) query = query.whereRaw('? = ANY(service_areas)', [area]);
    if (available === 'true') query = query.where('is_available', true);

    const workers = await query;
    return res.status(200).json(workers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

/**
 * GET /api/workers/:id
 * Get single worker profile
 */
router.get('/:id', async (req, res) => {
  try {
    const worker = await knex('workers').where({ id: req.params.id }).first();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Get recent jobs
    const recentJobs = await knex('jobs')
      .where({ worker_id: worker.id })
      .whereIn('status', ['completed', 'payout_sent'])
      .orderBy('completed_at', 'desc')
      .limit(5);

    return res.status(200).json({ ...worker, recent_jobs: recentJobs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch worker' });
  }
});

/**
 * PATCH /api/workers/:id/availability
 * Toggle worker availability
 */
router.patch('/:id/availability', async (req, res) => {
  try {
    const { is_available } = req.body;
    await knex('workers')
      .where({ id: req.params.id })
      .update({ is_available, last_active_at: new Date() });

    return res.status(200).json({ success: true, is_available });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update availability' });
  }
});

/**
 * PATCH /api/workers/:id/location
 * Update worker's GPS location
 */
router.patch('/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await knex('workers')
      .where({ id: req.params.id })
      .update({ location_lat: lat, location_lng: lng, last_active_at: new Date() });

    await redis.del(`worker_location:${req.params.id}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
