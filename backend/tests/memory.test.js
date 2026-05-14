const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');

process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const memory = require('../src/services/memory');

describe('Memory Service', () => {
  const testUserId = 'test_user_2348011111111';

  beforeEach(async () => {
    await memory.clearSession(testUserId);
  });

  after(async () => {
    await memory.clearSession(testUserId);
    await memory.disconnect();
  });

  it('should create a new session and retrieve it', async () => {
    await memory.addMessage(testUserId, 'user', 'I need a plumber', { user_type: 'buyer' });
    const session = await memory.getSession(testUserId);

    assert.strictEqual(session.messages.length, 1);
    assert.strictEqual(session.messages[0].role, 'user');
    assert.strictEqual(session.messages[0].text, 'I need a plumber');
    assert.strictEqual(session.user_type, 'buyer');
  });

  it('should store up to 10 messages (5 pairs) and trim oldest', async () => {
    for (let i = 0; i < 12; i++) {
      await memory.addMessage(testUserId, i % 2 === 0 ? 'user' : 'assistant', `msg ${i}`);
    }
    const session = await memory.getSession(testUserId);
    assert.strictEqual(session.messages.length, 10);
    assert.strictEqual(session.messages[0].text, 'msg 2');
  });

  it('should update context', async () => {
    await memory.addMessage(testUserId, 'user', 'find plumber');
    await memory.updateContext(testUserId, { last_intent: 'buyer_request', last_worker_match: 'worker-123' });
    const session = await memory.getSession(testUserId);
    assert.strictEqual(session.context.last_intent, 'buyer_request');
    assert.strictEqual(session.context.last_worker_match, 'worker-123');
  });

  it('should return empty session for unknown user', async () => {
    const session = await memory.getSession('nonexistent_user');
    assert.strictEqual(session.messages.length, 0);
    assert.strictEqual(session.context.last_intent, null);
  });

  it('should format history for LLM prompt', async () => {
    await memory.addMessage(testUserId, 'user', 'I need a plumber');
    await memory.addMessage(testUserId, 'assistant', 'Found Emeka nearby');
    await memory.addMessage(testUserId, 'user', 'any closer?');
    const history = await memory.getHistoryForPrompt(testUserId, 2);
    assert.ok(history.includes('User: I need a plumber'));
    assert.ok(history.includes('Assistant: Found Emeka nearby'));
    assert.ok(history.includes('User: any closer?'));
  });
});
