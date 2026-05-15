// whatsapp-bot/src/handlers/onboard.js
import { backendAPI } from '../services/api.js';
import { config } from '../config.js';

const PWA_BASE_URL = process.env.PWA_URL || 'https://sabiwork.ng';

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

const BANKS = [
  '1. Kuda', '2. OPay', '3. PalmPay', '4. GTBank', '5. Access',
  '6. First Bank', '7. UBA', '8. Zenith', '9. Wema', '10. FairMoney'
];

const BANK_MAP = {
  '1': { name: 'Kuda', code: '090267' },
  '2': { name: 'OPay', code: '100004' },
  '3': { name: 'PalmPay', code: '100033' },
  '4': { name: 'GTBank', code: '058' },
  '5': { name: 'Access', code: '044' },
  '6': { name: 'First Bank', code: '011' },
  '7': { name: 'UBA', code: '033' },
  '8': { name: 'Zenith', code: '057' },
  '9': { name: 'Wema', code: '035' },
  '10': { name: 'FairMoney', code: '090551' }
};

export function isOnboarding(state) {
  return state && state.flow === 'onboard';
}

export async function handleOnboard(phone, text, state, conversations) {
  const step = state.step;
  const data = state.data;

  switch (step) {
    case 1:
      // Welcome — ask how they want to register
      return `🎉 Welcome to *SabiWork*!

Let's get you registered so you can start receiving jobs and building your financial identity.

*How would you like to register?*

1. With my bank account (we'll get your name automatically)
2. With my name (type it manually)

Reply *1* or *2*`;

    case 2: {
      // Route based on registration choice
      const choice = text.trim();
      if (choice === '1') {
        // Bank-based registration
        data.regType = 'bank';
        conversations.set(phone, { flow: 'onboard', step: 'bank_select', data });
        return `Great! We'll verify your identity through your bank account.

*Which bank?* Reply with the number:

${BANKS.join('\n')}`;
      } else if (choice === '2') {
        // Name-based registration
        data.regType = 'name';
        conversations.set(phone, { flow: 'onboard', step: 'name_input', data });
        return `*What is your full name?*`;
      } else {
        return `Please reply *1* or *2*:

1. With my bank account (we'll get your name automatically)
2. With my name (type it manually)`;
      }
    }

    case 'bank_select': {
      // User selected a bank
      const bankChoice = text.trim();
      const bank = BANK_MAP[bankChoice];
      if (!bank) {
        return `Please reply with a number (1-10):\n\n${BANKS.join('\n')}`;
      }
      data.bank_name = bank.name;
      data.bank_code = bank.code;
      conversations.set(phone, { flow: 'onboard', step: 'account_number', data });
      return `✅ *${bank.name}*

Now enter your *account number* (10 digits):`;
    }

    case 'account_number': {
      // Validate and lookup account
      const acctNum = text.trim();
      if (!/^\d{10}$/.test(acctNum)) {
        return `Please enter a valid 10-digit account number:`;
      }
      data.account_number = acctNum;

      // Call Squad API to resolve name
      try {
        const lookup = await backendAPI.lookupAccount({
          bank_code: data.bank_code,
          account_number: acctNum
        });
        data.name = lookup.account_name;
        conversations.set(phone, { flow: 'onboard', step: 'confirm_name', data });
        return `We found your account:

📋 *${lookup.account_name}*
🏦 ${data.bank_name} - ${acctNum}

Is this correct? Reply *Yes* or *No*`;
      } catch (err) {
        // Lookup failed — fall back to manual name
        conversations.set(phone, { flow: 'onboard', step: 'name_input', data });
        return `⚠️ We couldn't verify that account. No worries!

*What is your full name?*`;
      }
    }

    case 'confirm_name': {
      const answer = text.trim().toLowerCase();
      if (answer === 'yes' || answer === 'y') {
        data.phone = phone;
        conversations.set(phone, { flow: 'onboard', step: 'trade', data });
        return `✅ Great, *${data.name}*!

What trade do you do? Reply with the number:

${TRADES.join('\n')}`;
      } else {
        // Let them type name manually
        conversations.set(phone, { flow: 'onboard', step: 'name_input', data });
        return `No problem! *What is your full name?*`;
      }
    }

    case 'name_input': {
      // Manual name entry
      data.name = text.trim();
      data.phone = phone;
      conversations.set(phone, { flow: 'onboard', step: 'trade', data });
      return `Nice to meet you, *${data.name}*! 👋

What trade do you do? Reply with the number:

${TRADES.join('\n')}`;
    }

    case 'trade': {
      // Save trade, ask for areas
      const trade = TRADE_MAP[text.trim()] || text.toLowerCase().trim();
      if (!Object.values(TRADE_MAP).includes(trade) && !TRADE_MAP[text.trim()]) {
        return `Please reply with a number (1-10):\n\n${TRADES.join('\n')}`;
      }
      data.primary_trade = TRADE_MAP[text.trim()] || trade;
      conversations.set(phone, { flow: 'onboard', step: 'areas', data });
      return `✅ *${data.primary_trade}* — nice!

Which areas do you serve? Reply with numbers separated by commas (e.g., 1,3,5):

${AREAS.join('\n')}`;
    }

    case 'areas': {
      // Save areas, ask for bank if not already provided
      const areaNumbers = text.split(',').map((s) => s.trim());
      const areas = areaNumbers.map((n) => AREA_MAP[n]).filter(Boolean);
      if (areas.length === 0) {
        return `Please reply with numbers separated by commas (e.g., 1,3,5):\n\n${AREAS.join('\n')}`;
      }
      data.service_areas = areas;

      // Send location capture link if we don't have GPS yet
      const locationLink = `${PWA_BASE_URL}/join/${phone}`;
      const locationMsg = !data.location_lat
        ? `\n\n📍 *Share your location* to get matched with nearby jobs:\n${locationLink}\n(Open the link above, then come back here)`
        : '';

      // If bank details already collected (bank-based flow), skip to registration
      if (data.bank_code && data.account_number) {
        conversations.set(phone, { flow: 'onboard', step: 'register', data });
        data.onboarding_channel = 'whatsapp';
        return await completeRegistration(phone, data, conversations);
      }

      // Otherwise ask for bank details
      conversations.set(phone, { flow: 'onboard', step: 'bank_details', data });
      return `Great! You'll serve: *${areas.join(', ')}*${locationMsg}

Last step — your bank details for receiving payments.

*Which bank?* Reply with the number:

${BANKS.join('\n')}`;
    }

    case 'bank_details': {
      // Bank selection for name-based flow
      const bankChoice = text.trim();
      const bank = BANK_MAP[bankChoice];
      if (!bank) {
        return `Please reply with a number (1-10):\n\n${BANKS.join('\n')}`;
      }
      data.bank_name = bank.name;
      data.bank_code = bank.code;
      conversations.set(phone, { flow: 'onboard', step: 'bank_account', data });
      return `✅ *${bank.name}*

Enter your *account number* (10 digits):`;
    }

    case 'bank_account': {
      // Account number for name-based flow
      const acctNum = text.trim();
      if (!/^\d{10}$/.test(acctNum)) {
        return `Please enter a valid 10-digit account number:`;
      }
      data.account_number = acctNum;
      data.onboarding_channel = 'whatsapp';

      return await completeRegistration(phone, data, conversations);
    }

    default:
      conversations.delete(phone);
      return null;
  }
}

async function completeRegistration(phone, data, conversations) {
  let virtualAccount = null;

  try {
    const payload = { ...data };
    if (data.location_lat && data.location_lng) {
      payload.location_lat = data.location_lat;
      payload.location_lng = data.location_lng;
    }
    const result = await backendAPI.onboardWorker(payload);
    virtualAccount = result.virtual_account_number;
  } catch (err) {
    console.log(`[Onboard] Backend registration failed for ${phone}: ${err.message} — completing locally`);
  }

  conversations.delete(phone);

  return `🎊 *Registration Complete!*

Welcome to SabiWork, ${data.name}!

📋 *Your details:*
• Trade: ${data.primary_trade}
• Areas: ${data.service_areas.join(', ')}
• Bank: ${data.bank_name || data.bank_code} - ${data.account_number}

🏦 *Virtual Account:* ${virtualAccount || 'Setting up...'}
Any payment to this account is auto-logged!

📱 *Commands:*
• READY — start receiving jobs
• BUSY — pause job alerts
• SCORE — check your trust + SabiScore

Sabi dey pay! 💪`;
}
