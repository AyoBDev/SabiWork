// backend/src/routes/webhooks.js
const { Router } = require('express');
const redis = require('../utils/redis');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const webhookVerify = require('../middleware/webhookVerify');

const router = Router();

// Squad webhook endpoint
router.post('/squad', webhookVerify, async (req, res) => {
  try {
    const payload = req.body;
    const transactionRef = payload.transaction_ref || payload.data?.transaction_ref;
    const eventType = payload.event || payload.Event;

    if (!transactionRef) {
      return res.status(400).json({ error: 'Missing transaction_ref' });
    }

    // Idempotency check — prevent double processing
    const idempotencyKey = `idempotent:${transactionRef}`;
    const alreadyProcessed = await redis.get(idempotencyKey);

    if (alreadyProcessed) {
      return res.status(200).json({ message: 'Already processed' });
    }

    // Mark as processing (7-day TTL)
    await redis.set(idempotencyKey, '1', 'EX', 7 * 24 * 60 * 60);

    // Log raw webhook event
    await knex('webhook_events').insert({
      transaction_ref: transactionRef,
      event_type: eventType,
      payload: JSON.stringify(payload),
      processed: false,
      received_at: new Date()
    }).onConflict('transaction_ref').ignore();

    // Route by event type
    if (eventType === 'charge_successful' || payload.status === 'success') {
      await handleChargeSuccessful(transactionRef, payload);
    } else if (eventType === 'charge_failed') {
      await handleChargeFailed(transactionRef, payload);
    } else if (eventType === 'virtual_account_credit') {
      await handleVirtualAccountCredit(transactionRef, payload);
    }

    // Mark as processed
    await knex('webhook_events')
      .where({ transaction_ref: transactionRef })
      .update({ processed: true });

    return res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Squad from retrying
    return res.status(200).json({ message: 'Acknowledged with error' });
  }
});

async function handleChargeSuccessful(transactionRef, payload) {
  const amount = (payload.data?.amount || payload.amount || 0) / 100; // kobo to Naira
  const channel = payload.data?.payment_channel || payload.payment_channel || 'unknown';
  const metadata = payload.data?.meta || payload.meta || {};

  // Find and update the job
  const job = await knex('jobs')
    .where({ transaction_ref: transactionRef })
    .first();

  if (job) {
    await knex('jobs')
      .where({ id: job.id })
      .update({
        status: 'paid',
        payment_channel: channel,
        paid_at: new Date()
      });

    // Log demand signal
    await knex('demand_signals').insert({
      trade_category: job.service_category,
      area: job.area,
      location_lat: job.location_lat,
      location_lng: job.location_lng,
      request_type: 'buyer_request',
      amount: job.agreed_amount,
      matched: true,
      payment_channel: channel,
      recorded_at: new Date()
    });
  }

  // Broadcast event (WebSocket — will be connected in Plan 5)
  const event = {
    type: 'payment_received',
    amount,
    channel,
    area: job?.area || metadata.area,
    trade: job?.service_category || metadata.service_category,
    transaction_ref: transactionRef,
    timestamp: new Date().toISOString()
  };

  // Store for WebSocket broadcast (picked up by websocket.js)
  await redis.publish('dashboard_events', JSON.stringify(event));
}

async function handleChargeFailed(transactionRef, payload) {
  const metadata = payload.data?.meta || payload.meta || {};

  // Update job status
  await knex('jobs')
    .where({ transaction_ref: transactionRef })
    .update({ status: 'created' });

  // Still log as demand signal (failed payment is still demand)
  if (metadata.service_category && metadata.area) {
    await knex('demand_signals').insert({
      trade_category: metadata.service_category,
      area: metadata.area,
      request_type: 'buyer_request',
      amount: metadata.amount || null,
      matched: false,
      recorded_at: new Date()
    });
  }
}

async function handleVirtualAccountCredit(transactionRef, payload) {
  const amount = (payload.data?.amount || payload.amount || 0) / 100;
  const virtualAccountNumber = payload.data?.virtual_account_number;

  if (!virtualAccountNumber) return;

  // Find worker or trader by virtual account
  let worker = await knex('workers')
    .where({ virtual_account_number: virtualAccountNumber })
    .first();

  if (worker) {
    // Log income for SabiScore
    await knex('workers')
      .where({ id: worker.id })
      .update({
        total_income: knex.raw('total_income + ?', [amount]),
        last_active_at: new Date()
      });

    // Broadcast event
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'va_credit',
      amount,
      worker_name: worker.name,
      area: worker.service_areas?.[0],
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Check traders
  let trader = await knex('traders')
    .where({ virtual_account_number: virtualAccountNumber })
    .first();

  if (trader) {
    // Auto-log as a sale
    await knex('sales_logs').insert({
      trader_id: trader.id,
      amount,
      item_name: 'Auto-logged (VA credit)',
      category: trader.business_type || 'other',
      payment_method: 'squad',
      squad_ref: transactionRef,
      logged_at: new Date()
    });

    await knex('traders')
      .where({ id: trader.id })
      .update({
        total_logged_sales: knex.raw('total_logged_sales + 1'),
        total_logged_revenue: knex.raw('total_logged_revenue + ?', [amount])
      });

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'sale_logged',
      amount,
      trader_name: trader.name,
      area: trader.area,
      category: trader.business_type,
      timestamp: new Date().toISOString()
    }));
  }
}

module.exports = router;
