// pwa/src/stores/appStore.js
import { create } from 'zustand';

// Hydrate user from localStorage on init
function getPersistedUser() {
  try {
    const stored = localStorage.getItem('sabiwork_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

const useAppStore = create((set, get) => ({
  // User state (hydrated from localStorage)
  user: getPersistedUser(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('sabiwork_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sabiwork_user');
    }
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('sabiwork_user');
    set({ user: null });
  },

  // Workers on map
  workers: [],
  setWorkers: (workers) => set({ workers }),

  // Map state
  mapCenter: [3.3792, 6.5244], // Lagos [lng, lat]
  mapZoom: 12,
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
  activeLayer: 'workers', // 'workers' | 'demand' | 'gaps'
  setActiveLayer: (layer) => set({ activeLayer: layer }),

  // Chat state
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open, ...(open ? { unreadCount: 0 } : {}) }),
  messages: [],
  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, msg],
    unreadCount: s.chatOpen ? 0 : (s.unreadCount || 0) + (msg.sender === 'ai' ? 1 : 0)
  })),
  clearMessages: () => set({ messages: [] }),
  unreadCount: 0,

  // Active job tracking
  activeJob: null,
  setActiveJob: (job) => set({ activeJob: job }),

  // Agent highlighting (for animated marker evaluation)
  highlightedWorkerId: null,
  setHighlightedWorkerId: (id) => set({ highlightedWorkerId: id }),

  // Agent-selected worker (auto-opens WorkerSheet)
  agentSelectedWorker: null,
  setAgentSelectedWorker: (worker) => set({ agentSelectedWorker: worker }),

  // Loading states
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Trader sales log (recent sales logged this session)
  salesLog: [],
  addSale: (sale) => set((s) => ({ salesLog: [sale, ...s.salesLog] })),

  // Navigation trigger (for AI agent to push user to a tab)
  pendingNavigation: null,
  setPendingNavigation: (path) => set({ pendingNavigation: path }),
  clearPendingNavigation: () => set({ pendingNavigation: null })
}));

export default useAppStore;
