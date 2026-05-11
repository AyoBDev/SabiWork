// backend/tests/invest.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

// Set env vars before requiring knex
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mac@localhost:5432/sabiwork';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const knex = require('../src/database/knex');

// Test data
const TEST_TRADER_PHONE = '08011112222';
const TEST_INVESTOR_PHONE = '08033334444';
let testTraderId;
let testRoundId;
let testInvestmentId;
let testReferencePrefix;

describe('Crowd-Invest Module', () => {
  before(async () => {
    // Clean up any leftover test data
    const existing = await knex('traders').where({ phone: TEST_TRADER_PHONE }).first();
    if (existing) {
      await knex('repayment_ledger').whereIn('round_id',
        knex('investment_rounds').where({ trader_id: existing.id }).select('id')
      ).del();
      await knex('investments').whereIn('round_id',
        knex('investment_rounds').where({ trader_id: existing.id }).select('id')
      ).del();
      await knex('investment_rounds').where({ trader_id: existing.id }).del();
      await knex('traders').where({ id: existing.id }).del();
    }

    // Create a test trader with sufficient sabi_score and revenue
    const [trader] = await knex('traders').insert({
      name: 'Test Trader Invest',
      phone: TEST_TRADER_PHONE,
      business_type: 'electronics',
      area: 'Lagos',
      sabi_score: 55,
      total_logged_sales: 20,
      total_logged_revenue: 2000000 // allows up to 1,000,000 target (50%)
    }).returning('*');

    testTraderId = trader.id;
  });

  after(async () => {
    // Clean up in reverse FK order
    if (testRoundId) {
      await knex('repayment_ledger').where({ round_id: testRoundId }).del();
      await knex('investments').where({ round_id: testRoundId }).del();
      await knex('investment_rounds').where({ id: testRoundId }).del();
    }
    // Also clean any rounds created during tests that may not have been captured
    await knex('repayment_ledger').whereIn('round_id',
      knex('investment_rounds').where({ trader_id: testTraderId }).select('id')
    ).del();
    await knex('investments').whereIn('round_id',
      knex('investment_rounds').where({ trader_id: testTraderId }).select('id')
    ).del();
    await knex('investment_rounds').where({ trader_id: testTraderId }).del();
    await knex('traders').where({ id: testTraderId }).del();
    await knex.destroy();
  });

  describe('POST /api/invest/rounds - Create Round', () => {
    it('should reject missing required fields', async () => {
      const res = await makeRequest('POST', '/api/invest/rounds', {
        phone: TEST_TRADER_PHONE
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('Missing required fields'));
    });

    it('should reject trader with low SabiScore', async () => {
      await knex('traders').where({ id: testTraderId }).update({ sabi_score: 20 });

      const res = await makeRequest('POST', '/api/invest/rounds', {
        phone: TEST_TRADER_PHONE,
        target_amount: 500000,
        interest_rate: 0.10,
        repayment_split: 0.20
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('SabiScore must be at least 30'));

      await knex('traders').where({ id: testTraderId }).update({ sabi_score: 55 });
    });

    it('should reject target exceeding 50% of revenue', async () => {
      const res = await makeRequest('POST', '/api/invest/rounds', {
        phone: TEST_TRADER_PHONE,
        target_amount: 1500000, // exceeds 50% of 2,000,000
        interest_rate: 0.10,
        repayment_split: 0.20
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('50%'));
    });

    it('should create a valid investment round', async () => {
      const res = await makeRequest('POST', '/api/invest/rounds', {
        phone: TEST_TRADER_PHONE,
        target_amount: 500000,
        interest_rate: 0.10,
        repayment_split: 0.20
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();

      assert.strictEqual(body.success, true);
      assert.strictEqual(body.target_amount, 500000);
      assert.strictEqual(parseFloat(body.interest_rate), 0.10);
      assert.strictEqual(parseFloat(body.repayment_split), 0.20);
      assert.strictEqual(body.status, 'open');
      assert.strictEqual(body.visibility, 'public'); // sabi_score >= 50
      assert.ok(body.reference_prefix.startsWith('INV-'));
      assert.strictEqual(body.reference_prefix.length, 10); // INV- + 6 chars

      testRoundId = body.round_id;
      testReferencePrefix = body.reference_prefix;
    });

    it('should reject creating a second active round', async () => {
      const res = await makeRequest('POST', '/api/invest/rounds', {
        phone: TEST_TRADER_PHONE,
        target_amount: 300000,
        interest_rate: 0.10,
        repayment_split: 0.20
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('already has an active'));
    });
  });

  describe('GET /api/invest/rounds/:id - View Round', () => {
    it('should return round details with empty investors list', async () => {
      assert.ok(testRoundId, 'testRoundId must be set from previous test');
      const res = await makeRequest('GET', `/api/invest/rounds/${testRoundId}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      assert.strictEqual(body.round_id, testRoundId);
      assert.strictEqual(body.trader_name, 'Test Trader Invest');
      assert.strictEqual(body.target_amount, 500000);
      assert.strictEqual(body.raised_amount, 0);
      assert.strictEqual(body.status, 'open');
      assert.ok(Array.isArray(body.investors));
      assert.strictEqual(body.investors.length, 0);
    });

    it('should return 404 for non-existent round', async () => {
      const res = await makeRequest('GET', '/api/invest/rounds/00000000-0000-0000-0000-000000000000');
      assert.strictEqual(res.status, 404);
    });
  });

  describe('POST /api/invest/rounds/:id/join - Join Round', () => {
    it('should reject missing required fields', async () => {
      const res = await makeRequest('POST', `/api/invest/rounds/${testRoundId}/join`, {
        investor_phone: TEST_INVESTOR_PHONE
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('Missing required fields'));
    });

    it('should register an investor and return payment instructions', async () => {
      const res = await makeRequest('POST', `/api/invest/rounds/${testRoundId}/join`, {
        investor_phone: TEST_INVESTOR_PHONE,
        investor_bank_code: '058',
        investor_account_number: '0123456789',
        investor_name: 'Test Investor',
        amount: 250000 // 2,500 naira
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();

      assert.strictEqual(body.success, true);
      assert.strictEqual(body.amount, 250000);
      assert.strictEqual(body.expected_return, 275000); // 250000 * 1.10
      assert.ok(body.reference_code.startsWith(testReferencePrefix));
      assert.ok(body.reference_code.endsWith('-001'));
      assert.ok(body.payment_instructions);
      assert.strictEqual(body.payment_instructions.amount_naira, 2500);

      testInvestmentId = body.investment_id;
    });

    it('should reject investment exceeding remaining target', async () => {
      const res = await makeRequest('POST', `/api/invest/rounds/${testRoundId}/join`, {
        investor_phone: '08077778888',
        investor_bank_code: '058',
        investor_account_number: '9876543210',
        investor_name: 'Overflow Investor',
        amount: 350000 // exceeds remaining (500000 - 250000 = 250000)
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('exceed target'));
    });

    it('should update raised_amount after joining', async () => {
      const res = await makeRequest('GET', `/api/invest/rounds/${testRoundId}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.raised_amount, 250000);
      assert.strictEqual(body.investors.length, 1);
      assert.strictEqual(body.investors[0].name, 'Test Investor');
    });

    it('should mark round as funded when fully raised', async () => {
      // Add second investor to fill the round
      const res = await makeRequest('POST', `/api/invest/rounds/${testRoundId}/join`, {
        investor_phone: '08055556666',
        investor_bank_code: '011',
        investor_account_number: '9876543210',
        investor_name: 'Second Investor',
        amount: 250000
      });
      assert.strictEqual(res.status, 201);

      // Verify round status changed to funded
      const roundRes = await makeRequest('GET', `/api/invest/rounds/${testRoundId}`);
      const roundBody = await roundRes.json();
      assert.strictEqual(roundBody.raised_amount, 500000);
      assert.strictEqual(roundBody.status, 'funded');
    });
  });

  describe('GET /api/invest/rounds/:id/status - Investor Status', () => {
    it('should require phone param', async () => {
      const res = await makeRequest('GET', `/api/invest/rounds/${testRoundId}/status`);
      assert.strictEqual(res.status, 400);
    });

    it('should return investor progress', async () => {
      const res = await makeRequest('GET', `/api/invest/rounds/${testRoundId}/status?phone=${TEST_INVESTOR_PHONE}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      assert.strictEqual(body.trader_name, 'Test Trader Invest');
      assert.ok(body.trader_activity);
      assert.ok(body.investor_progress);
      assert.strictEqual(body.investor_progress.amount, 250000);
      assert.strictEqual(body.investor_progress.expected_return, 275000);
      assert.strictEqual(body.investor_progress.repaid_amount, 0);
      assert.strictEqual(body.investor_progress.progress_percent, 0);
    });
  });

  describe('GET /api/invest/my-rounds - Trader Rounds', () => {
    it('should return trader rounds by phone', async () => {
      const res = await makeRequest('GET', `/api/invest/my-rounds?phone=${TEST_TRADER_PHONE}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      assert.strictEqual(body.trader_name, 'Test Trader Invest');
      assert.ok(Array.isArray(body.rounds));
      assert.strictEqual(body.rounds.length, 1);
      assert.strictEqual(body.rounds[0].round_id, testRoundId);
      // Should be funded after previous tests filled it
      assert.strictEqual(body.rounds[0].status, 'funded');
    });

    it('should return 404 for unknown phone', async () => {
      const res = await makeRequest('GET', '/api/invest/my-rounds?phone=09999999999');
      assert.strictEqual(res.status, 404);
    });
  });

  describe('GET /api/invest/my-investments - Investor Portfolio', () => {
    it('should return investor portfolio by phone', async () => {
      const res = await makeRequest('GET', `/api/invest/my-investments?phone=${TEST_INVESTOR_PHONE}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      assert.strictEqual(body.investor_phone, TEST_INVESTOR_PHONE);
      assert.ok(Array.isArray(body.investments));
      assert.strictEqual(body.investments.length, 1);
      assert.strictEqual(body.investments[0].trader_name, 'Test Trader Invest');
      assert.strictEqual(body.investments[0].amount, 250000);
      assert.strictEqual(body.investments[0].progress_percent, 0);
    });
  });

  describe('processSaleSplit - Auto-repayment', () => {
    it('should not split below minimum sale threshold', async () => {
      const { processSaleSplit } = require('../src/services/investSplit');

      // Set round to repaying status
      await knex('investment_rounds')
        .where({ id: testRoundId })
        .update({ status: 'repaying' });

      const result = await processSaleSplit(testTraderId, null, 400000); // below 500000 threshold
      assert.strictEqual(result, null);
    });

    it('should distribute repayment proportionally on qualifying sale', async () => {
      const { processSaleSplit } = require('../src/services/investSplit');

      // Mock squadService.transferToBank to avoid real transfers
      const squadService = require('../src/services/squad');
      const originalTransfer = squadService.transferToBank;
      squadService.transferToBank = async () => ({ success: true });

      try {
        const result = await processSaleSplit(testTraderId, null, 1000000); // 10,000 naira sale
        assert.ok(Array.isArray(result), 'processSaleSplit should return an array');
        assert.ok(result.length > 0, 'Should have at least one repayment result');

        // All results should be successful
        for (const r of result) {
          assert.strictEqual(r.status, 'success');
          assert.ok(r.amount > 0);
        }

        // Verify repayment was recorded
        const investment = await knex('investments').where({ id: testInvestmentId }).first();
        assert.ok(investment.repaid_amount > 0, 'Repaid amount should be > 0');

        // Verify ledger entry exists
        const ledger = await knex('repayment_ledger')
          .where({ round_id: testRoundId })
          .first();
        assert.ok(ledger, 'Ledger entry should exist');
        assert.strictEqual(ledger.transfer_status, 'success');
      } finally {
        squadService.transferToBank = originalTransfer;
      }
    });
  });
});

// Helper: make HTTP request to local API
const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function makeRequest(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(`${BASE_URL}${path}`, options);
}
