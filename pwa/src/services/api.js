// pwa/src/services/api.js
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Workers
  getWorkers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/workers${query ? `?${query}` : ''}`);
  },
  getWorker: (id) => request(`/workers/${id}`),

  // Chat / AI
  sendChat: (message, context = {}) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...context })
    }),

  // Jobs
  createJob: (data) =>
    request('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  getJob: (id) => request(`/jobs/${id}`),
  getBuyerJobs: (buyerId) => request(`/jobs/buyer/${buyerId}`),
  getWorkerJobs: (workerId) => request(`/jobs/worker/${workerId}`),
  rateJob: (id, rating) =>
    request(`/jobs/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating }) }),
  completeJob: (id, rating) =>
    request(`/jobs/${id}/complete`, { method: 'POST', body: JSON.stringify({ rating }) }),

  // Payments
  initiatePayment: (data) =>
    request('/payments/initiate', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (ref) => request(`/payments/verify/${ref}`),

  // Intelligence (for Pulse)
  getStats: () => request('/intelligence/stats'),
  getDemandHeat: (bounds) => {
    const query = new URLSearchParams(bounds).toString();
    return request(`/intelligence/demand-heat?${query}`);
  },
  getGaps: () => request('/intelligence/gaps'),

  // Profile
  getProfile: (phone) => request(`/workers/phone/${phone}`),
  updateAvailability: (id, available) =>
    request(`/workers/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available: available })
    }),

  // Banks
  getBanks: (search) => request(`/banks${search ? `?search=${search}` : ''}`),
  lookupBank: (bankCode, accountNumber) =>
    request('/banks/lookup', {
      method: 'POST',
      body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber })
    }),
  resolveAccount: (accountNumber) =>
    request('/banks/resolve', {
      method: 'POST',
      body: JSON.stringify({ account_number: accountNumber })
    }),

  // Wallet
  walletTransfer: (data) =>
    request('/wallet/transfer', { method: 'POST', body: JSON.stringify(data) }),
  getWalletBalance: () => request('/wallet/balance'),
  getWalletTransactions: (phone) => request(`/wallet/transactions?phone=${phone || ''}`),

  // Traders
  logSale: (data) =>
    request('/traders/sales', { method: 'POST', body: JSON.stringify(data) }),
  getTraderReport: (id) => request(`/traders/${id}/report`),

  // Invest
  getOpenRounds: () => request('/invest/rounds'),
  getMyInvestments: (phone) => request(`/invest/my-investments?phone=${phone}`),
  getRoundStatus: (roundId, phone) => request(`/invest/rounds/${roundId}/status?phone=${phone}`),

  // Public profiles
  getPublicWorkerProfile: (id) => request(`/workers/${id}/public`),
  getPublicTraderProfile: (id) => request(`/traders/${id}/public`)
};

export default api;
