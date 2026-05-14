const { describe, it } = require('node:test');
const assert = require('node:assert');

const { fallbackClassify } = require('../src/services/matching');

describe('Intent Classification - Fallback', () => {
  it('should classify complaint messages', () => {
    const result = fallbackClassify('this plumber never showed up');
    assert.strictEqual(result.type, 'complaint');
  });

  it('should classify Pidgin complaints', () => {
    const result = fallbackClassify('e no come at all o');
    assert.strictEqual(result.type, 'complaint');
  });

  it('should classify price inquiry', () => {
    const result = fallbackClassify('how much plumber cost');
    assert.strictEqual(result.type, 'price_inquiry');
  });

  it('should classify feedback/rating', () => {
    const result = fallbackClassify('he did great work 5 stars');
    assert.strictEqual(result.type, 'feedback');
  });

  it('should classify referral', () => {
    const result = fallbackClassify('my friend needs a cleaner');
    assert.strictEqual(result.type, 'referral');
  });

  it('should classify re-engage', () => {
    const result = fallbackClassify("what's new");
    assert.strictEqual(result.type, 're_engage');
  });

  it('should classify help request', () => {
    const result = fallbackClassify('what can you do');
    assert.strictEqual(result.type, 'help');
  });

  it('should classify reschedule', () => {
    const result = fallbackClassify('can he come tomorrow instead');
    assert.strictEqual(result.type, 'reschedule');
  });

  it('should still classify buyer requests correctly', () => {
    const result = fallbackClassify('I need a plumber in Yaba');
    assert.strictEqual(result.type, 'buyer_request');
    assert.strictEqual(result.trade_category, 'plumbing');
  });

  it('should still classify sale logs correctly', () => {
    const result = fallbackClassify('sold 3 bags rice 75000');
    assert.strictEqual(result.type, 'sale_log');
  });

  it('should still classify greetings', () => {
    const result = fallbackClassify('hello');
    assert.strictEqual(result.type, 'greeting');
  });
});
