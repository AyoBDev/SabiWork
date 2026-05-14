// pwa/src/hooks/useAgentChat.js
import useAppStore from '../stores/appStore';
import api from '../services/api';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useAgentChat() {
  const addMessage = useAppStore((s) => s.addMessage);
  const setWorkers = useAppStore((s) => s.setWorkers);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const setHighlightedWorkerId = useAppStore((s) => s.setHighlightedWorkerId);
  const setAgentSelectedWorker = useAppStore((s) => s.setAgentSelectedWorker);
  const addSale = useAppStore((s) => s.addSale);
  const setPendingNavigation = useAppStore((s) => s.setPendingNavigation);

  async function animateSteps(steps) {
    for (const step of steps) {
      addMessage({ type: 'agent_step', text: step, stepType: 'thinking', sender: 'ai' });
      await delay(800 + Math.random() * 400);
    }
  }

  async function handleWorkerCard(data) {
    if (!data) return;
    const workers = [data, ...(data.alternatives || [])].filter(Boolean);
    setWorkers(workers);
    await delay(600);
    setChatOpen(false);

    // Animate through workers
    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      setHighlightedWorkerId(w.id || w.phone);
      addMessage({
        type: 'agent_step',
        text: `Evaluating ${w.name || `Worker ${i + 1}`}: ${w.distance_km ? w.distance_km + 'km' : ''} ${w.trust_score ? '• Trust: ' + w.trust_score : ''}`,
        stepType: i === workers.length - 1 ? 'action' : 'searching',
        sender: 'ai'
      });
      await delay(1200);
    }

    // Select best (first one)
    setHighlightedWorkerId(null);
    setAgentSelectedWorker(data);
  }

  async function send(text) {
    addMessage({ type: 'text', text, sender: 'user' });

    // Show typing indicator
    addMessage({ type: 'agent_step', text: 'Thinking...', stepType: 'thinking', sender: 'ai' });

    try {
      const user = useAppStore.getState().user;
      const [userLng, userLat] = useAppStore.getState().mapCenter;

      const response = await api.sendChat(text, {
        user_id: user?.phone || user?.id,
        user_type: user?.user_type || 'unknown',
        user_lat: userLat,
        user_lng: userLng
      });

      // Animate steps if provided
      if (response.steps && response.steps.length > 0) {
        await animateSteps(response.steps);
      }

      // Handle worker_card type with map animation
      if (response.type === 'worker_card' && response.data) {
        await handleWorkerCard(response.data);
      }

      // Handle sale_logged — push sale to store and navigate to inventory
      if (response.type === 'sale_logged' && response.data) {
        addSale({
          ...response.data.sale,
          today_total: response.data.today_total,
          today_count: response.data.today_count,
          sabi_score_after: response.data.sabi_score_after,
          logged_at: new Date().toISOString()
        });
        setPendingNavigation('/pulse');
      }

      // Show final message
      addMessage({
        type: 'agent_result',
        text: response.message,
        data: response.data,
        actionType: response.type,
        sender: 'ai'
      });

      return response;
    } catch (err) {
      addMessage({
        type: 'agent_result',
        text: "Something went wrong. Please try again.",
        sender: 'ai'
      });
      return null;
    }
  }

  return { send };
}
