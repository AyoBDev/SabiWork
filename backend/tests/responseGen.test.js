const { describe, it } = require('node:test');
const assert = require('node:assert');

const { generateResponse, buildSystemPrompt } = require('../src/services/responseGen');

describe('Response Generator', () => {
  it('should export generateResponse function', () => {
    assert.strictEqual(typeof generateResponse, 'function');
  });

  it('buildSystemPrompt should include user_type context', () => {
    const prompt = buildSystemPrompt('trader');
    assert.ok(prompt.includes('trader'));
    assert.ok(prompt.includes('Nigerian English'));
  });

  it('buildSystemPrompt should handle null user_type', () => {
    const prompt = buildSystemPrompt(null);
    assert.ok(prompt.includes('SabiWork'));
    assert.ok(!prompt.includes('null'));
  });

  it('generateResponse should return fallback when Groq unavailable', async () => {
    const result = await generateResponse({
      handlerResult: { type: 'text', message: 'No plumber found' },
      intent: { type: 'buyer_request', trade_category: 'plumbing' },
      conversationHistory: '',
      userType: 'buyer'
    });
    assert.ok(result.length > 0);
  });
});
