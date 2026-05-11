// backend/src/routes/invest.js
const { Router } = require('express');
const knex = require('../database/knex');
const squadService = require('../services/squad');
const redis = require('../utils/redis');
const { generateReferencePrefix } = require('../services/investSplit');

const router = Router();

/**
 * POST /api/invest/rounds
 * Create investment round for a trader
 * Accepts phone OR trader_id, target_amount (kobo), interest_rate, repayment_split
 */
router.post('/rounds', async (req, res) => {
  try {
    const { phone, trader_id, target_amount, interest_rate, repayment_split } = req.body;

    // Validate required fields
    if (!target_amount || !interest_rate || !repayment_split) {
      return res.status(400).json({
        error: 'Missing required fields: target_amount, interest_rate, repayment_split'
      });
    }

    if (!phone && !trader_id) {
      return res.status(400).json({
        error: 'Either phone or trader_id is required'
      });
    }

    // Find trader
    let trader;
    if (trader_id) {
      trader = await knex('traders').where({ id: trader_id }).first();
    } else {
      trader = await knex('traders').where({ phone }).first();
    }

    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    // Validate SabiScore >= 30
    if (!trader.sabi_score || trader.sabi_score < 30) {
      return res.status(400).json({
        error: 'Trader SabiScore must be at least 30 to create investment round',
        current_score: trader.sabi_score || 0
      });
    }

    // Check for active round
    const existingRound = await knex('investment_rounds')
      .where({ trader_id: trader.id })
      .whereIn('status', ['open', 'funded', 'repaying'])
      .first();

    if (existingRound) {
      return res.status(400).json({
        error: 'Trader already has an active investment round',
        round_id: existingRound.id
      });
    }

    // Cap at 50% of total logged revenue
    const maxAllowed = Math.floor((trader.total_logged_revenue || 0) * 0.5);
    if (target_amount > maxAllowed) {
      return res.status(400).json({
        error: 'Target amount exceeds 50% of total logged revenue',
        max_allowed: maxAllowed,
        requested: target_amount
      });
    }

    // Generate reference prefix
    const referencePrefix = generateReferencePrefix();

    // Auto-set visibility based on SabiScore
    const visibility = trader.sabi_score >= 50 ? 'public' : 'private';

    // Create round
    const [round] = await knex('investment_rounds').insert({
      trader_id: trader.id,
      target_amount,
      interest_rate,
      repayment_split,
      reference_prefix: referencePrefix,
      visibility,
      status: 'open'
    }).returning('*');

    // Publish dashboard event
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'investment_round_created',
      round_id: round.id,
      trader_name: trader.name,
      target_amount,
      visibility,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      round_id: round.id,
      trader_id: trader.id,
      target_amount: round.target_amount,
      interest_rate: round.interest_rate,
      repayment_split: round.repayment_split,
      reference_prefix: round.reference_prefix,
      visibility: round.visibility,
      status: round.status,
      created_at: round.created_at
    });
  } catch (error) {
    console.error('Round creation error:', error);
    return res.status(500).json({ error: 'Round creation failed', details: error.message });
  }
});

/**
 * GET /api/invest/rounds/:id
 * Public view of an investment round
 * Returns trader info, round details, and list of investors
 */
router.get('/rounds/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get round
    const round = await knex('investment_rounds')
      .where({ 'investment_rounds.id': id })
      .join('traders', 'investment_rounds.trader_id', 'traders.id')
      .select(
        'investment_rounds.*',
        'traders.name as trader_name',
        'traders.business_type',
        'traders.sabi_score'
      )
      .first();

    if (!round) {
      return res.status(404).json({ error: 'Investment round not found' });
    }

    // Get investments
    const investments = await knex('investments')
      .where({ round_id: round.id })
      .orderBy('created_at', 'asc')
      .select(
        'investor_name',
        'amount',
        'repaid_amount',
        'expected_return',
        'status',
        'created_at'
      );

    return res.status(200).json({
      round_id: round.id,
      trader_name: round.trader_name,
      business_type: round.business_type,
      sabi_score: round.sabi_score,
      target_amount: round.target_amount,
      raised_amount: round.raised_amount,
      interest_rate: parseFloat(round.interest_rate),
      repayment_split: parseFloat(round.repayment_split),
      status: round.status,
      visibility: round.visibility,
      created_at: round.created_at,
      funded_at: round.funded_at,
      investors: investments.map(inv => ({
        name: inv.investor_name,
        amount: inv.amount,
        repaid: inv.repaid_amount,
        expected_return: inv.expected_return,
        status: inv.status,
        joined_at: inv.created_at
      }))
    });
  } catch (error) {
    console.error('Round view error:', error);
    return res.status(500).json({ error: 'Failed to load round', details: error.message });
  }
});

