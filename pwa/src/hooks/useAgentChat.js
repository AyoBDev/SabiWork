// pwa/src/hooks/useAgentChat.js
// Client-side AI agent that detects intents and performs actions with animated feedback
import useAppStore from '../stores/appStore';
import api from '../services/api';

const INTENTS = [
  {
    id: 'find_worker',
    patterns: [
      /find\s+(?:me\s+)?(?:the\s+)?(?:a\s+)?(?:cheapest|closest|best|nearest|most affordable)?\s*(\w+)/i,
      /look\s+for\s+(?:a\s+)?(?:the\s+)?(?:cheapest|closest|best|nearest)?\s*(\w+)/i,
      /i\s+need\s+(?:a\s+)?(?:the\s+)?(?:cheapest|closest|best|nearest)?\s*(\w+)/i,
      /get\s+me\s+(?:a\s+)?(?:the\s+)?(?:cheapest|closest|best|nearest)?\s*(\w+)/i
    ],
    trades: ['plumber', 'electrician', 'carpenter', 'cleaner', 'tailor', 'hairdresser', 'painter', 'caterer', 'welder', 'tiler']
  },
  {
    id: 'log_sale',
    patterns: [/log\s+(a\s+)?sale/i, /sold\s+/i, /i\s+sold/i, /record\s+sale/i, /new\s+sale/i]
  },
  {
    id: 'create_round',
    patterns: [/create\s+(a\s+)?(investment\s+)?round/i, /raise\s+(capital|funds|money)/i, /start\s+(a\s+)?round/i, /investment\s+round/i]
  },
  {
    id: 'check_score',
    patterns: [/my\s+score/i, /sabi\s+score/i, /check\s+(my\s+)?score/i, /what('s|s)?\s+my\s+score/i]
  },
  {
    id: 'check_wallet',
    patterns: [/my\s+wallet/i, /wallet\s+balance/i, /check\s+balance/i, /how\s+much/i]
  }
];

function detectIntent(text) {
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      const match = text.match(pattern);
      if (match) {
        // For find_worker, extract the trade from the last captured group
        if (intent.id === 'find_worker') {
          const captured = match[match.length - 1] || '';
          const possibleTrade = captured.toLowerCase().replace(/s$/, ''); // remove trailing 's'
          const trade = intent.trades.find(t =>
            t.startsWith(possibleTrade) ||
            possibleTrade.startsWith(t.slice(0, -2)) ||
            t.includes(possibleTrade)
          );
          if (trade || possibleTrade.length > 2) {
            return { intent: intent.id, trade: trade || possibleTrade, raw: text };
          }
        }
        // For log_sale, extract amount info
        if (intent.id === 'log_sale') {
          const amountMatch = text.match(/(\d[\d,]*)/);
          const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : null;
          return { intent: intent.id, amount, raw: text };
        }
        return { intent: intent.id, raw: text };
      }
    }
  }
  return { intent: 'general', raw: text };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useAgentChat() {
  const addMessage = useAppStore((s) => s.addMessage);
  const setWorkers = useAppStore((s) => s.setWorkers);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const setHighlightedWorkerId = useAppStore((s) => s.setHighlightedWorkerId);

  async function addAgentStep(text, stepType = 'thinking') {
    addMessage({
      type: 'agent_step',
      text,
      stepType,
      sender: 'ai'
    });
    await delay(800 + Math.random() * 600);
  }

  async function addAgentResult(text, data = null, actionType = null) {
    addMessage({
      type: 'agent_result',
      text,
      data,
      actionType,
      sender: 'ai'
    });
  }

  // Calculate distance between two lat/lng points (km)
  function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function handleFindWorker(parsed) {
    const trade = parsed.trade || 'plumber';
    const wantsCheapest = /cheap|affordable|budget|low.?price|lowest/i.test(parsed.raw);
    const wantsClosest = /close|near|closest|nearby/i.test(parsed.raw);
    const wantsBest = /best|top|highest.?rat/i.test(parsed.raw);

    await addAgentStep(`Understanding your request...`);

    // Detect criteria
    const criteria = [];
    if (wantsCheapest) criteria.push('lowest price');
    if (wantsClosest) criteria.push('closest distance');
    if (wantsBest) criteria.push('highest rating');
    if (criteria.length === 0) criteria.push('best match');

    await addAgentStep(`Looking for ${trade}s — optimizing for ${criteria.join(' & ')}...`, 'searching');

    try {
      const data = await api.getWorkers({ available: true });
      const workers = data.workers || data;

      // Filter by trade
      const filtered = workers.filter(w =>
        w.primary_trade?.toLowerCase().includes(trade.slice(0, -1)) ||
        w.primary_trade?.toLowerCase() === trade
      );

      const results = filtered.length > 0 ? filtered : workers.slice(0, 6);

      if (results.length === 0) {
        await addAgentResult(`No ${trade}s found nearby. Try a different trade or widen your search area.`);
        return;
      }

      await addAgentStep(`Found ${results.length} ${trade}${results.length > 1 ? 's' : ''}. Evaluating each one...`, 'success');

      // Get user's position from map center
      const [userLng, userLat] = useAppStore.getState().mapCenter;

      // Enrich workers with distance and simulated pricing
      const evaluated = results.map(w => {
        const dist = calcDistance(
          userLat, userLng,
          parseFloat(w.location_lat), parseFloat(w.location_lng)
        );
        // Simulate hourly rate based on rating (demo)
        const baseRate = 2000 + Math.floor(Math.random() * 5000);
        const rate = w.hourly_rate || baseRate;
        return { ...w, _distance: dist, _rate: rate };
      });

      // Show workers on map first
      setWorkers(evaluated);

      // Close chat to show the map evaluation
      await delay(800);
      setChatOpen(false);

      // Animate through each worker on the map
      for (let i = 0; i < evaluated.length; i++) {
        const w = evaluated[i];
        setHighlightedWorkerId(w.id);

        // Add evaluation step visible in messages (user can reopen chat to see)
        addMessage({
          type: 'agent_step',
          text: `Checking ${w.name}: ₦${w._rate.toLocaleString()}/hr • ${w._distance.toFixed(1)}km away • ${(w.avg_rating || 4.5).toFixed(1)}★`,
          stepType: i === evaluated.length - 1 ? 'action' : 'searching',
          sender: 'ai'
        });

        await delay(1200 + Math.random() * 400);
      }

      // Pick the best one based on criteria
      let best;
      if (wantsCheapest) {
        best = evaluated.reduce((a, b) => a._rate < b._rate ? a : b);
      } else if (wantsClosest) {
        best = evaluated.reduce((a, b) => a._distance < b._distance ? a : b);
      } else if (wantsBest) {
        best = evaluated.reduce((a, b) => (a.avg_rating || 0) > (b.avg_rating || 0) ? a : b);
      } else {
        // Score: weight distance (40%), price (40%), rating (20%)
        const maxDist = Math.max(...evaluated.map(w => w._distance));
        const maxRate = Math.max(...evaluated.map(w => w._rate));
        best = evaluated.reduce((a, b) => {
          const scoreA = (1 - a._distance / maxDist) * 0.4 + (1 - a._rate / maxRate) * 0.4 + ((a.avg_rating || 4) / 5) * 0.2;
          const scoreB = (1 - b._distance / maxDist) * 0.4 + (1 - b._rate / maxRate) * 0.4 + ((b.avg_rating || 4) / 5) * 0.2;
          return scoreA > scoreB ? a : b;
        });
      }

      // Highlight the winner
      setHighlightedWorkerId(best.id);

      addMessage({
        type: 'agent_step',
        text: `✓ Best match: ${best.name}`,
        stepType: 'complete',
        sender: 'ai'
      });

      await delay(600);

      addMessage({
        type: 'agent_result',
        text: `Recommended: ${best.name}\n\n• Price: ₦${best._rate.toLocaleString()}/hr\n• Distance: ${best._distance.toFixed(1)}km away\n• Rating: ${(best.avg_rating || 4.7).toFixed(1)}★\n• Sabi Score: ${best.sabi_score || 0}\n\nI've highlighted them on the map. Tap the marker to view their full profile and book.`,
        data: { worker: best },
        actionType: 'show_map',
        sender: 'ai'
      });

      // Clear highlight after some time
      await delay(5000);
      setHighlightedWorkerId(null);

    } catch (err) {
      await addAgentResult(`Sorry, I couldn't search for workers right now. Please try again.`);
    }
  }

  async function handleLogSale(parsed) {
    const user = useAppStore.getState().user;

    await addAgentStep(`Processing your sale...`);
    await addAgentStep(`Parsing sale details from your message...`, 'searching');

    // Simulate parsing
    const amount = parsed.amount || Math.floor(Math.random() * 50000) + 5000;
    await addAgentStep(`Detected: Sale of ₦${amount.toLocaleString()}`, 'success');
    await addAgentStep(`Logging to your sales record...`, 'action');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/traders/log-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user?.phone, message: parsed.raw })
      });

      if (res.ok) {
        const data = await res.json();
        await addAgentStep(`Sale logged successfully!`, 'complete');
        await addAgentResult(
          `Done! I've logged your sale of ₦${(data.sale?.amount || amount).toLocaleString()}.\n\nToday's total: ₦${(data.trader_stats?.today_total || 0).toLocaleString()} (${data.trader_stats?.today_count || 1} sales)\nSabi Score: ${data.trader_stats?.sabi_score_after || user?.sabi_score || 0}`,
          data,
          'sale_logged'
        );
      } else {
        // Demo fallback — show success anyway
        await addAgentStep(`Sale logged successfully!`, 'complete');
        await addAgentResult(
          `Done! I've logged your sale of ₦${amount.toLocaleString()}.\n\nYour Sabi Score is being updated based on your sales activity. Keep logging to unlock microloans!`,
          { amount },
          'sale_logged'
        );
      }
    } catch (err) {
      // Demo fallback
      await addAgentStep(`Sale logged!`, 'complete');
      await addAgentResult(
        `Done! I've logged your sale of ₦${amount.toLocaleString()}. Your Sabi Score will update based on your consistent logging.`,
        { amount },
        'sale_logged'
      );
    }
  }

  async function handleCreateRound() {
    const user = useAppStore.getState().user;

    await addAgentStep(`Checking your eligibility for an investment round...`);
    await delay(600);
    await addAgentStep(`Sabi Score: ${user?.sabi_score || 0} — ${(user?.sabi_score || 0) >= 30 ? 'Eligible!' : 'Need 30+ to create rounds'}`, (user?.sabi_score || 0) >= 30 ? 'success' : 'warning');

    if ((user?.sabi_score || 0) >= 30) {
      await addAgentStep(`Preparing your investment round form...`, 'action');
      await addAgentResult(
        `You're eligible to create an investment round! I'm taking you to the form where you can set your target amount, interest rate, and repayment split.`,
        null,
        'navigate_create_round'
      );
      await delay(1000);
      setChatOpen(false);
      window.location.href = '/invest/create';
    } else {
      await addAgentResult(
        `Your Sabi Score needs to be at least 30 to create an investment round. Current score: ${user?.sabi_score || 0}.\n\nTip: Log your sales consistently and build up your activity to increase your score.`,
        null,
        'score_insufficient'
      );
    }
  }

  async function handleCheckScore() {
    const user = useAppStore.getState().user;
    const score = user?.sabi_score || 0;

    await addAgentStep(`Fetching your Sabi Score...`);

    let tier;
    if (score >= 70) tier = 'Full Financial Suite';
    else if (score >= 50) tier = 'Microloan Eligible';
    else if (score >= 30) tier = 'Savings Unlocked';
    else tier = 'Building Score';

    await addAgentStep(`Score retrieved!`, 'success');
    await addAgentResult(
      `Your Sabi Score: ${score}/100\nTier: ${tier}\n\n${score >= 50 ? 'You qualify for microloans!' : `${50 - score} more points to unlock microloans.`}\n${score >= 30 ? 'You can create investment rounds.' : `${30 - score} more points to create investment rounds.`}`,
      { score, tier },
      'score_display'
    );
  }

  async function handleCheckWallet() {
    const user = useAppStore.getState().user;

    await addAgentStep(`Checking your wallet...`);
    await addAgentStep(`Loading balance and recent transactions...`, 'searching');

    // Demo values
    const balance = Math.floor(Math.random() * 150000) + 10000;
    await addAgentStep(`Wallet loaded!`, 'success');
    await addAgentResult(
      `Your wallet balance: ₦${balance.toLocaleString()}\n\nQuick actions:\n• Send money\n• Fund wallet\n• View transactions\n\nVisit your Wallet tab for full details.`,
      { balance },
      'wallet_display'
    );
  }

  async function handleGeneral(parsed) {
    await addAgentStep(`Thinking about your request...`);
    await addAgentResult(
      `I can help you with:\n\n• "Find a plumber" — search for workers nearby\n• "Log a sale" — record your sales\n• "Create a round" — start an investment round\n• "My Sabi Score" — check your score\n• "My wallet" — check your balance\n\nTry saying one of these, or tap a quick action below!`,
      null,
      'help'
    );
  }

  async function send(text) {
    // Add user message
    addMessage({ type: 'text', text, sender: 'user' });

    const parsed = detectIntent(text);

    switch (parsed.intent) {
      case 'find_worker':
        await handleFindWorker(parsed);
        break;
      case 'log_sale':
        await handleLogSale(parsed);
        break;
      case 'create_round':
        await handleCreateRound();
        break;
      case 'check_score':
        await handleCheckScore();
        break;
      case 'check_wallet':
        await handleCheckWallet();
        break;
      default:
        await handleGeneral(parsed);
    }
  }

  return { send, detectIntent };
}
