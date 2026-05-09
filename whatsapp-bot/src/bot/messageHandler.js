// whatsapp-bot/src/bot/messageHandler.js
import { handleOnboard, isOnboarding } from '../handlers/onboard.js';
import { handleBuyer } from '../handlers/buyer.js';
import { handleTrader, isTraderMessage } from '../handlers/trader.js';
import { handleSeeker } from '../handlers/seeker.js';
import { handleWorkerCommand } from '../handlers/worker.js';

// Conversation state: phone -> { step, data, flow }
const conversations = new Map();

// Keywords that trigger specific flows
const WORKER_COMMANDS = ['READY', 'BUSY', 'SCORE', 'ACCEPT', 'DECLINE'];
const REGISTER_KEYWORDS = ['register', 'join', 'start', 'signup', 'hello', 'hi'];
const SEEKER_KEYWORDS = ['find work', 'job', 'apprentice', 'learn', 'pathway', 'APPLY'];
const TRADER_KEYWORDS = ['sold', 'sale', 'REPORT'];

export async function handleMessage(phone, text) {
  const state = conversations.get(phone);
  const upperText = text.toUpperCase().trim();

  // 1. If in active onboarding flow, continue it
  if (state && state.flow === 'onboard') {
    return handleOnboard(phone, text, state, conversations);
  }

  // 2. Worker commands (existing workers)
  if (WORKER_COMMANDS.includes(upperText)) {
    return handleWorkerCommand(phone, upperText, state, conversations);
  }

  // 3. Registration trigger
  if (REGISTER_KEYWORDS.some((k) => text.toLowerCase().includes(k)) && !state) {
    conversations.set(phone, { flow: 'onboard', step: 1, data: {} });
    return handleOnboard(phone, text, { flow: 'onboard', step: 1, data: {} }, conversations);
  }

  // 4. Trader message (sales pattern: "sold X bags of Y at Z")
  if (isTraderMessage(text)) {
    return handleTrader(phone, text, state, conversations);
  }

  // 5. Trader REPORT command
  if (upperText === 'REPORT') {
    return handleTrader(phone, text, state, conversations);
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
