// whatsapp-bot/src/config.js
export const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  serviceKey: process.env.SERVICE_KEY || 'sabiwork-bot-secret',
  sessionDir: process.env.SESSION_DIR || './auth_state',
  botName: 'SabiWork'
};
