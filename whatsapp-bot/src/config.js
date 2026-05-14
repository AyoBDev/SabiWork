// whatsapp-bot/src/config.js
export const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  serviceKey: process.env.SERVICE_KEY || 'sabiwork-bot-secret',
  databaseUrl: process.env.DATABASE_URL || '',
  botName: 'SabiWork'
};