/**
 * POST /api/invest/rounds/:id/join
 * Register as investor in a round
 * Returns payment instructions
 */
router.post('/rounds/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      investor_phone,
      investor_bank_code,
      investor_account_number,
      amount,
      investor_name
    } = req.body;

    // Validate required fields
    if (!investor_phone || !investor_bank_code || !investor_account_number || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: investor_phone, investor_bank_code, investor_account_number, amount'
      });
    }

    // Get round
    const round = await knex('investment_rounds')
      .where({ id })
      .first();

    if (!round) {
      return res.status(404).json({ error: 'Investment round not found' });
    }

    if (round.status !== 'open' && round.status !== 'funded') {
      return res.status(400).json({
        error: 'Round is not open for investments',
        status: round.status
      });
    }

    // Check if round is overfunded
    if (round.raised_amount + amount > round.target_amount) {
      return res.status(400).json({
        error: 'Investment amount would exceed target',
        remaining: round.target_amount - round.raised_amount,
        requested: amount
      });
    }

    // Resolve investor name via Squad lookup if not provided
    let resolvedName = investor_name;
    if (!resolvedName) {
      try {
        const lookup = await squadService.lookupAccount(investor_bank_code, investor_account_number);
        resolvedName = lookup.accountName;
      } catch (lookupErr) {
        return res.status(400).json({
          error: 'Failed to verify bank account. Please provide investor_name or check account details.',
          details: lookupErr.message
        });
      }
    }

    // Generate reference code
    const existingCount = await knex('investments')
      .where({ round_id: round.id })
      .count('id as count')
      .first();

    const sequenceNumber = (parseInt(existingCount.count) + 1).toString().padStart(3, '0');
    const referenceCode = `${round.reference_prefix}-${sequenceNumber}`;

    // Calculate expected return
    const expectedReturn = Math.round(amount * (1 + parseFloat(round.interest_rate)));

    // Create investment
    const [investment] = await knex('investments').insert({
      round_id: round.id,
      investor_name: resolvedName,
      investor_phone,
      investor_bank_code,
      investor_account_number,
      amount,
      expected_return: expectedReturn,
      reference_code: referenceCode,
      status: 'active'
    }).returning('*');

    // Update round raised amount
    await knex('investment_rounds')
      .where({ id: round.id })
      .update({
        raised_amount: knex.raw('raised_amount + ?', [amount])
      });

    // Check if fully funded
    const updatedRound = await knex('investment_rounds')
      .where({ id: round.id })
      .first();

    if (updatedRound.raised_amount >= updatedRound.target_amount && updatedRound.status === 'open') {
      await knex('investment_rounds')
        .where({ id: round.id })
        .update({
          status: 'funded',
          funded_at: new Date()
        });
    }

    // Get trader virtual account
    const trader = await knex('traders')
      .where({ id: round.trader_id })
      .first();

    // Publish dashboard event
    await redis.publish('dashboard_events', JSON.stringify({
      type: 'investment_joined',
      round_id: round.id,
      investor_name: resolvedName,
      amount,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      investment_id: investment.id,
      reference_code: referenceCode,
      amount,
      expected_return: expectedReturn,
      interest_rate: parseFloat(round.interest_rate),
      payment_instructions: {
        account_number: trader.virtual_account_number,
        bank_name: 'GTBank',
        account_name: trader.name,
        amount_naira: amount / 100,
        reference: referenceCode
      }
    });
  } catch (error) {
    console.error('Investment join error:', error);
    return res.status(500).json({ error: 'Failed to join round', details: error.message });
  }
});

/**
 * GET /api/invest/rounds/:id/status
 * Investor view of round status
 * Query: ?phone=
 */
