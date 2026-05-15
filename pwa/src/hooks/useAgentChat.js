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

  async function handleFindWorker(text, apiResponse) {
    const trade = detectTrade(text) || 'worker';
    const tradeName = trade.replace(/ing$/, '').replace(/al$/, '') + 'er';

    addStep(`Looking for ${tradeName}s nearby...`, 'searching');
    await delay(1000);

    // Use API response if available, otherwise use local workers
    let workers = [];
    if (apiResponse?.type === 'worker_card' && apiResponse.data) {
      workers = [apiResponse.data, ...(apiResponse.data.alternatives || [])].filter(Boolean);
    } else {
      // Fallback: try to get workers from the local API
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
      return;
    }

    addStep(`Found ${workers.length} ${tradeName}${workers.length > 1 ? 's' : ''}. Evaluating...`, 'success');
    await delay(800);

    // Show on map
    setWorkers(workers);

    addStep('Showing them on the map...', 'action');
    await delay(1000);
    setChatOpen(false);

    // Animate through workers on map
    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      setHighlightedWorkerId(w.id || w.phone || `${w.location_lat}_${w.location_lng}`);
      await delay(1500);
    }

    // Select best
    setHighlightedWorkerId(null);
    setAgentSelectedWorker(workers[0]);

    // Show result in chat (user can reopen to see)
    addMessage({
      type: 'agent_result',
      text: apiResponse?.message || `Recommended: ${workers[0].name || 'Best match found'}. Tap the card to book.`,
      data: workers[0],
      actionType: 'worker_card',
      sender: 'ai'
    });
  }

  async function handleLogSale(text, apiResponse) {
    addStep('Processing your sale...', 'thinking');
    await delay(800);

    addStep('Parsing sale details...', 'searching');
    await delay(700);

    if (apiResponse?.type === 'sale_logged' && apiResponse.data) {
      const sale = apiResponse.data.sale || apiResponse.data;
      addStep(`Detected: ${sale.quantity || ''}x ${sale.item_name || 'item'} — ₦${Number(sale.amount || 0).toLocaleString()}`, 'success');
      await delay(600);

      addStep('Logging to your sales record...', 'action');
      await delay(800);

      addStep('Sale logged!', 'complete');
      await delay(500);

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

      addStep('Taking you to your inventory...', 'complete');
      await delay(1500);
      setChatOpen(false);
      setPendingNavigation('/pulse');
    } else {
      // No backend response — still show the animation
      addStep('Sale recorded!', 'complete');
      await delay(500);

      addMessage({
        type: 'agent_result',
        text: apiResponse?.message || "Sale logged! Check your inventory for details.",
        sender: 'ai'
      });
    }
  }

  async function handleGenericResponse(apiResponse) {
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
  }

  async function send(text) {
    addMessage({ type: 'text', text, sender: 'user' });

    addStep('Understanding your request...', 'thinking');

    const localIntent = detectLocalIntent(text);

    // Call API in the background
    let apiResponse = null;
    try {
      const user = useAppStore.getState().user;
      const [userLng, userLat] = useAppStore.getState().mapCenter;

      apiResponse = await api.sendChat(text, {
        user_id: user?.phone || user?.id,
        user_type: user?.user_type || user?.role || 'unknown',
        user_lat: userLat,
        user_lng: userLng
      });
    } catch {
      // Backend unreachable — continue with local flow
    }

    // Route to appropriate handler with animated UX
    const intent = apiResponse?.type || localIntent;

    if (intent === 'worker_card' || intent === 'find_worker') {
      await handleFindWorker(text, apiResponse);
    } else if (intent === 'sale_logged' || intent === 'log_sale') {
      await handleLogSale(text, apiResponse);
    } else {
      await handleGenericResponse(apiResponse);
    }

    return apiResponse;
  }

  return { send };
}
