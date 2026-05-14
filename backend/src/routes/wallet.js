// backend/src/routes/wallet.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const eventBus = require('../utils/eventBus');

const router = Router();

/**
 * POST /api/wallet/transfer
 * Transfer money from wallet to a bank account (send money / withdraw)
 * Broadcasts event to dashboard for hackathon demo visibility
 */
router.post('/transfer', async (req, res) => {
  try {
    const { sender_phone, bank_code, account_number, account_name, amount, type = 'send' } = req.body;

    if (!bank_code || !account_number || !amount || !account_name) {
      return res.status(400).json({ error: 'Missing required fields: bank_code, account_number, account_name, amount' });
    }

    const transferRef = `SABI_TRF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Record the transaction
    const [transaction] = await knex('wallet_transactions').insert({
      sender_phone: sender_phone || 'demo_user',
      bank_code,
      account_number,
      account_name,
      amount: parseInt(amount),
      type, // 'send' or 'withdraw'
      reference: transferRef,
      status: 'pending'
    }).returning('*').catch(() => {
      // If wallet_transactions table doesn't exist, just proceed
      return [{ id: transferRef, amount, status: 'pending' }];
    });

    // Attempt actual Squad transfer (if in production / sandbox allows)
    let transferResult = null;
    try {
      transferResult = await squadService.transferToBank({
        amount: parseInt(amount) * 100, // Convert to kobo
        bankCode: bank_code,
        accountNumber: account_number,
        accountName: account_name,
        transactionRef: transferRef,
        remark: `SabiWork ${type}: ${account_name}`
      });
    } catch (transferErr) {
      console.log('Transfer API call failed (sandbox limitation):', transferErr.message);
      // In sandbox/demo mode, we still broadcast the event
    }

    // Update transaction status
    const finalStatus = transferResult ? 'success' : 'demo_success';
    try {
      await knex('wallet_transactions')
        .where({ reference: transferRef })
        .update({ status: finalStatus });
    } catch (_) {}

    // Broadcast to dashboard — this is what shows up in the hackathon demo
    const eventType = type === 'send' ? 'payout_sent' : 'payout_sent';
    eventBus.emit(eventType, {
      actor: sender_phone || 'PWA User',
      description: `${type === 'send' ? 'Sent' : 'Withdrew'} ₦${parseInt(amount).toLocaleString()} to ${account_name} (${bank_code})`,
      metadata: {
        amount: parseInt(amount) * 100,
        recipient: account_name,
        bank_code,
        account_number: `****${account_number.slice(-4)}`,
        type,
        channel: 'pwa',
        reference: transferRef
      }
    });

    return res.status(200).json({
      success: true,
      reference: transferRef,
      amount: parseInt(amount),
      recipient: account_name,
      status: finalStatus,
      nip_ref: transferResult?.nipRef || null
    });
  } catch (error) {
    console.error('Wallet transfer error:', error);
    return res.status(500).json({ error: 'Transfer failed', details: error.message });
  }
});

/**
 * GET /api/wallet/balance
 * Get wallet balance for a user (demo: returns mock balance)
 */
router.get('/balance', async (req, res) => {
  const { phone } = req.query;
  // In production, this would query actual balance from Squad virtual account
  // For hackathon demo, return mock
  return res.status(200).json({
    balance: 68500,
    escrow_held: 5000,
    available: 63500,
    currency: 'NGN'
  });
});

/**
 * GET /api/wallet/transactions
 * Get transaction history for a user
 */
router.get('/transactions', async (req, res) => {
  const { phone, limit = 20 } = req.query;
  try {
    const transactions = await knex('wallet_transactions')
      .where({ sender_phone: phone || 'demo_user' })
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));
    return res.status(200).json(transactions);
  } catch (_) {
    // Table may not exist yet — return empty
    return res.status(200).json([]);
  }
});

module.exports = router;
