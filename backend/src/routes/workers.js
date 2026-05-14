// backend/src/routes/workers.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const redis = require('../utils/redis');
const eventBus = require('../utils/eventBus');
const { applyTrustEvent } = require('../services/trust');
const { SUPPORTED_BANKS } = require('../../shared/constants');

const router = Router();

/**
 * POST /api/workers/lookup-account
 * Resolve account name from bank_name + account_number via Squad API
 * Used during onboarding so the user doesn't have to type their name
 */
router.post('/lookup-account', async (req, res) => {
  try {
    const { bank_name, bank_code, account_number } = req.body;

    if (!account_number || (!bank_name && !bank_code)) {
      return res.status(400).json({ error: 'Missing required fields: account_number and (bank_name or bank_code)' });
    }

    // Resolve bank code from name if needed
    let resolvedBankCode = bank_code;
    if (!resolvedBankCode && bank_name) {
      const bank = SUPPORTED_BANKS.find(b =>
        b.name.toLowerCase() === bank_name.toLowerCase()
      );
      if (!bank) {
        return res.status(400).json({ error: `Unsupported bank: ${bank_name}. Supported: ${SUPPORTED_BANKS.map(b => b.name).join(', ')}` });
      }
      resolvedBankCode = bank.code;
    }

    const lookup = await squadService.lookupAccount(resolvedBankCode, account_number);

    return res.status(200).json({
      success: true,
      account_name: lookup.accountName,
      account_number: lookup.accountNumber,
      bank_code: resolvedBankCode
    });
  } catch (error) {
    console.error('Account lookup error:', error);
    return res.status(400).json({ error: 'Account lookup failed. Please check your bank and account number.', details: error.message });
  }
});

/**
 * POST /api/workers/onboard
 * Register a new worker — two flows supported:
 * 1. Provide name + phone + trade (basic)
 * 2. Provide bank_name + account_number + phone + trade (name resolved from Squad)
 */
router.post('/onboard', async (req, res) => {
  try {
    const {
      name, phone, primary_trade, secondary_trades,
      service_areas, bank_name, bank_code, account_number,
      location_lat, location_lng,
      onboarding_channel, onboarded_by
    } = req.body;

    if (!primary_trade) {
      return res.status(400).json({ error: 'Missing required field: primary_trade' });
    }

    // Must have either phone or bank account as identity
    if (!phone && (!bank_code && !bank_name || !account_number)) {
      return res.status(400).json({ error: 'Must provide either phone or bank account (bank_code + account_number) as identity' });
    }

    // Check if already registered (by phone or account number)
    let existing = null;
    if (phone) {
      existing = await knex('workers').where({ phone }).first();
    }
    if (!existing && account_number) {
      existing = await knex('workers').where({ account_number }).first();
    }
    if (existing) {
      return res.status(409).json({ error: 'Worker already registered', worker_id: existing.id });
    }

    // Resolve bank code from name or code
    let bankCode = bank_code || null;
    if (!bankCode && bank_name && account_number) {
      const bank = SUPPORTED_BANKS.find(b =>
        b.name.toLowerCase() === bank_name.toLowerCase()
      );
      if (!bank) {
        return res.status(400).json({ error: `Unsupported bank: ${bank_name}. Supported: ${SUPPORTED_BANKS.map(b => b.name).join(', ')}` });
      }
      bankCode = bank.code;
    }

    // Resolve name from bank account if not provided
    let resolvedName = name;
    let accountName = name;
    if (bankCode && account_number) {
      try {
        const lookup = await squadService.lookupAccount(bankCode, account_number);
        accountName = lookup.accountName;
        // If no name was provided, use the bank account name
        if (!resolvedName) {
          resolvedName = lookup.accountName;
        }
      } catch (lookupError) {
        console.error('Bank lookup failed:', lookupError.message);
        // If no name provided and lookup failed, we can't proceed
        if (!resolvedName) {
          return res.status(400).json({ error: 'Could not verify account. Please provide your name or check your bank details.' });
        }
      }
    }

    // Final validation — must have a name from either source
    if (!resolvedName) {
      return res.status(400).json({ error: 'Name is required. Provide your name or bank details to auto-resolve.' });
    }

    // Check Redis for location captured from landing page if not provided
    let finalLat = location_lat || null;
    let finalLng = location_lng || null;
    if (!finalLat && phone) {
      try {
        const cached = await redis.get(`location_capture:${phone}`);
        if (cached) {
          const loc = JSON.parse(cached);
          finalLat = loc.lat;
          finalLng = loc.lng;
          await redis.del(`location_capture:${phone}`);
        }
      } catch (e) {
        // Non-blocking
      }
    }

    // Insert worker
    const [worker] = await knex('workers').insert({
      name: resolvedName,
      phone,
      primary_trade,
      secondary_trades: secondary_trades || [],
      service_areas: service_areas || [],
      location_lat: finalLat,
      location_lng: finalLng,
      bank_code: bankCode,
      account_number: account_number || null,
      account_name: accountName,
      trust_score: onboarding_channel === 'field_agent' ? 0.05 : 0.0,
      onboarding_channel: onboarding_channel || 'whatsapp',
      onboarded_by: onboarded_by || null,
      gps_verified: !!(finalLat && finalLng && onboarding_channel === 'field_agent')
    }).returning('*');

    // Create Squad virtual account
    let virtualAccountNumber = null;
    try {
      const nameParts = resolvedName.split(' ');
      const va = await squadService.createVirtualAccount({
        customerId: worker.id,
        firstName: nameParts[0] || resolvedName,
        lastName: nameParts.slice(1).join(' ') || resolvedName,
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
    eventBus.emit('worker_onboarded', {
      actor: resolvedName,
      description: `${resolvedName} onboarded as ${primary_trade} via ${onboarding_channel || 'whatsapp'}`,
      metadata: { worker_name: resolvedName, skill: primary_trade, area: service_areas?.[0] || 'Lagos', channel: onboarding_channel || 'whatsapp', phone }
    });

    return res.status(201).json({
      success: true,
      worker_id: worker.id,
      name: resolvedName,
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
 * POST /api/workers/location-capture
 * Store location captured from the landing page (linked via WhatsApp QR/URL)
 * Stored in Redis with 10-minute TTL — the onboard handler picks it up
 */
router.post('/location-capture', async (req, res) => {
  try {
    const { phone, lat, lng, accuracy } = req.body;

    if (!phone || !lat || !lng) {
      return res.status(400).json({ error: 'Missing required fields: phone, lat, lng' });
    }

    // Store in Redis with 10-minute expiry
    const key = `location_capture:${phone}`;
    await redis.set(key, JSON.stringify({ lat, lng, accuracy }), 'EX', 600);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Location capture error:', error);
    return res.status(500).json({ error: 'Failed to save location' });
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

    // Broadcast to dashboard
    const worker = await knex('workers').where({ id: req.params.id }).first();
    eventBus.emit('worker_availability_changed', {
      actor: worker?.name || 'Worker',
      description: `${worker?.name || 'Worker'} is now ${is_available ? 'AVAILABLE' : 'BUSY'}`,
      metadata: { worker_name: worker?.name, is_available, area: worker?.service_areas?.[0], channel: req.body.channel || 'whatsapp' }
    });

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
