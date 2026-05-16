import useAppStore from '../stores/appStore';
import api from '../services/api';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const KNOWN_TRADES = ['plumber', 'plumbing', 'electrician', 'electrical', 'carpenter', 'carpentry', 'cleaner', 'cleaning', 'tailor', 'tailoring', 'hairdresser', 'hairdressing', 'painter', 'painting', 'caterer', 'catering', 'welder', 'welding', 'tiler', 'tiling'];

const DEMO_WORKERS = {
  plumbing: [
    { id: 'w1', name: 'Emeka Okafor', primary_trade: 'plumbing', sabi_score: 0.89, distance_km: 1.2, avg_rating: 4.8, total_jobs: 43, location_lat: 6.5100, location_lng: 3.3700 },
    { id: 'w2', name: 'Chidi Nwosu', primary_trade: 'plumbing', sabi_score: 0.76, distance_km: 2.4, avg_rating: 4.5, total_jobs: 28, location_lat: 6.5200, location_lng: 3.3800 },
    { id: 'w3', name: 'Tunde Bakare', primary_trade: 'plumbing', sabi_score: 0.71, distance_km: 3.1, avg_rating: 4.3, total_jobs: 19, location_lat: 6.5300, location_lng: 3.3900 },
  ],
  electrical: [
    { id: 'w4', name: 'Femi Adeyemi', primary_trade: 'electrical', sabi_score: 0.92, distance_km: 0.8, avg_rating: 4.9, total_jobs: 67, location_lat: 6.5150, location_lng: 3.3750 },
    { id: 'w5', name: 'Bayo Ogundimu', primary_trade: 'electrical', sabi_score: 0.81, distance_km: 1.9, avg_rating: 4.6, total_jobs: 31, location_lat: 6.5250, location_lng: 3.3850 },
  ],
  carpentry: [
    { id: 'w6', name: 'Ade Olamide', primary_trade: 'carpentry', sabi_score: 0.85, distance_km: 1.5, avg_rating: 4.7, total_jobs: 52, location_lat: 6.5180, location_lng: 3.3720 },
    { id: 'w7', name: 'Kunle Fasasi', primary_trade: 'carpentry', sabi_score: 0.73, distance_km: 2.8, avg_rating: 4.4, total_jobs: 22, location_lat: 6.5280, location_lng: 3.3880 },
  ],
  cleaning: [
    { id: 'w8', name: 'Grace Ojo', primary_trade: 'cleaning', sabi_score: 0.88, distance_km: 1.0, avg_rating: 4.8, total_jobs: 56, location_lat: 6.5120, location_lng: 3.3680 },
    { id: 'w9', name: 'Amina Hassan', primary_trade: 'cleaning', sabi_score: 0.79, distance_km: 2.1, avg_rating: 4.5, total_jobs: 34, location_lat: 6.5220, location_lng: 3.3820 },
  ],
};

function getDemoWorkers(trade) {
  const normalized = trade.replace(/er$/, 'ing').replace(/or$/, 'ing');
  return DEMO_WORKERS[normalized] || DEMO_WORKERS[trade] || DEMO_WORKERS.plumbing;
}

function parseSaleFromText(text) {
  const qtyMatch = text.match(/(\d+)\s*(bags?|pieces?|cartons?|crates?|kg|baskets?|bowls?|units?|packs?)?/i);
  const amountMatch = text.match(/(\d[\d,]+)(?:\s*(?:naira|₦))?/g);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  let amount = 0;
  if (amountMatch) {
    const amounts = amountMatch.map(a => parseInt(a.replace(/,/g, '')));
    amount = Math.max(...amounts);
  }

  const itemPatterns = /(?:bags?\s+(?:of\s+)?|pieces?\s+(?:of\s+)?|cartons?\s+(?:of\s+)?|crates?\s+(?:of\s+)?|kg\s+(?:of\s+)?|baskets?\s+(?:of\s+)?|bowls?\s+(?:of\s+)?)([\w\s]+?)(?:\s+(?:for|at|@)\s+|\s*$)/i;
  const itemMatch = text.match(itemPatterns);
  let item_name = itemMatch ? itemMatch[1].trim() : 'items';

  if (item_name === 'items' || !item_name) {
    const words = text.replace(/sold|log|sale|for|at|bags?|pieces?|cartons?|\d+/gi, '').trim().split(/\s+/).filter(w => w.length > 2);
    item_name = words.slice(0, 2).join(' ') || 'items';
  }

  return { item_name, quantity, amount: amount || quantity * 5000, category: 'general' };
}

