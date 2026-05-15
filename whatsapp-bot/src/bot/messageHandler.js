// whatsapp-bot/src/bot/messageHandler.js
import { handleOnboard, isOnboarding } from '../handlers/onboard.js';
import { handleBuyer } from '../handlers/buyer.js';
import { handleTrader, isTraderMessage } from '../handlers/trader.js';
import { handleSeeker } from '../handlers/seeker.js';
import { handleWorkerCommand } from '../handlers/worker.js';
import { handleInvest, isInvestCommand } from '../handlers/invest.js';
import { cancelGhost } from '../handlers/ghost.js';

// Conversation state: phone -> { step, data, flow }
const conversations = new Map();

// Keywords that trigger specific flows
const WORKER_COMMANDS = ['READY', 'BUSY', 'SCORE', 'ACCEPT', 'DECLINE'];
const INVEST_COMMANDS = ['INVEST', 'ROUND', 'MYINVEST', 'INVESTORS'];
const REGISTER_KEYWORDS = ['register', 'join', 'start', 'signup', 'hello', 'hi'];
const SEEKER_KEYWORDS = ['find work', 'job', 'apprentice', 'learn', 'pathway', 'APPLY'];
const TRADER_KEYWORDS = ['sold', 'sale', 'REPORT'];

export async function handleMessage(phone, text, pushName = '') {
  cancelGhost();

  const state = conversations.get(phone);
  const upperText = text.toUpperCase().trim();

  // 0. Handle location capture response from landing page (LOC:lat,lng,accuracy)
  if (upperText.startsWith('LOC:') && state && state.flow === 'onboard') {
    const parts = text.substring(4).split(',');
    if (parts.length >= 2) {
      state.data.location_lat = parseFloat(parts[0]);
      state.data.location_lng = parseFloat(parts[1]);
      state.data.location_accuracy = parts[2] ? parseInt(parts[2]) : null;
      conversations.set(phone, state);
      return `📍 Location received! (±${parts[2] || '?'}m)\n\nContinuing your registration...`;
    }
  }

  // 1. If in active onboarding flow, continue it — unless user is clearly asking for a service
  if (state && state.flow === 'onboard') {
    // Break out of onboarding if user is asking for a worker or logging a sale
    if (isTraderMessage(text)) {
      conversations.delete(phone);
      return handleTrader(phone, text, null, conversations, pushName);
    }
    const hasTrade = ['plumb', 'electric', 'carpenter', 'carpentry', 'clean', 'tailor', 'paint', 'weld', 'til'].some(t => text.toLowerCase().includes(t));
    if (hasTrade || /find|i\s+need|get\s+me/i.test(text.toLowerCase())) {
      conversations.delete(phone);
      return handleBuyer(phone, text, null, conversations);
    }
    return handleOnboard(phone, text, state, conversations);
  }

  // 2. Worker commands (existing workers)
  if (WORKER_COMMANDS.includes(upperText)) {
    return handleWorkerCommand(phone, upperText, state, conversations);
  }

  // 2.5. Investment commands
  if (INVEST_COMMANDS.includes(upperText) || (state && state.flow === 'invest')) {
    return handleInvest(phone, text, state, conversations);
  }

  // 3. Registration trigger
  if (REGISTER_KEYWORDS.some((k) => text.toLowerCase().includes(k)) && !state) {
    conversations.set(phone, { flow: 'onboard', step: 1, data: {} });
    return handleOnboard(phone, text, { flow: 'onboard', step: 1, data: {} }, conversations);
  }

  // 4. Trader message (sales pattern: "sold X bags of Y at Z")
  if (isTraderMessage(text)) {
    return handleTrader(phone, text, state, conversations, pushName);
  }

  // 5. Trader REPORT command
  if (upperText === 'REPORT') {
    return handleTrader(phone, text, state, conversations, pushName);
  }

  // 6. Seeker keywords
  if (SEEKER_KEYWORDS.some((k) => text.toLowerCase().includes(k))) {
    return handleSeeker(phone, text, state, conversations);
  }

  // 7. Default: treat as buyer/natural language → AI matching
  return handleBuyer(phone, text, state, conversations);
}

export function getConversation(phone) {
  return conversations.get(phone);
}

export function clearConversation(phone) {
  conversations.delete(phone);
}
