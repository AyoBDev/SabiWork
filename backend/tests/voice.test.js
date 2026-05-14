const { describe, it } = require('node:test');
const assert = require('node:assert');

const { transcribeAudio, isVoiceSupported } = require('../src/services/voice');

describe('Voice Service', () => {
  it('should export transcribeAudio function', () => {
    assert.strictEqual(typeof transcribeAudio, 'function');
  });

  it('should export isVoiceSupported function', () => {
    assert.strictEqual(typeof isVoiceSupported, 'function');
  });

  it('isVoiceSupported should return true when GROQ_API_KEY is set', () => {
    assert.strictEqual(isVoiceSupported(), !!process.env.GROQ_API_KEY);
  });

  it('should reject invalid buffer with a clear error', async () => {
    try {
      await transcribeAudio(Buffer.from('not audio'), 'audio/ogg');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('transcription failed') || err.message.includes('Invalid'));
    }
  });
});
