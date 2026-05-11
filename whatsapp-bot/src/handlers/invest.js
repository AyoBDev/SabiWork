// whatsapp-bot/src/handlers/invest.js
import { backendAPI } from '../services/api.js';

const PWA_BASE_URL = process.env.PWA_URL || 'https://sabiwork.ng';

export function isInvestCommand(text) {
  const upperText = text.toUpperCase().trim();
  return ['INVEST', 'ROUND', 'MYINVEST', 'INVESTORS'].includes(upperText);
}

export async function handleInvest(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  try {
    // ROUND command - show trader's active round
    if (upperText === 'ROUND') {
      const rounds = await backendAPI.getMyRounds(phone);
      if (!rounds || rounds.length === 0) {
        return `📊 You don't have any active investment rounds.\n\nType INVEST to create one!`;
      }

      const round = rounds[0]; // Get most recent
      const status = await backendAPI.getRoundStatus(round.id, phone);

      return `📊 Your Investment Round\n\n` +
        `Amount Needed: ₦${round.amount.toLocaleString()}\n` +
        `Raised: ₦${status.raised.toLocaleString()} (${Math.round(status.progress)}%)\n` +
        `Interest: ${round.interest_rate}%\n` +
        `Split: ${round.repayment_split}%\n` +
        `Investors: ${status.investor_count}\n` +
        `Status: ${round.status}\n\n` +
        `Share link: ${PWA_BASE_URL}/invest/${round.id}`;
    }

    // INVESTORS command - list investors in round
    if (upperText === 'INVESTORS') {
      const rounds = await backendAPI.getMyRounds(phone);
      if (!rounds || rounds.length === 0) {
        return `You don't have any active rounds.`;
      }

      const round = rounds[0];
      const detail = await backendAPI.getRound(round.id);

      if (!detail.investors || detail.investors.length === 0) {
        return `📋 No investors yet in your round.\n\nShare: ${PWA_BASE_URL}/invest/${round.id}`;
      }

      let msg = `📋 Investors (${detail.investors.length})\n\n`;
      detail.investors.forEach((inv, i) => {
        msg += `${i + 1}. ${inv.name || inv.phone}\n`;
        msg += `   ₦${inv.amount.toLocaleString()}\n`;
      });
      return msg;
    }

    // MYINVEST command - show user's investments
    if (upperText === 'MYINVEST') {
      const investments = await backendAPI.getMyInvestments(phone);
      if (!investments || investments.length === 0) {
        return `💰 You haven't invested in any rounds yet.\n\nBrowse opportunities at ${PWA_BASE_URL}/invest`;
      }

      let msg = `💰 Your Investments\n\n`;
      investments.forEach((inv, i) => {
        msg += `${i + 1}. Round #${inv.round_id}\n`;
        msg += `   Invested: ₦${inv.amount.toLocaleString()}\n`;
        msg += `   Returns: ₦${inv.expected_return.toLocaleString()}\n`;
        msg += `   Status: ${inv.status}\n\n`;
      });
      return msg;
    }

    // INVEST command - create new round (multi-step flow)
    if (upperText === 'INVEST' || (state && state.flow === 'invest')) {
      return handleInvestFlow(phone, text, state, conversations);
    }

    return `Unknown investment command. Try INVEST, ROUND, MYINVEST, or INVESTORS.`;
  } catch (error) {
    console.error('Investment error:', error);
    return `❌ Error: ${error.message}`;
  }
}

async function handleInvestFlow(phone, text, state, conversations) {
  const upperText = text.toUpperCase().trim();

  // Start new flow
  if (upperText === 'INVEST' && (!state || state.flow !== 'invest')) {
    conversations.set(phone, { flow: 'invest', step: 'amount', data: {} });
    return `💼 Create Investment Round\n\n` +
      `How much capital do you need?\n` +
      `(Minimum ₦10,000)\n\n` +
      `Example: 50000`;
  }

  // Step: amount
  if (state.step === 'amount') {
    const amount = parseInt(text.replace(/[^\d]/g, ''));
    if (isNaN(amount) || amount < 10000) {
      return `Please enter a valid amount (minimum ₦10,000).`;
    }

    state.data.amount = amount;
    state.step = 'interest';
    conversations.set(phone, state);

    return `What interest rate will you offer?\n` +
      `(5-25%)\n\n` +
      `Example: 15`;
  }

  // Step: interest
  if (state.step === 'interest') {
    const interest = parseFloat(text.replace(/[^\d.]/g, ''));
    if (isNaN(interest) || interest < 5 || interest > 25) {
      return `Please enter a valid interest rate (5-25%).`;
    }

    state.data.interest_rate = interest;
    state.step = 'split';
    conversations.set(phone, state);

    return `What percentage of daily sales will you repay?\n` +
      `(20-50%)\n\n` +
      `Example: 30`;
  }

  // Step: split
  if (state.step === 'split') {
    const split = parseFloat(text.replace(/[^\d.]/g, ''));
    if (isNaN(split) || split < 20 || split > 50) {
      return `Please enter a valid split percentage (20-50%).`;
    }

    state.data.repayment_split = split;
    state.step = 'confirm';
    conversations.set(phone, state);

    const totalReturn = state.data.amount * (1 + state.data.interest_rate / 100);

    return `📋 Confirm Your Round\n\n` +
      `Amount: ₦${state.data.amount.toLocaleString()}\n` +
      `Interest: ${state.data.interest_rate}%\n` +
      `Total Return: ₦${totalReturn.toLocaleString()}\n` +
      `Daily Split: ${state.data.repayment_split}%\n\n` +
      `Reply YES to create or NO to cancel.`;
  }

  // Step: confirm
  if (state.step === 'confirm') {
    if (upperText === 'NO') {
      conversations.delete(phone);
      return `Investment round cancelled.`;
    }

    if (upperText !== 'YES') {
      return `Please reply YES to confirm or NO to cancel.`;
    }

    // Create the round
    const roundData = {
      trader_phone: phone,
      amount: state.data.amount,
      interest_rate: state.data.interest_rate,
      repayment_split: state.data.repayment_split
    };

    const round = await backendAPI.createRound(roundData);
    conversations.delete(phone);

    return `✅ Investment round created!\n\n` +
      `Round ID: ${round.id}\n` +
      `Amount: ₦${round.amount.toLocaleString()}\n` +
      `Interest: ${round.interest_rate}%\n\n` +
      `Share this link with investors:\n` +
      `${PWA_BASE_URL}/invest/${round.id}\n\n` +
      `Type ROUND to check status.`;
  }

  return `Something went wrong. Type INVEST to start over.`;
}
