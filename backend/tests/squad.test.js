// tests/squad.test.js
// Integration tests for Squad API (sandbox)
// Run: node tests/squad.test.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const SQUAD_BASE_URL = process.env.SQUAD_BASE_URL || 'https://sandbox-api-d.squadco.com';
const SQUAD_SECRET_KEY = process.env.SQUAD_SECRET_KEY;

if (!SQUAD_SECRET_KEY || SQUAD_SECRET_KEY === 'sandbox_sk_xxxxxxxxxxxxx') {
  console.error('❌ SQUAD_SECRET_KEY not set or still placeholder. Set it in .env');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${SQUAD_SECRET_KEY}`,
  'Content-Type': 'application/json'
};

async function request(method, path, body = null) {
  const url = `${SQUAD_BASE_URL}${path}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  console.log(`  → ${method} ${path}`);
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    console.error(`  ✗ ${res.status}:`, JSON.stringify(data, null, 2));
    return { ok: false, status: res.status, data };
  }

  return { ok: true, status: res.status, data };
}

async function testInitiatePayment() {
  console.log('\n1️⃣  Test: Initiate Payment');

  const ref = `TEST_${Date.now()}`;
  const result = await request('POST', '/transaction/initiate', {
    amount: 50000, // 500 Naira in kobo
    email: 'test@sabiwork.ng',
    currency: 'NGN',
    initiate_type: 'inline',
    transaction_ref: ref,
    callback_url: 'https://sabiwork.ng/webhook',
    pass_charge: false,
    payment_channels: ['card', 'bank', 'ussd', 'transfer']
  });

  if (result.ok && result.data?.data?.checkout_url) {
    console.log(`  ✓ Checkout URL: ${result.data.data.checkout_url}`);
    console.log(`  ✓ Ref: ${ref}`);
    return ref;
  } else {
    console.log(`  ✗ Failed to initiate payment`);
    return null;
  }
}

async function testVerifyTransaction(ref) {
  console.log('\n2️⃣  Test: Verify Transaction');

  if (!ref) {
    console.log('  ⏭ Skipped (no ref from initiation)');
    return;
  }

  const result = await request('GET', `/transaction/verify/${ref}`);

  if (result.ok) {
    const status = result.data?.data?.transaction_status;
    console.log(`  ✓ Status: ${status || 'pending'} (expected: pending or abandoned for sandbox)`);
  } else {
    // 404 is expected for sandbox if transaction was never completed
    if (result.status === 404 || result.status === 400) {
      console.log(`  ✓ Got ${result.status} — expected for unfinished sandbox transaction`);
    } else {
      console.log(`  ✗ Unexpected error`);
    }
  }
}

async function testAccountLookup() {
  console.log('\n3️⃣  Test: Account Lookup (NIP)');

  const result = await request('POST', '/payout/account/lookup', {
    bank_code: '000013', // GTBank NIP code (6 chars)
    account_number: '0123456789' // Test account
  });

  if (result.ok) {
    console.log(`  ✓ Account name: ${result.data?.data?.account_name || 'N/A'}`);
  } else {
    console.log(`  ⚠ ${result.status} — ${result.data?.message || 'unknown'}`);
  }
}

async function testTransfer() {
  console.log('\n4️⃣  Test: Fund Transfer (Sandbox)');

  const merchantId = process.env.SQUAD_MERCHANT_ID || 'SBD1L4BEW3';
  const ref = `${merchantId}_${Date.now()}`;
  const result = await request('POST', '/payout/transfer', {
    transaction_reference: ref,
    amount: '10000', // 100 Naira in kobo (string)
    bank_code: '000013', // GTBank NIP code
    account_number: '0123456789', // Dummy account
    account_name: 'Test Account',
    currency_id: 'NGN',
    remark: 'SabiWork test payout'
  });

  if (result.ok) {
    console.log(`  ✓ Transfer initiated. NIP ref: ${result.data?.data?.nip_transaction_reference || 'pending'}`);
  } else {
    // Sandbox may fail transfers — that's expected without real funding
    console.log(`  ⚠ ${result.status} — ${result.data?.message || 'sandbox may require funded wallet'}`);
  }
}

async function testCreateVirtualAccount() {
  console.log('\n5️⃣  Test: Create Virtual Account');

  const result = await request('POST', '/virtual-account', {
    customer_identifier: `test_${Date.now()}`,
    first_name: 'Test',
    last_name: 'User',
    mobile_num: '08012345678',
    email: `test_${Date.now()}@sabiwork.ng`,
    dob: '01/01/1990',
    gender: '1',
    bvn: '22222222222',
    address: 'Lagos, Nigeria',
    beneficiary_account: process.env.SQUAD_MERCHANT_ID || 'SBD1L4BEW3'
  });

  if (result.ok) {
    const va = result.data?.data;
    console.log(`  ✓ Virtual Account: ${va?.virtual_account_number || 'N/A'}`);
    console.log(`    Bank: ${va?.bank_name || 'GTBank'}`);
  } else {
    console.log(`  ⚠ ${result.status} — ${result.data?.message || 'unknown'}`);
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log(' Squad API Integration Tests (Sandbox)');
  console.log(`Base URL: ${SQUAD_BASE_URL}`);
  console.log('='.repeat(50));

  const ref = await testInitiatePayment();
  await testVerifyTransaction(ref);
  await testAccountLookup();
  await testTransfer();
  await testCreateVirtualAccount();

  console.log('\n' + '='.repeat(50));
  console.log(' Tests complete. Review results above.');
  console.log('='.repeat(50) + '\n');
}

runTests().catch(console.error);
