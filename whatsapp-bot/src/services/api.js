// whatsapp-bot/src/services/api.js
import { config } from '../config.js';

const headers = {
  'Content-Type': 'application/json',
  'x-service-key': config.serviceKey
};

async function request(method, path, body = null) {
  const url = `${config.backendUrl}${path}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API ${response.status}`);
  }
  return response.json();
}

export const backendAPI = {
  // Chat (AI matching)
  chat: (message, context) =>
    request('POST', '/api/chat', { message, ...context }),

  // Workers
  lookupAccount: (data) =>
    request('POST', '/api/workers/lookup-account', data),
  onboardWorker: (data) =>
    request('POST', '/api/workers/onboard', data),
  getWorkerByPhone: (phone) =>
    request('GET', `/api/workers/phone/${phone}`),
  updateAvailability: (id, available) =>
    request('PATCH', `/api/workers/${id}/availability`, { is_available: available }),

  // Traders
  registerTrader: (data) =>
    request('POST', '/api/traders', data),
  logSale: (data) =>
    request('POST', '/api/traders/sales', data),
  getTraderReport: (phone) =>
    request('GET', `/api/traders/phone/${phone}/report`),

  // Seekers
  registerSeeker: (data) =>
    request('POST', '/api/seekers', data),
  getPathway: (phone) =>
    request('GET', `/api/seekers/phone/${phone}/pathway`),

  // Scores
  getScores: (phone) =>
    request('GET', `/api/workers/phone/${phone}/scores`),

  // Invest
  createRound: (data) =>
    request('POST', '/api/invest/rounds', data),
  getRound: (id) =>
    request('GET', `/api/invest/rounds/${id}`),
  joinRound: (id, data) =>
    request('POST', `/api/invest/rounds/${id}/join`, data),
  getMyRounds: (phone) =>
    request('GET', `/api/invest/my-rounds?phone=${phone}`),
  getMyInvestments: (phone) =>
    request('GET', `/api/invest/my-investments?phone=${phone}`),
  getRoundStatus: (id, phone) =>
    request('GET', `/api/invest/rounds/${id}/status?phone=${phone}`),

  // Demo events (non-critical, fire-and-forget)
  notifyEvent: (type, data) =>
    request('POST', '/api/demo/event', { type, ...data }).catch(() => {})
};
