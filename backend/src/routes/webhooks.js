// backend/src/routes/webhooks.js
const { Router } = require('express');
const redis = require('../utils/redis');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const webhookVerify = require('../middleware/webhookVerify');
const trustService = require('../services/trust');
const sabiScoreService = require('../services/sabiScore');

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
  const amount = (payload.data?.amount || payload.amount || 0) / 100;
  const channel = payload.data?.payment_channel || payload.payment_channel || 'unknown';
  const metadata = payload.data?.meta || payload.meta || {};

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

    if (job.worker_id) {
      const trustResult = await trustService.applyTrustEvent(job.worker_id, 'payment_received', {
        jobId: job.id,
        paymentTimestamp: new Date(),
        jobCreatedAt: job.created_at,
        paymentChannel: channel,
        buyerId: job.buyer_id
      });

      const sabiResult = await sabiScoreService.calculateWorkerSabiScore(job.worker_id);

      await redis.publish('dashboard_events', JSON.stringify({
        type: 'payment_received',
        amount,
        channel,
        area: job.area,
        trade: job.service_category,
        worker_id: job.worker_id,
        trust_update: {
          before: trustResult.previousScore,
          after: trustResult.newScore,
          tier: trustResult.tier.label
        },
        sabi_score: sabiResult.score,
        transaction_ref: transactionRef,
        timestamp: new Date().toISOString()
      }));

      return;
    }
  }

  await redis.publish('dashboard_events', JSON.stringify({
    type: 'payment_received',
    amount,
    channel,
    area: metadata.area,
    trade: metadata.service_category,
    transaction_ref: transactionRef,
    timestamp: new Date().toISOString()
  }));
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

  let worker = await knex('workers')
    .where({ virtual_account_number: virtualAccountNumber })
    .first();

  if (worker) {
    await knex('workers')
      .where({ id: worker.id })
      .update({
        total_income: knex.raw('total_income + ?', [amount]),
        last_active_at: new Date()
      });

    const trustResult = await trustService.applyTrustEvent(worker.id, 'payment_received', {
      paymentChannel: 'transfer'
    });

    const sabiResult = await sabiScoreService.calculateWorkerSabiScore(worker.id);

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'va_credit',
      amount,
      worker_name: worker.name,
      area: worker.service_areas?.[0],
      trust_score: trustResult.newScore,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  let trader = await knex('traders')
    .where({ virtual_account_number: virtualAccountNumber })
    .first();

  if (trader) {
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

    const sabiResult = await sabiScoreService.calculateTraderSabiScore(trader.id);

    await redis.publish('dashboard_events', JSON.stringify({
      type: 'sale_logged',
      amount,
      trader_name: trader.name,
      area: trader.area,
      category: trader.business_type,
      sabi_score: sabiResult.score,
      timestamp: new Date().toISOString()
    }));
  }
}

module.exports = router;
