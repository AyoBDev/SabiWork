// backend/tests/demo.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mac@localhost:5432/sabiwork';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe('Demo Runner', () => {
  it('POST /api/demo/run should start buyer-worker scenario', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'buyer-worker' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('POST /api/demo/run should start market-day scenario', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'market-day' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('POST /api/demo/ghost should fire ghost messages', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/ghost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('POST /api/demo/event should emit custom event', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message_parsed',
        actor: 'Test User',
        description: 'Test event from integration test'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('POST /api/demo/event should reject missing fields', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'Test' })
    });
    assert.strictEqual(res.status, 400);
  });
});
