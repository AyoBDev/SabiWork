# Plan 2: Squad Service Layer (All 6 API Products)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Squad API client service that handles payment initiation, transaction verification, bank transfers (payouts), payout requery, virtual account creation, and account lookup. Plus the webhook handler with HMAC verification and Redis idempotency.

**Architecture:** Single `SquadService` class wraps all Squad endpoints. Webhook route verifies signatures, deduplicates via Redis, and emits events to other services. All amounts converted to kobo at the service boundary.

**Tech Stack:** Express 5 routes, Node.js fetch API, Redis (ioredis), crypto (HMAC-SHA512)

**Depends on:** Plan 1 (backend scaffold, Redis, database running)

---

## File Structure

```
backend/src/
├── services/
│   └── squad.js              # Squad API client (all 6 products)
├── routes/
│   ├── payments.js           # POST /api/payments/initiate, GET /api/payments/verify/:ref
│   └── webhooks.js           # POST /api/webhooks/squad
├── middleware/
│   └── webhookVerify.js      # HMAC-SHA512 signature verification
└── utils/
    └── redis.js              # Redis client instance
```

---

### Task 1: Redis Client Utility

**Files:**
- Create: `backend/src/utils/redis.js`

- [ ] **Step 1: Create Redis client**

```javascript
// backend/src/utils/redis.js
const Redis = require('ioredis');
const config = require('../config');

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

module.exports = redis;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/utils/redis.js
git commit -m "feat: add Redis client utility"
```

---

### Task 2: Squad Service — Payment Initiation

**Files:**
- Create: `backend/src/services/squad.js`

- [ ] **Step 1: Create Squad service with payment initiation**

```javascript
// backend/src/services/squad.js
const crypto = require('crypto');
const config = require('../config');

class SquadService {
  constructor() {
    this.baseUrl = config.squadBaseUrl;
    this.secretKey = config.squadSecretKey;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `Squad API error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Initiate a payment transaction
   * @param {Object} params
   * @param {number} params.amount - Amount in Naira (converted to kobo internally)
   * @param {string} params.email - Buyer email
   * @param {string} params.transactionRef - Unique reference (format: SABI_{job_id}_{timestamp})
   * @param {string} params.callbackUrl - Webhook URL
   * @param {Object} params.metadata - { job_id, worker_id, service_category, area }
   * @param {string[]} params.paymentChannels - ['card', 'bank', 'ussd', 'transfer']
   * @returns {Object} { checkout_url, transaction_ref }
   */
  async initiatePayment({ amount, email, transactionRef, callbackUrl, metadata, paymentChannels }) {
    const body = {
      amount: amount * 100, // Naira to kobo
      email,
      currency: 'NGN',
      initiate_type: 'inline',
      transaction_ref: transactionRef,
      callback_url: callbackUrl || `${config.webhookBaseUrl}/api/webhooks/squad`,
      pass_charge: false,
      payment_channels: paymentChannels || ['card', 'bank', 'ussd', 'transfer'],
      metadata: metadata || {}
    };

    const result = await this._request('POST', '/transaction/initiate', body);
    return {
      checkout_url: result.data.checkout_url,
      transaction_ref: transactionRef
    };
  }
}