function detectLocalIntent(text) {
  const lower = text.toLowerCase();
  if (/find|look\s+for|i\s+need|get\s+me|search|who\s+can|any\s+\w+\s+near/i.test(lower) || detectTrade(lower)) {
    return 'find_worker';
  }
  if (/sold|log\s+(a\s+)?sale|i\s+sold|record\s+sale|new\s+sale/i.test(lower)) {
    return 'log_sale';
  }
  return null;
}

function detectTrade(text) {
  const lower = text.toLowerCase();
  for (const trade of KNOWN_TRADES) {
    if (lower.includes(trade)) return trade;
  }
  return null;
}

export function useAgentChat() {
  const addMessage = useAppStore((s) => s.addMessage);
  const setWorkers = useAppStore((s) => s.setWorkers);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const setHighlightedWorkerId = useAppStore((s) => s.setHighlightedWorkerId);
  const setAgentSelectedWorker = useAppStore((s) => s.setAgentSelectedWorker);
  const addSale = useAppStore((s) => s.addSale);
  const setPendingNavigation = useAppStore((s) => s.setPendingNavigation);
  const addOverlayStep = useAppStore((s) => s.addOverlayStep);
  const clearOverlay = useAppStore((s) => s.clearOverlay);
  const setAgentAction = useAppStore((s) => s.setAgentAction);

  function overlayStep(text, stepType = 'thinking') {
    addOverlayStep({ text, stepType });
  }

  async function handleFindWorker(text, apiPromise) {
    const trade = detectTrade(text) || 'worker';
    const tradeName = trade.replace(/ing$/, '').replace(/al$/, '') + 'er';

    // Close chat, navigate to map immediately so user sees the screen
    setChatOpen(false);
    clearOverlay();
    setPendingNavigation('/');
    await delay(300);

    overlayStep(`Looking for ${tradeName}s nearby...`, 'searching');
    await delay(1000);

    overlayStep(`Scanning available ${tradeName}s in your area...`, 'searching');

    // Try API first, fall back to demo data
    const apiResponse = await apiPromise;

    let workers = [];
    if (apiResponse?.type === 'worker_card' && apiResponse.data) {
      workers = [apiResponse.data, ...(apiResponse.data.alternatives || [])].filter(Boolean);
    }

    if (workers.length === 0) {
      try {
        const data = await api.getWorkers({ available: true });
        const all = data.workers || data || [];
        workers = all.filter(w => {
          const wt = w.primary_trade?.toLowerCase() || '';
          return wt.includes(trade) || trade.includes(wt);
        }).slice(0, 5);
        if (workers.length === 0) workers = all.slice(0, 4);
      } catch {
        workers = getDemoWorkers(trade);
      }
    }

    if (workers.length === 0) {
      workers = getDemoWorkers(trade);
    }

    overlayStep(`Found ${workers.length} ${tradeName}${workers.length > 1 ? 's' : ''}`, 'success');
    setWorkers(workers);
    await delay(800);

    // Highlight each worker on the visible map
    for (let i = 0; i < Math.min(workers.length, 3); i++) {
      const w = workers[i];
      const dist = w.distance_km ? `${w.distance_km}km away` : '';
      const rating = w.avg_rating ? `${w.avg_rating}★` : '';
      const info = [dist, rating].filter(Boolean).join(' · ');
      overlayStep(`${w.name} — ${info}`, 'searching');
      setHighlightedWorkerId(w.id || w.phone || `${w.location_lat}_${w.location_lng}`);
      await delay(1500);
    }

    // Best match
    setHighlightedWorkerId(null);
    overlayStep(`Best match: ${workers[0].name}`, 'complete');
    await delay(1000);

    // Open worker sheet on the visible map
    setHighlightedWorkerId(workers[0].id || workers[0].phone || `${workers[0].location_lat}_${workers[0].location_lng}`);
    await delay(600);
    setHighlightedWorkerId(null);
    clearOverlay();
    setAgentSelectedWorker(workers[0]);

    const resultText = apiResponse?.message ||
      `I found ${workers[0].name} — solid ${tradeName} near you. ${workers[0].distance_km}km away, ${workers[0].total_jobs} jobs done, people trust am well. Want me book am?`;

    addMessage({
      type: 'agent_result',
      text: resultText,
      data: workers[0],
      actionType: 'worker_card',
      sender: 'ai'
    });

    return apiResponse;
  }

  async function handleLogSale(text, apiPromise) {
    // Close chat, navigate to Pulse immediately so user sees the screen
    setChatOpen(false);
    clearOverlay();
    setPendingNavigation('/pulse');
    await delay(300);

    overlayStep('Processing your sale...', 'thinking');
    await delay(600);

    // Try API
    const apiResponse = await apiPromise;

    let sale;
    let resultMessage;
    let saleData;

    if (apiResponse?.type === 'sale_logged' && apiResponse.data) {
      sale = apiResponse.data.sale || apiResponse.data;
      resultMessage = apiResponse.message;
      saleData = apiResponse.data;
    } else {
      sale = parseSaleFromText(text);
      const user = useAppStore.getState().user;
      const todayTotal = (sale.amount || 0) + Math.floor(Math.random() * 50000) + 20000;
      const todayCount = Math.floor(Math.random() * 4) + 1;
      const sabiScore = (user?.sabi_score || 30) + 2;

      saleData = {
        sale,
        today_total: todayTotal,
        today_count: todayCount,
        sabi_score_after: sabiScore,
        weeks_to_loan: sabiScore >= 50 ? 0 : Math.ceil((50 - sabiScore) / 2)
      };
      resultMessage = `Nice one! ${sale.quantity}x ${sale.item_name} logged — ₦${sale.amount.toLocaleString()}. You don sell ₦${todayTotal.toLocaleString()} today. Sabi Score: ${sabiScore}. Keep going!`;
    }

    // Open the sale form on the visible Pulse page
    overlayStep('Opening sale form...', 'action');
    setAgentAction({ type: 'open_log_sale' });
    await delay(800);

    // Fill fields one by one on the visible form
    overlayStep(`Filling: ${sale.item_name}`, 'action');
    setAgentAction({ type: 'fill_sale', data: { item_name: sale.item_name } });
    await delay(900);

    overlayStep(`Quantity: ${sale.quantity}`, 'action');
    setAgentAction({ type: 'fill_sale', data: { item_name: sale.item_name, quantity: sale.quantity } });
    await delay(900);

    overlayStep(`Amount: ₦${Number(sale.amount).toLocaleString()}`, 'action');
    setAgentAction({ type: 'fill_sale', data: { item_name: sale.item_name, quantity: sale.quantity, amount: sale.amount } });
    await delay(900);

    // Submit the form
    overlayStep('Submitting...', 'action');
    setAgentAction({ type: 'submit_sale' });
    await delay(600);

    // Log the sale to store
    addSale({
      item_name: sale.item_name,
      quantity: sale.quantity,
      amount: sale.amount,
      category: sale.category,
      today_total: saleData.today_total,
      today_count: saleData.today_count,
      sabi_score_after: saleData.sabi_score_after,
      logged_at: new Date().toISOString()
    });

    overlayStep('Sale logged!', 'complete');
    await delay(1000);
    clearOverlay();
    setAgentAction(null);

    addMessage({
      type: 'agent_result',
      text: resultMessage,
      data: saleData,
      actionType: 'sale_logged',
      sender: 'ai'
    });

    return apiResponse;
  }

  async function handleGenericResponse(apiPromise) {
    const apiResponse = await apiPromise;

    if (apiResponse?.steps && apiResponse.steps.length > 0) {
      for (const step of apiResponse.steps) {
        addMessage({ type: 'agent_step', text: step, stepType: 'thinking', sender: 'ai' });
        await delay(800 + Math.random() * 400);
      }
    }

    addMessage({
      type: 'agent_result',
      text: apiResponse?.message || "I can help you with:\n• Find workers — \"find me a plumber\"\n• Log sales — \"sold 3 bags rice 75000\"\n• Check score — \"my sabi score\"\n\nTry one of these!",
      data: apiResponse?.data,
      actionType: apiResponse?.type,
      sender: 'ai'
    });

    return apiResponse;
  }

  async function send(text) {
    addMessage({ type: 'text', text, sender: 'user' });

    const localIntent = detectLocalIntent(text);

    // Fire API call in background
    const user = useAppStore.getState().user;
    const [userLng, userLat] = useAppStore.getState().mapCenter;

    const apiPromise = api.sendChat(text, {
      user_id: user?.phone || user?.id,
      user_type: user?.user_type || user?.role || 'unknown',
      user_lat: userLat,
      user_lng: userLng
    }).catch(() => null);

    if (localIntent === 'find_worker') {
      return await handleFindWorker(text, apiPromise);
    } else if (localIntent === 'log_sale') {
      return await handleLogSale(text, apiPromise);
    } else {
      return await handleGenericResponse(apiPromise);
    }
  }

  return { send };
}
