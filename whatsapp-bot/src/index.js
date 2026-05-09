// whatsapp-bot/src/index.js
import { startBot } from './bot/connection.js';

console.log('🤖 Starting SabiWork WhatsApp Bot...');
console.log('   Connecting to WhatsApp...\n');

startBot().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
