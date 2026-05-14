const Groq = require('groq-sdk');
const config = require('../config');

const WHISPER_TIMEOUT = 8000;

let groq = null;

function getGroqClient() {
  if (!groq) {
    groq = new Groq({ apiKey: config.groqApiKey });
  }
  return groq;
}

function isVoiceSupported() {
  return !!config.groqApiKey;
}

async function transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
  if (!config.groqApiKey) {
    throw new Error('Voice transcription failed: GROQ_API_KEY not configured');
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Voice transcription failed: Invalid audio buffer');
  }

  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'ogg';
  const filename = `voice.${ext}`;

  const file = new File([audioBuffer], filename, { type: mimeType });

  try {
    const client = getGroqClient();
    const response = await Promise.race([
      client.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
        language: 'en',
        response_format: 'text'
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Voice transcription failed: timeout')), WHISPER_TIMEOUT))
    ]);

    const text = typeof response === 'string' ? response.trim() : (response.text || '').trim();

    if (!text) {
      throw new Error('Voice transcription failed: empty result');
    }

    return text;
  } catch (error) {
    if (error.message.startsWith('Voice transcription failed')) {
      throw error;
    }
    throw new Error(`Voice transcription failed: ${error.message}`);
  }
}

module.exports = {
  transcribeAudio,
  isVoiceSupported
};