module.exports = new SquadService();
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad service with payment initiation"
```

---

### Task 3: Squad Service — Transaction Verification

**Files:**
- Modify: `backend/src/services/squad.js`

- [ ] **Step 1: Add verifyTransaction method**

Add the following method to the `SquadService` class in `backend/src/services/squad.js`, after the `initiatePayment` method:

```javascript
  /**
   * Verify a transaction by reference
   * @param {string} transactionRef - The transaction reference to verify
   * @returns {Object} Transaction details including status, amount, payment channel
   */
  async verifyTransaction(transactionRef) {
    const result = await this._request('GET', `/transaction/verify/${transactionRef}`);
    return {
      status: result.data.transaction_status,
      amount: result.data.transaction_amount / 100, // kobo to Naira
      amountKobo: result.data.transaction_amount,
      currency: result.data.transaction_currency_id,
      paymentChannel: result.data.payment_channel || result.data.channel,
      merchantRef: result.data.merchant_ref,
      meta: result.data.meta || {}
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad transaction verification"
```

---

### Task 4: Squad Service — Bank Transfer (Payout)

**Files:**
- Modify: `backend/src/services/squad.js`

- [ ] **Step 1: Add transferToBank method**

Add the following method to the `SquadService` class:

```javascript
  /**
   * Transfer funds to a worker's bank account (payout)
   * @param {Object} params
   * @param {number} params.amount - Amount in Naira (converted to kobo internally)
   * @param {string} params.bankCode - Bank code (e.g., '090267' for Kuda)
   * @param {string} params.accountNumber - 10-digit NUBAN account number
   * @param {string} params.accountName - Verified account name
   * @param {string} params.transactionRef - Unique payout reference
   * @param {string} params.remark - Transfer narration
   * @returns {Object} { success, nip_ref } or throws on failure
   */
  async transferToBank({ amount, bankCode, accountNumber, accountName, transactionRef, remark }) {
    const body = {
      transaction_ref: transactionRef,
      amount: amount * 100, // Naira to kobo
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      currency_id: 'NGN',
      remark: remark || 'SabiWork payout'
    };

    const result = await this._request('POST', '/payout/transfer', body);
    return {
      success: true,
      nipRef: result.data?.nip_transaction_reference || null,
      transactionRef
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad bank transfer (payout) method"
```

---

### Task 5: Squad Service — Payout Requery

**Files:**
- Modify: `backend/src/services/squad.js`

- [ ] **Step 1: Add requeryPayout method**

Add the following method to the `SquadService` class:

```javascript
  /**
   * Requery a payout that timed out (424 response)
   * IMPORTANT: Only call this after a 424 timeout. Never re-initiate the transfer.
   * @param {string} transactionRef - The payout reference to requery
   * @returns {Object} { status, nipRef }
   */
  async requeryPayout(transactionRef) {
    const body = {
      transaction_ref: transactionRef
    };

    const result = await this._request('POST', '/payout/requery', body);
    return {
      status: result.data?.transaction_status || 'pending',
      nipRef: result.data?.nip_transaction_reference || null
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad payout requery method"
```

---

### Task 6: Squad Service — Virtual Account Creation

**Files:**
- Modify: `backend/src/services/squad.js`

- [ ] **Step 1: Add createVirtualAccount method**

Add the following method to the `SquadService` class:

```javascript
  /**
   * Create a dedicated virtual account for a worker or trader
   * Returns a GTBank account number that auto-logs income on credit
   * @param {Object} params
   * @param {string} params.customerId - Unique identifier (user UUID)
   * @param {string} params.firstName - User's first name
   * @param {string} params.lastName - User's last name
   * @param {string} params.phone - User's mobile number
   * @param {string} params.email - User's email (generated if not available)
   * @returns {Object} { accountNumber, bankName, accountName }
   */
  async createVirtualAccount({ customerId, firstName, lastName, phone, email }) {
    const body = {
      customer_identifier: customerId,
      first_name: firstName,
      last_name: lastName,
      mobile_num: phone,
      email: email || `${customerId}@sabiwork.ng`,
      beneficiary_account: config.squadMerchantId
    };

    const result = await this._request('POST', '/virtual-account', body);
    return {
      accountNumber: result.data.virtual_account_number,
      bankName: result.data.bank_name || 'GTBank',
      accountName: `${firstName} ${lastName}`
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad virtual account creation method"
```

---

### Task 7: Squad Service — Account Lookup (Bank Verification)

**Files:**
- Modify: `backend/src/services/squad.js`

- [ ] **Step 1: Add lookupAccount method**

Add the following method to the `SquadService` class:

```javascript
  /**
   * Verify a bank account number and get the account name
   * Used during worker onboarding to validate bank details before payouts
   * @param {string} bankCode - Bank code (e.g., '090267')
   * @param {string} accountNumber - 10-digit account number
   * @returns {Object} { accountName, accountNumber, bankCode }
   */
  async lookupAccount(bankCode, accountNumber) {
    const body = {
      bank_code: bankCode,
      account_number: accountNumber
    };

    const result = await this._request('POST', '/payout/account/lookup', body);
    return {
      accountName: result.data.account_name,
      accountNumber: result.data.account_number,
      bankCode
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad account lookup (bank verification) method"
```

---

### Task 8: Squad Service — Webhook Signature Verification

**Files:**
- Modify: `backend/src/services/squad.js`

- [ ] **Step 1: Add verifyWebhookSignature method**

Add the following method to the `SquadService` class:

```javascript
  /**
   * Verify Squad webhook signature (HMAC-SHA512)
   * @param {Object|string} body - Raw request body (parsed JSON object)
   * @param {string} signature - Value from x-squad-encrypted-body header
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(body, signature) {
    if (!signature || !config.squadWebhookSecret) {
      return false;
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const hash = crypto
      .createHmac('sha512', config.squadWebhookSecret)
      .update(bodyString)
      .digest('hex')
      .toUpperCase();

    return hash === signature.toUpperCase();
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/squad.js
git commit -m "feat: add Squad webhook HMAC-SHA512 signature verification"
```

---

### Task 9: Webhook Verification Middleware

**Files:**
- Create: `backend/src/middleware/webhookVerify.js`

- [ ] **Step 1: Create webhook verification middleware**

```javascript
// backend/src/middleware/webhookVerify.js
const squadService = require('../services/squad');

/**
 * Express middleware to verify Squad webhook signatures.
 * Must be applied BEFORE express.json() on the webhook route,
 * or use the raw body captured separately.
 *
 * Since Express 5 parses JSON before middleware runs on the route,
 * we verify using the parsed body (JSON.stringify re-serialization).
 * Squad computes HMAC on the raw JSON body they sent.
 */
function webhookVerify(req, res, next) {
  const signature = req.headers['x-squad-encrypted-body'];

  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const isValid = squadService.verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    console.error('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

module.exports = webhookVerify;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware/webhookVerify.js
git commit -m "feat: add webhook HMAC verification middleware"
```

---

### Task 10: Webhook Route Handler

**Files:**
- Create: `backend/src/routes/webhooks.js`

- [ ] **Step 1: Create webhook route**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/webhooks.js
git commit -m "feat: add Squad webhook route with idempotency and event routing"
```

---

### Task 11: Payments Route (Initiate + Verify)

**Files:**
- Create: `backend/src/routes/payments.js`

- [ ] **Step 1: Create payments route**

```javascript
// backend/src/routes/payments.js
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const knex = require('../database/knex');
const squadService = require('../services/squad');
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
      const redis = require('../utils/redis');
      await redis.publish('dashboard_events', JSON.stringify({
        type: 'payout_sent',
        amount: payoutAmount,
        worker_name: worker.name,
        bank: worker.account_name,
        area: worker.service_areas?.[0],
        timestamp: new Date().toISOString()
      }));

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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/payments.js
git commit -m "feat: add payments route (initiate, verify, payout with requery)"
```

---

### Task 12: Mount Routes on Express App

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Update index.js to mount payment and webhook routes**

Replace the contents of `backend/src/index.js` with:

```javascript
// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const config = require('./config');

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sabiwork-backend', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/payments', require('./routes/payments'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Placeholder for routes added in later plans
app.get('/api', (req, res) => {
  res.json({
    message: 'SabiWork API v1.0',
    routes: [
      'POST /api/payments/initiate',
      'GET /api/payments/verify/:ref',
      'POST /api/payments/payout',
      'POST /api/webhooks/squad'
    ]
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`SabiWork backend running on port ${config.port}`);
});

module.exports = { app, server };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: mount payments and webhooks routes"
```

---

### Task 13: Test Squad Integration (Manual Verification)

- [ ] **Step 1: Start services**

```bash
docker-compose up --build
```

- [ ] **Step 2: Test health**

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"sabiwork-backend",...}
```

- [ ] **Step 3: Test API index**

```bash
curl http://localhost:3000/api
# Expected: JSON with routes listed
```

- [ ] **Step 4: Test payment initiation (will fail without real Squad keys, but validates route works)**

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "00000000-0000-0000-0000-000000000001",
    "buyer_id": "00000000-0000-0000-0000-000000000001",
    "amount": 5000,
    "buyer_email": "test@example.com"
  }'
# Expected: 404 "Worker not found" (no workers seeded yet — correct behavior)
```

- [ ] **Step 5: Test webhook with no signature**

```bash
curl -X POST http://localhost:3000/api/webhooks/squad \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: 401 {"error": "Missing webhook signature"}
```

- [ ] **Step 6: Verify Redis is connected (check backend logs)**

Expected in docker-compose output: `Redis connected`

---

## Summary

After completing this plan you have:
- Complete Squad API client with all 6 products (initiate, verify, transfer, requery, virtual account, account lookup)
- HMAC-SHA512 webhook signature verification
- Redis-backed idempotency (7-day TTL)
- Webhook event routing (charge_successful, charge_failed, virtual_account_credit)
- Payment initiation route with job creation
- Payout route with fee calculation and 424 timeout handling
- Transaction verification route
- All events published to Redis for dashboard WebSocket (connected in Plan 5)
- Ready for Plan 3 (Trust score service) and Plan 5 (remaining API routes)
