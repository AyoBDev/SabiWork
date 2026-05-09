// backend/src/config.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Squad
  squadBaseUrl: process.env.SQUAD_BASE_URL || 'https://sandbox-api-d.squadco.com',
  squadSecretKey: process.env.SQUAD_SECRET_KEY,
  squadPublicKey: process.env.SQUAD_PUBLIC_KEY,
  squadWebhookSecret: process.env.SQUAD_WEBHOOK_SECRET,
  squadMerchantId: process.env.SQUAD_MERCHANT_ID,

  // Groq
  groqApiKey: process.env.GROQ_API_KEY,

  // Auth
  serviceKey: process.env.SERVICE_KEY,
  jwtSecret: process.env.JWT_SECRET,

  // Webhook
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
};

module.exports = config;
