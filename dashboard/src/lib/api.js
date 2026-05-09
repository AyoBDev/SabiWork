// dashboard/src/lib/api.js
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchAPI(path) {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const dashboardAPI = {
  getStats: () => fetchAPI('/api/intelligence/stats'),
  getGaps: () => fetchAPI('/api/intelligence/gaps'),
  getDemandHeat: (bounds) => {
    const params = new URLSearchParams(bounds).toString();
    return fetchAPI(`/api/intelligence/demand-heat?${params}`);
  },
  getChannels: () => fetchAPI('/api/intelligence/channels'),
  getFinancialInclusion: () => fetchAPI('/api/intelligence/financial-inclusion'),
  getForecast: (trade, area) => fetchAPI(`/api/intelligence/forecast?trade=${trade}&area=${area}`)
};
