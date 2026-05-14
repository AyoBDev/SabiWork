// backend/src/routes/payments.js
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const eventBus = require('../utils/eventBus');
const config = require('../config');
const { PLATFORM_FEE_PERCENT } = require('../../shared/constants');

const router = Router();

/**
 * POST /api/payments/initiate
 * Creates a job record and initiates Squad payment
 */
router.post('/initiate', async (req, res) => {
  try {
    const { job_id, worker_id, buyer_id, amount, buyer_email, buyer_phone } = req.body;

    if (!worker_id || !buyer_id || !amount || !buyer_email) {
      return res.status(400).json({ error: 'Missing required fields: worker_id, buyer_id, amount, buyer_email' });
    }

    // Get worker details for metadata
    const worker = await knex('workers').where({ id: worker_id }).first();
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Get or use existing job
    let job;
    if (job_id) {
      job = await knex('jobs').where({ id: job_id }).first();
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
    } else {
      // Create new job
      const [newJob] = await knex('jobs').insert({
        buyer_id,
        worker_id,
        service_category: worker.primary_trade,
        area: worker.service_areas?.[0] || 'Lagos',
        agreed_amount: amount,
        status: 'payment_pending'
      }).returning('*');
      job = newJob;
    }

    // Generate unique transaction reference
    const transactionRef = `SABI_${job.id}_${Date.now()}`;

    // Update job with transaction ref
    await knex('jobs')
      .where({ id: job.id })
      .update({
        transaction_ref: transactionRef,
        status: 'payment_pending'
      });

    // Initiate Squad payment
    const payment = await squadService.initiatePayment({
      amount,
      email: buyer_email,
      transactionRef,
      callbackUrl: `${config.webhookBaseUrl}/api/webhooks/squad`,
      metadata: {
        job_id: job.id,
        worker_id,
        service_category: worker.primary_trade,
        area: job.area
      },
      paymentChannels: ['card', 'bank', 'ussd', 'transfer']
    });

    // Broadcast to dashboard
    eventBus.emit('payment_initiated', {
      actor: 'Buyer',
      description: `Payment initiated: ₦${amount.toLocaleString()} for ${worker.primary_trade} job (${worker.name})`,
      metadata: { amount: amount * 100, worker_name: worker.name, service: worker.primary_trade, area: job.area, reference: transactionRef, channel: 'pwa' }
    });

    return res.status(200).json({
      success: true,
      job_id: job.id,
      transaction_ref: transactionRef,
      checkout_url: payment.checkout_url,
      amount
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ error: 'Payment initiation failed', details: error.message });
  }
});

/**
 * GET /api/payments/verify/:ref
 * Verify a transaction status via Squad
 */
router.get('/verify/:ref', async (req, res) => {
  try {
    const { ref } = req.params;

    const result = await squadService.verifyTransaction(ref);

    return res.status(200).json({
      success: true,
      transaction_ref: ref,
      ...result
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

/**
 * POST /api/payments/payout
 * Trigger payout to worker after job completion
 */
router.post('/payout', async (req, res) => {
  try {
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Missing job_id' });
    }

    const job = await knex('jobs').where({ id: job_id }).first();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job must be completed before payout' });
    }

    if (job.payout_status === 'success') {
      return res.status(400).json({ error: 'Payout already sent' });
    }

    // Get worker bank details
    const worker = await knex('workers').where({ id: job.worker_id }).first();
    if (!worker || !worker.bank_code || !worker.account_number) {
      return res.status(400).json({ error: 'Worker bank details not verified' });
    }

    // Verify original payment
    const verification = await squadService.verifyTransaction(job.transaction_ref);
    if (verification.status !== 'success') {
      return res.status(400).json({ error: 'Original payment not confirmed' });
    }

    // Calculate payout (minus platform fee)
    const platformFee = Math.round(job.agreed_amount * PLATFORM_FEE_PERCENT / 100);
    const payoutAmount = job.agreed_amount - platformFee;
    const payoutRef = `PAYOUT_${job.id}_${Date.now()}`;

    // Update job payout status
    await knex('jobs')
      .where({ id: job.id })
      .update({
        payout_ref: payoutRef,
        payout_amount: payoutAmount,
        payout_status: 'pending'
      });

    try {
      // Execute transfer
      const transfer = await squadService.transferToBank({
        amount: payoutAmount,
        bankCode: worker.bank_code,
        accountNumber: worker.account_number,
        accountName: worker.account_name,
        transactionRef: payoutRef,
        remark: `SabiWork payout: ${job.service_category} job`
      });

      // Success
      await knex('jobs')
        .where({ id: job.id })
        .update({
          payout_status: 'success',
          payout_nip_ref: transfer.nipRef,
          status: 'payout_sent'
        });

      // Update worker income
      await knex('workers')
        .where({ id: worker.id })
        .update({
          total_income: knex.raw('total_income + ?', [payoutAmount]),
          total_jobs: knex.raw('total_jobs + 1')
        });

      // Broadcast to dashboard
      eventBus.emit('payout_sent', {
        actor: 'Squad API',
        description: `Payout ₦${payoutAmount.toLocaleString()} sent to ${worker.name} (${worker.account_name})`,
        metadata: { amount: payoutAmount * 100, worker_name: worker.name, bank: worker.account_name, area: worker.service_areas?.[0], channel: 'system' }
      });

      return res.status(200).json({
        success: true,
        payout_amount: payoutAmount,
        payout_ref: payoutRef,
        nip_ref: transfer.nipRef,
        worker_name: worker.name
      });

    } catch (transferError) {
      // Handle 424 timeout — schedule requery
      if (transferError.status === 424) {
        await knex('jobs')
          .where({ id: job.id })
          .update({ payout_status: 'requeried' });

        // Schedule requery after 2 minutes
        setTimeout(async () => {
          try {
            const requery = await squadService.requeryPayout(payoutRef);
            if (requery.status === 'success') {
              await knex('jobs')
                .where({ id: job.id })
                .update({
                  payout_status: 'success',
                  payout_nip_ref: requery.nipRef,
                  status: 'payout_sent'
                });
            }
          } catch (reqErr) {
            console.error('Payout requery failed:', reqErr);
          }
        }, 2 * 60 * 1000); // 2 minutes

        return res.status(202).json({
          success: true,
          message: 'Payout pending — requery scheduled',
          payout_ref: payoutRef
        });
      }

      throw transferError;
    }
  } catch (error) {
    console.error('Payout error:', error);
    return res.status(500).json({ error: 'Payout failed', details: error.message });
  }
});

module.exports = router;
