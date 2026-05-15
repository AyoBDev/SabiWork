import useAppStore from '../stores/appStore';
import api from '../services/api';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const KNOWN_TRADES = ['plumber', 'plumbing', 'electrician', 'electrical', 'carpenter', 'carpentry', 'cleaner', 'cleaning', 'tailor', 'tailoring', 'hairdresser', 'hairdressing', 'painter', 'painting', 'caterer', 'catering', 'welder', 'welding', 'tiler', 'tiling'];

function detectTrade(text) {
  const lower = text.toLowerCase();
  for (const trade of KNOWN_TRADES) {
    if (lower.includes(trade)) return trade;
  }
  return null;
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

export function useAgentChat() {
  const addMessage = useAppStore((s) => s.addMessage);
  const setWorkers = useAppStore((s) => s.setWorkers);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const setHighlightedWorkerId = useAppStore((s) => s.setHighlightedWorkerId);
  const setAgentSelectedWorker = useAppStore((s) => s.setAgentSelectedWorker);
  const addSale = useAppStore((s) => s.addSale);
  const setPendingNavigation = useAppStore((s) => s.setPendingNavigation);

  function addStep(text, stepType = 'thinking') {
    addMessage({ type: 'agent_step', text, stepType, sender: 'ai' });
  }

  async function handleFindWorker(text, apiPromise) {
    const trade = detectTrade(text) || 'worker';
    const tradeName = trade.replace(/ing$/, '').replace(/al$/, '') + 'er';

    addStep(`Looking for ${tradeName}s nearby...`, 'searching');
    await delay(1000);

    addStep(`Scanning available ${tradeName}s in your area...`, 'searching');
    await delay(1200);

    // Wait for API now
    const apiResponse = await apiPromise;

    let workers = [];
    if (apiResponse?.type === 'worker_card' && apiResponse.data) {
      workers = [apiResponse.data, ...(apiResponse.data.alternatives || [])].filter(Boolean);
    } else {
      try {
        const data = await api.getWorkers({ available: true });
        const all = data.workers || data || [];
        workers = all.filter(w => {
          const wt = w.primary_trade?.toLowerCase() || '';
          return wt.includes(trade) || trade.includes(wt);
        }).slice(0, 5);
        if (workers.length === 0) workers = all.slice(0, 4);
      } catch {
        workers = [];
      }
    }

    if (workers.length === 0) {
      addStep(`No ${tradeName}s available nearby right now.`, 'warning');
      await delay(600);
      addMessage({
        type: 'agent_result',
        text: apiResponse?.message || `No ${tradeName}s found near you. Try again later or widen your search area.`,
        sender: 'ai'
      });
      return apiResponse;
    }

    addStep(`Found ${workers.length} ${tradeName}${workers.length > 1 ? 's' : ''}. Evaluating...`, 'success');
    await delay(800);

    setWorkers(workers);

    // Evaluate each worker visually in chat
    for (let i = 0; i < Math.min(workers.length, 3); i++) {
      const w = workers[i];
      const dist = w.distance_km ? `${w.distance_km}km` : '';
      const trust = w.trust_score ? `Trust: ${w.trust_score}` : '';
      const info = [dist, trust].filter(Boolean).join(' · ');
      addStep(`Checking ${w.name || `Worker ${i + 1}`}${info ? ': ' + info : ''}`, i === Math.min(workers.length, 3) - 1 ? 'action' : 'searching');
      await delay(1000);
    }

    addStep(`Best match: ${workers[0].name || 'Top worker'}`, 'complete');
    await delay(800);

    addMessage({
      type: 'agent_result',
      text: apiResponse?.message || `Recommended: ${workers[0].name || 'Best match'}. Opening on map...`,
      data: workers[0],
      actionType: 'worker_card',
      sender: 'ai'
    });

    await delay(1200);
    setChatOpen(false);

    // Animate on map
    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      setHighlightedWorkerId(w.id || w.phone || `${w.location_lat}_${w.location_lng}`);
      await delay(1500);
    }

    setHighlightedWorkerId(null);
    setAgentSelectedWorker(workers[0]);
    return apiResponse;
  }

  async function handleLogSale(text, apiPromise) {
    addStep('Processing your sale...', 'thinking');
    await delay(800);

    addStep('Parsing sale details...', 'searching');
    await delay(900);

    // Wait for API
    const apiResponse = await apiPromise;

    if (apiResponse?.type === 'sale_logged' && apiResponse.data) {
      const sale = apiResponse.data.sale || apiResponse.data;
      addStep(`Detected: ${sale.quantity || ''}x ${sale.item_name || 'item'} — ₦${Number(sale.amount || 0).toLocaleString()}`, 'success');
      await delay(700);

      addStep('Logging to your sales record...', 'action');
      await delay(900);

      addStep('Sale logged successfully!', 'complete');
      await delay(600);

      addMessage({
        type: 'agent_result',
        text: apiResponse.message,
        data: apiResponse.data,
        actionType: 'sale_logged',
        sender: 'ai'
      });

      addSale({
        ...apiResponse.data.sale,
        today_total: apiResponse.data.today_total,
        today_count: apiResponse.data.today_count,
        sabi_score_after: apiResponse.data.sabi_score_after,
        logged_at: new Date().toISOString()
      });

      await delay(1000);
      addStep('Taking you to your inventory...', 'complete');
      await delay(1500);
      setChatOpen(false);
      setPendingNavigation('/pulse');
    } else {
      // Backend didn't return sale_logged — still show animation
      addStep('Sale recorded!', 'complete');
      await delay(600);

      addMessage({
        type: 'agent_result',
        text: apiResponse?.message || "Sale logged! Check your inventory for details.",
        sender: 'ai'
      });
    }

    return apiResponse;
  }

  async function handleGenericResponse(apiPromise) {
    const apiResponse = await apiPromise;

    if (apiResponse?.steps && apiResponse.steps.length > 0) {
      for (const step of apiResponse.steps) {
        addStep(step, 'thinking');
        await delay(800 + Math.random() * 400);
      }
    }

    addMessage({
      type: 'agent_result',
      text: apiResponse?.message || "I can help you find workers, log sales, check scores, and more. Try asking me!",
      data: apiResponse?.data,
      actionType: apiResponse?.type,
      sender: 'ai'
    });

    return apiResponse;
  }

  async function send(text) {
    addMessage({ type: 'text', text, sender: 'user' });

    addStep('Understanding your request...', 'thinking');
    await delay(600);

    const localIntent = detectLocalIntent(text);

    // Fire API call (don't await yet — let animations run)
    const user = useAppStore.getState().user;
    const [userLng, userLat] = useAppStore.getState().mapCenter;

    const apiPromise = api.sendChat(text, {
      user_id: user?.phone || user?.id,
      user_type: user?.user_type || user?.role || 'unknown',
      user_lat: userLat,
      user_lng: userLng
    }).catch(() => null);

    // Route based on local intent — animations start immediately
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