router.get('/rounds/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Phone query parameter required' });
    }

    // Get round
    const round = await knex('investment_rounds')
      .where({ 'investment_rounds.id': id })
      .join('traders', 'investment_rounds.trader_id', 'traders.id')
      .select(
        'investment_rounds.*',
        'traders.name as trader_name',
        'traders.id as trader_id'
      )
      .first();

    if (!round) {
      return res.status(404).json({ error: 'Investment round not found' });
    }

    // Get investor's investment
    const investment = await knex('investments')
      .where({ round_id: round.id, investor_phone: phone })
      .first();

    if (!investment) {
      return res.status(404).json({ error: 'No investment found for this phone in this round' });
    }

    // Calculate trader activity trend (last 7 days vs prior 7 days)
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const prior7Days = new Date(last7Days);
    prior7Days.setDate(prior7Days.getDate() - 7);

    const lastWeekStats = await knex('sales_logs')
      .where({ trader_id: round.trader_id })
      .where('logged_at', '>=', last7Days)
      .select(
        knex.raw('COALESCE(SUM(amount), 0) as revenue'),
        knex.raw('COUNT(*) as count')
      )
      .first();

    const priorWeekStats = await knex('sales_logs')
      .where({ trader_id: round.trader_id })
      .whereBetween('logged_at', [prior7Days, last7Days])
      .select(knex.raw('COALESCE(SUM(amount), 0) as revenue'))
      .first();

    const lastWeekRevenue = parseInt(lastWeekStats.revenue) || 0;
    const priorWeekRevenue = parseInt(priorWeekStats.revenue) || 1;
    const trend = lastWeekRevenue > priorWeekRevenue * 1.1 ? 'up' :
                  lastWeekRevenue < priorWeekRevenue * 0.9 ? 'down' : 'stable';

    // Calculate progress
    const progressPercent = investment.expected_return > 0
      ? Math.round((investment.repaid_amount / investment.expected_return) * 100)
      : 0;

    return res.status(200).json({
      round_status: round.status,
      trader_name: round.trader_name,
      trader_activity: {
        sales_count_this_week: parseInt(lastWeekStats.count) || 0,
        revenue_this_week: lastWeekRevenue,
        trend
      },
      investor_progress: {
        amount: investment.amount,
        expected_return: investment.expected_return,
        repaid_amount: investment.repaid_amount,
        progress_percent: progressPercent,
        status: investment.status
      }
    });
  } catch (error) {
    console.error('Round status error:', error);
    return res.status(500).json({ error: 'Failed to get round status', details: error.message });
  }
});

/**
 * GET /api/invest/my-rounds
 * Get trader's investment rounds
 * Query: ?phone=
 */
router.get('/my-rounds', async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Phone query parameter required' });
    }

    // Find trader
    const trader = await knex('traders').where({ phone }).first();
    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    // Get all rounds for trader
    const rounds = await knex('investment_rounds')
      .where({ trader_id: trader.id })
      .orderBy('created_at', 'desc')
      .select('*');

    return res.status(200).json({
      trader_id: trader.id,
      trader_name: trader.name,
      rounds: rounds.map(round => ({
        round_id: round.id,
        target_amount: round.target_amount,
        raised_amount: round.raised_amount,
        interest_rate: parseFloat(round.interest_rate),
        repayment_split: parseFloat(round.repayment_split),
        status: round.status,
        visibility: round.visibility,
        reference_prefix: round.reference_prefix,
        created_at: round.created_at,
        funded_at: round.funded_at,
        completed_at: round.completed_at
      }))
    });
  } catch (error) {
    console.error('My rounds error:', error);
    return res.status(500).json({ error: 'Failed to get trader rounds', details: error.message });
  }
});

/**
 * GET /api/invest/my-investments
 * Get investor's investments
 * Query: ?phone=
 */
router.get('/my-investments', async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Phone query parameter required' });
    }

    // Get all investments for phone
    const investments = await knex('investments')
      .where({ investor_phone: phone })
      .join('investment_rounds', 'investments.round_id', 'investment_rounds.id')
      .join('traders', 'investment_rounds.trader_id', 'traders.id')
      .select(
        'investments.*',
        'investment_rounds.status as round_status',
        'investment_rounds.target_amount',
        'investment_rounds.raised_amount',
        'investment_rounds.interest_rate',
        'investment_rounds.repayment_split',
        'traders.name as trader_name',
        'traders.business_type'
      )
      .orderBy('investments.created_at', 'desc');

    return res.status(200).json({
      investor_phone: phone,
      investments: investments.map(inv => {
        const progressPercent = inv.expected_return > 0
          ? Math.round((inv.repaid_amount / inv.expected_return) * 100)
          : 0;

        return {
          investment_id: inv.id,
          round_id: inv.round_id,
          trader_name: inv.trader_name,
          business_type: inv.business_type,
          amount: inv.amount,
          expected_return: inv.expected_return,
          repaid_amount: inv.repaid_amount,
          progress_percent: progressPercent,
          reference_code: inv.reference_code,
          status: inv.status,
          round_status: inv.round_status,
          interest_rate: parseFloat(inv.interest_rate),
          created_at: inv.created_at,
          completed_at: inv.completed_at
        };
      })
    });
  } catch (error) {
    console.error('My investments error:', error);
    return res.status(500).json({ error: 'Failed to get investments', details: error.message });
  }
});

module.exports = router;
