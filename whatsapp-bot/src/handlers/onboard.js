// whatsapp-bot/src/handlers/onboard.js
import { backendAPI } from '../services/api.js';

const TRADES = [
  '1. Plumbing', '2. Electrical', '3. Carpentry', '4. Cleaning',
  '5. Tailoring', '6. Hairdressing', '7. Painting', '8. Catering',
  '9. Welding', '10. Tiling'
];

const TRADE_MAP = {
  '1': 'plumbing', '2': 'electrical', '3': 'carpentry', '4': 'cleaning',
  '5': 'tailoring', '6': 'hairdressing', '7': 'painting', '8': 'catering',
  '9': 'welding', '10': 'tiling'
};

const AREAS = [
  '1. Surulere', '2. Yaba', '3. Ikeja', '4. Lekki', '5. VI',
  '6. Mushin', '7. Maryland', '8. Ojota', '9. Ikorodu', '10. Ajah'
];

const AREA_MAP = {
  '1': 'surulere', '2': 'yaba', '3': 'ikeja', '4': 'lekki',
  '5': 'victoria_island', '6': 'mushin', '7': 'maryland',
  '8': 'ojota', '9': 'ikorodu', '10': 'ajah'
};

export function isOnboarding(state) {
  return state && state.flow === 'onboard';
}

export async function handleOnboard(phone, text, state, conversations) {
  const step = state.step;
  const data = state.data;

  switch (step) {
    case 1:
      // Ask for name
      return `🎉 Welcome to *SabiWork*!

Let's get you registered so you can start receiving jobs and building your financial identity.

*What is your full name?*`;

    case 2:
      // Save name, ask for trade
      data.name = text;
      data.phone = phone;
      conversations.set(phone, { flow: 'onboard', step: 3, data });
      return `Nice to meet you, *${text}*! 👋

What trade do you do? Reply with the number:

${TRADES.join('\n')}`;

    case 3:
      // Save trade, ask for areas
      const trade = TRADE_MAP[text.trim()] || text.toLowerCase().trim();
      if (!Object.values(TRADE_MAP).includes(trade) && !TRADE_MAP[text.trim()]) {
        return `Please reply with a number (1-10):\n\n${TRADES.join('\n')}`;
      }
      data.primary_trade = TRADE_MAP[text.trim()] || trade;
      conversations.set(phone, { flow: 'onboard', step: 4, data });
      return `✅ *${data.primary_trade}* — nice!

Which areas do you serve? Reply with numbers separated by commas (e.g., 1,3,5):

${AREAS.join('\n')}`;

    case 4:
      // Save areas, ask for bank
      const areaNumbers = text.split(',').map((s) => s.trim());
      const areas = areaNumbers.map((n) => AREA_MAP[n]).filter(Boolean);
      if (areas.length === 0) {
        return `Please reply with numbers separated by commas (e.g., 1,3,5):\n\n${AREAS.join('\n')}`;
      }
      data.service_areas = areas;
      conversations.set(phone, { flow: 'onboard', step: 5, data });
      return `Great! You'll serve: *${areas.join(', ')}*

Last step — your bank details for receiving payments.

Reply in this format:
*Bank code, Account number*

Example: 058, 0123456789

(Common codes: GTB=058, Access=044, First=011, UBA=033)`;

    case 5:
      // Save bank, register
      const parts = text.split(',').map((s) => s.trim());
      if (parts.length !== 2) {
        return `Please reply in format: *Bank code, Account number*\n\nExample: 058, 0123456789`;
      }
      data.bank_code = parts[0];
      data.account_number = parts[1];
      data.onboarding_channel = 'whatsapp';

      try {
        const result = await backendAPI.onboardWorker(data);

        conversations.delete(phone);

        return `🎊 *Registration Complete!*

Welcome to SabiWork, ${data.name}!

📋 *Your details:*
• Trade: ${data.primary_trade}
• Areas: ${data.service_areas.join(', ')}
• Bank: ${data.bank_code} - ${data.account_number}

🏦 *Virtual Account:* ${result.virtual_account_number || 'Creating...'}
Any payment to this account is auto-logged!

📱 *Commands:*
• READY — start receiving jobs
• BUSY — pause job alerts
• SCORE — check your trust + SabiScore

Sabi dey pay! 💪`;
      } catch (err) {
        conversations.delete(phone);
        return `⚠️ Registration failed: ${err.message}\n\nTry again by sending "register"`;
      }

    default:
      conversations.delete(phone);
      return null;
  }
}
