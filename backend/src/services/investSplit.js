// backend/src/services/investSplit.js
const knex = require('../database/knex');
const squadService = require('./squad');
const redis = require('../utils/redis');

const MIN_SALE_FOR_SPLIT = 500000; // 5000 naira in kobo

/**
 * Process auto-split on a trader's sale
 * Called after a sale is logged (either via bot or webhook)
 */
async function processSaleSplit(traderId, saleId, saleAmount) {
  // Find active repaying round for this trader
  const round = await knex('investment_rounds')
    .where({ trader_id: traderId, status: 'repaying' })
    .first();

  if (!round) return null;

  // Check minimum threshold
  if (saleAmount < MIN_SALE_FOR_SPLIT) return null;

  // Calculate total repayment portion from this sale
  const repaymentPortion = Math.round(saleAmount * parseFloat(round.repayment_split));

  // Get active investments in this round
  const investments = await knex('investments')
    .where({ round_id: round.id, status: 'active' })
    .orderBy('created_at', 'asc');

  if (investments.length === 0) return null;

  // Calculate total outstanding across all investors
  const totalOutstanding = investments.reduce((sum, inv) => {
    return sum + (inv.expected_return - inv.repaid_amount);
  }, 0);

  if (totalOutstanding <= 0) return null;

  const results = [];

  for (const investment of investments) {
    const outstanding = investment.expected_return - investment.repaid_amount;
    if (outstanding <= 0) continue;

    // Proportional share of repayment
    const share = outstanding / totalOutstanding;
    let paymentAmount = Math.min(Math.round(repaymentPortion * share), outstanding);

    if (paymentAmount < 10000) continue; // Skip if less than 100 naira (fee protection)

    const transferRef = `REP_${round.id.substring(0, 8)}_${investment.id.substring(0, 8)}_${Date.now()}`;

    // Record in ledger
    const [ledgerEntry] = await knex('repayment_ledger').insert({
      round_id: round.id,
      investment_id: investment.id,
      sale_id: saleId,
      amount: paymentAmount,
      transfer_ref: transferRef,
      transfer_status: 'pending'
    }).returning('*');

    // Execute Squad transfer to investor
    try {
      await squadService.transferToBank({
        amount: paymentAmount / 100, // Squad expects naira
        bankCode: investment.investor_bank_code,
        accountNumber: investment.investor_account_number,
        accountName: investment.investor_name,
        transactionRef: transferRef,
        remark: 'SabiWork investment return'
      });

      await knex('repayment_ledger')
        .where({ id: ledgerEntry.id })
        .update({ transfer_status: 'success' });

      // Update repaid amount
      await knex('investments')
        .where({ id: investment.id })
        .update({ repaid_amount: knex.raw('repaid_amount + ?', [paymentAmount]) });

      // Check if fully repaid
      const updated = await knex('investments').where({ id: investment.id }).first();
      if (updated.repaid_amount >= updated.expected_return) {
        await knex('investments')
          .where({ id: investment.id })
          .update({ status: 'completed', completed_at: new Date() });
      }

      results.push({ investmentId: investment.id, amount: paymentAmount, status: 'success' });
    } catch (err) {
      console.error('Investment repayment transfer failed:', err.message);
      await knex('repayment_ledger')
        .where({ id: ledgerEntry.id })
        .update({ transfer_status: 'failed' });

      results.push({ investmentId: investment.id, amount: paymentAmount, status: 'failed' });
    }
  }

  // Check if all investments in round are completed
  const remaining = await knex('investments')
    .where({ round_id: round.id, status: 'active' })
    .count('id as count')
    .first();

  if (parseInt(remaining.count) === 0) {
    await knex('investment_rounds')
      .where({ id: round.id })
      .update({ status: 'completed', completed_at: new Date() });

    // Publish completion event
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'investment_round_completed',
      round_id: round.id,
      trader_id: traderId,
      timestamp: new Date().toISOString()
    }));
  }

  return results;
}

/**
 * Generate unique reference prefix for a round
 */
function generateReferencePrefix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = { processSaleSplit, generateReferencePrefix, MIN_SALE_FOR_SPLIT };
